const { contextBridge, ipcRenderer } = require('electron');

// We use contextBridge to safely expose specific electron features 
// without giving the frontend full access to Node.js
contextBridge.exposeInMainWorld('electronAPI', {
  printReceipt: (options) => ipcRenderer.invoke('print-receipt', options),
  printReceiptHTML: (html, options) => ipcRenderer.invoke('print-receipt-html', html, options),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  // Flag for fast path detection — renderer can branch without awaiting getPrinters
  isElectron: true,
});
