const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const isDev = !app.isPackaged;

let mainWindow;
let workerWindow;

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
    },
    autoHideMenuBar: true,
    backgroundColor: '#0f172a',
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Create a hidden worker window for printing
  workerWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (workerWindow) workerWindow.close();
  });
}

// --- Thermal Printer Bridge ---
ipcMain.handle('get-printers', async () => {
  if (!mainWindow) return [];
  return await mainWindow.webContents.getPrintersAsync();
});

ipcMain.handle('print-receipt', async (event, options = {}) => {
  if (!mainWindow) return { success: false, error: 'No active window' };
  try {
    const printers = await mainWindow.webContents.getPrintersAsync();
    let targetPrinter = options.printerName;
    if (!targetPrinter) {
      const thermalPrinter = printers.find(p => 
        p.name.toLowerCase().includes('thermal') || 
        p.name.toLowerCase().includes('pos') ||
        p.name.toLowerCase().includes('58mm') ||
        p.name.toLowerCase().includes('80mm')
      );
      targetPrinter = thermalPrinter?.name;
    }

    await mainWindow.webContents.print({
      silent: true,
      printBackground: true,
      deviceName: targetPrinter,
      margins: { marginType: 'none' },
      pageSize: options.pageSize || { width: 58000, height: 297000 },
      ...options
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('print-receipt-html', async (event, html, options = {}) => {
  if (!workerWindow) return { success: false, error: 'Worker window not ready' };

  try {
    const paperSize = options.paperSize || '80mm';
    const width = paperSize === '58mm' ? '58mm' : '80mm';
    
    // Wrap HTML with necessary styles for receipt printing
    const styledHtml = `
      <html>
        <head>
          <style>
            @page {
              size: ${width} auto;
              margin: 0;
            }
            body {
              width: ${width};
              margin: 0;
              padding: 0;
              font-family: 'Courier New', Courier, monospace;
              color: black;
              background-color: white;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            img { max-width: 100%; }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;

    await workerWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(styledHtml)}`);
    
    await workerWindow.webContents.print({
      silent: true,
      printBackground: true,
      deviceName: options.printerName || undefined,
      margins: { marginType: 'none' },
      pageSize: options.pageSize || { 
        width: paperSize === '58mm' ? 58000 : 80000, 
        height: 297000 
      }
    });

    return { success: true };
  } catch (err) {
    console.error('Print HTML Error:', err);
    return { success: false, error: err.message };
  }
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
