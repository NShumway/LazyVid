const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectVideo: () => ipcRenderer.invoke('select-video'),
  exportVideo: (inputPath, outputPath) => ipcRenderer.invoke('export-video', inputPath, outputPath),
  exportTimeline: (clips, outputPath) => ipcRenderer.invoke('export-timeline', clips, outputPath),
  saveDialog: (defaultName) => ipcRenderer.invoke('save-dialog', defaultName),
  onExportProgress: (callback) => ipcRenderer.on('export-progress', (event, percent) => callback(percent))
});
