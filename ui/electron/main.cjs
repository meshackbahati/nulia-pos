const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const isDev = !app.isPackaged;

let mainWindow;
let workerWindow;
let workerReady = false;
let printQueue = Promise.resolve();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "RetailPro",
    icon: path.join(__dirname, '../public/logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      backgroundThrottling: false,
    },
    autoHideMenuBar: true,
    backgroundColor: '#0f172a',
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Create a hidden worker window for printing — warm & throttling-free
  workerWindow = new BrowserWindow({
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
      offscreen: false,
    }
  });

  // Pre-warm renderer so first receipt does not pay cold-start cost
  workerWindow.loadURL('about:blank').then(() => {
    workerReady = true;
  }).catch(() => {
    workerReady = false;
  });
  // Electron 30+ helper — ensure hidden window never throttles
  try {
    if (workerWindow.webContents.setBackgroundThrottling) {
      workerWindow.webContents.setBackgroundThrottling(false);
    }
  } catch {}

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (workerWindow && !workerWindow.isDestroyed()) workerWindow.close();
    workerWindow = null;
    workerReady = false;
  });
}

// --- Thermal Printer Bridge ---
// Cached printer list — avoids hammering OS on rapid re-prints
let _printerCache = { list: [], ts: 0 };
async function getPrintersCached(maxAgeMs = 5000) {
  const now = Date.now();
  if (now - _printerCache.ts < maxAgeMs && _printerCache.list.length) return _printerCache.list;
  const list = mainWindow ? await mainWindow.webContents.getPrintersAsync() : [];
  _printerCache = { list, ts: now };
  return list;
}

function pickThermal(printers) {
  return printers.find(p => {
    const n = (p.name || '').toLowerCase();
    return n.includes('thermal') || n.includes('pos') || n.includes('58mm') || n.includes('80mm') || n.includes('receipt') || n.includes('xprinter') || n.includes('epson') || n.includes('bixolon') || n.includes('star');
  });
}

function resolveTargetPrinter(printers, requested) {
  if (requested) {
    const exact = printers.find(p => p.name === requested);
    if (exact) return exact.name;
    // Case-insensitive fallback
    const ci = printers.find(p => p.name.toLowerCase() === requested.toLowerCase());
    if (ci) return ci.name;
    console.warn(`[Print] Requested "${requested}" not found — falling back`);
  }
  const thermal = pickThermal(printers);
  return thermal ? thermal.name : undefined; // undefined → OS default (fast, no 60s CUPS lookup)
}

ipcMain.handle('get-printers', async () => {
  if (!mainWindow) return [];
  try {
    return await getPrintersCached(0); // force fresh on explicit request
  } catch {
    return [];
  }
});

ipcMain.handle('print-receipt', async (event, options = {}) => {
  if (!mainWindow) return { success: false, error: 'No active window' };
  try {
    const printers = await getPrintersCached();
    const targetPrinter = resolveTargetPrinter(printers, options.printerName);
    await mainWindow.webContents.print({
      silent: true,
      printBackground: true,
      deviceName: targetPrinter,
      margins: { marginType: 'none' },
      pageSize: options.pageSize || { width: 58000, height: 297000 },
      ...options
    });
    return { success: true, printer: targetPrinter || 'system-default' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('print-receipt-html', async (event, html, options = {}) => {
  if (!workerWindow || workerWindow.isDestroyed()) return { success: false, error: 'Worker window not ready' };

  // Queue prints — prevents race where two loadURL/executeJS overlap and stall for 10s
  const job = async () => {
    const startTime = Date.now();
    const requested = options.printerName;
    console.log(`[Print] Job start requested="${requested || 'auto'}" paper=${options.paperSize || '80mm'}`);

    try {
      // 1) Resolve printer FAST — validate exists in <500ms, do NOT let OS spooler timeout 60s on bogus name
      const printers = await getPrintersCached();
      const targetPrinter = resolveTargetPrinter(printers, requested);
      if (requested && targetPrinter !== requested) {
        console.log(`[Print] Resolved "${requested}" → "${targetPrinter || 'default'}"`);
      }

      const paperSize = options.paperSize || '80mm';
      const width = paperSize === '58mm' ? '58mm' : '80mm';

      const styledHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
            @page { size: ${width} auto; margin: 0; }
            body { width: ${width}; margin: 0; padding: 0; font-family: 'Courier New', Courier, monospace; color: #000; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
          </style></head><body>${html}</body></html>`;

      // 2) Ensure worker is warm — don't pay cold-start on first receipt
      if (!workerReady || workerWindow.webContents.getURL() === 'about:blank') {
        try {
          await workerWindow.loadURL('about:blank');
          workerReady = true;
        } catch {}
      }

      // 3) Inject HTML WITHOUT navigating (instant ~10-30ms vs 200-500ms data: navigation)
      // document.write+close forces layout synchronously; we yield one frame for paint.
      const payload = JSON.stringify(styledHtml);
      await workerWindow.webContents.executeJavaScript(`
        (function() {
          try {
            document.open();
            document.write(${payload});
            document.close();
            // force layout
            void document.body.offsetHeight;
            return true;
          } catch(e) { return String(e); }
        })()
      `, true);

      // Tiny yield so Chromium paints before print (16-40ms — one to two frames). Far faster than did-finish-load.
      await new Promise(r => setTimeout(r, 40));

      if (workerWindow.isDestroyed()) throw new Error('Worker destroyed before print');

      console.log(`[Print] Injected in ${Date.now() - startTime}ms — spooling to "${targetPrinter || 'default'}"...`);

      // 4) Print with Promise API + hard 7s cap — never hang 60s. Use race so OS can't stall.
      const printPromise = workerWindow.webContents.print({
        silent: true,
        printBackground: true,
        deviceName: targetPrinter || undefined,
        margins: { marginType: 'none' },
        pageSize: {
          width: paperSize === '58mm' ? 58000 : 80000,
          height: 297000
        }
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Print spool timeout (7s) — check printer connection')), 7000)
      );

      await Promise.race([printPromise, timeoutPromise]);

      console.log(`[Print] ✓ success in ${Date.now() - startTime}ms`);
      return { success: true, printer: targetPrinter || 'default' };
    } catch (err) {
      console.error(`[Print] ✗ failed in ${Date.now() - startTime}ms:`, err.message);
      return { success: false, error: err.message };
    }
  };

  // Chain onto queue and return this job's result
  const resultPromise = printQueue.then(job, job);
  // Keep queue from breaking on rejection
  printQueue = resultPromise.then(() => {}, () => {});
  return resultPromise;
});

// App Lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
