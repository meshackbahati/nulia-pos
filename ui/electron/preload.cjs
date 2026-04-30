const { contextBridge, ipcRenderer } = require('electron');

// We use contextBridge to safely expose specific electron features 
// without giving the frontend full access to Node.js
contextBridge.exposeInMainWorld('electronAPI', {
  printReceipt: (options) => ipcRenderer.invoke('print-receipt', options),
  getPrinters: () => ipcRenderer.invoke('get-printers')
});
