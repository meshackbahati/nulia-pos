const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const isDev = !app.isPackaged;

let mainWindow;

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
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// --- Thermal Printer Bridge ---
// Handle silent printing requests from the UI
ipcMain.handle('print-receipt', async (event, options = {}) => {
  if (!mainWindow) return { success: false, error: 'No active window' };

  try {
    // List available printers for debugging or selection
    const printers = await mainWindow.webContents.getPrintersAsync();
    
    // We can filter for 'Thermal' or a specific name if provided in settings
    const targetPrinter = options.printerName || printers.find(p => p.name.toLowerCase().includes('thermal'))?.name;

    await mainWindow.webContents.print({
      silent: true, // Bypass dialog
      printBackground: true,
      deviceName: targetPrinter,
      margins: { marginType: 'none' }, // Critical for 58mm/80mm rolls
      pageSize: { width: 58000, height: 200000 }, // Standard 58mm roll (height is large to allow auto-cut)
      ...options
    });

    return { success: true };
  } catch (err) {
    console.error('Electron Print Error:', err);
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
