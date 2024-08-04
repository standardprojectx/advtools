const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  convertFiles: (files, conversionType) => ipcRenderer.invoke('convert-files', files, conversionType),
  onProgress: (callback) => ipcRenderer.on('conversion-progress', (event, progress) => callback(progress)),
});
