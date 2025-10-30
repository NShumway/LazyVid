const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectVideo: () => ipcRenderer.invoke('select-video'),
  exportVideo: (inputPath, outputPath) => ipcRenderer.invoke('export-video', inputPath, outputPath),
  exportTimeline: (clips, outputPath, resolution) => ipcRenderer.invoke('export-timeline', clips, outputPath, resolution),
  saveDialog: (defaultName) => ipcRenderer.invoke('save-dialog', defaultName),
  getFileStats: (filePath) => ipcRenderer.invoke('get-file-stats', filePath),
  onExportProgress: (callback) => ipcRenderer.on('export-progress', (event, percent) => callback(percent)),
  getScreenSources: (options) => ipcRenderer.invoke('get-screen-sources', options),
  setSelectedSource: (sourceId) => ipcRenderer.send('set-selected-source', sourceId),
  saveRecording: (buffer, fileName) => ipcRenderer.invoke('save-recording', buffer, fileName),
  showRecordingOverlay: () => ipcRenderer.send('show-recording-overlay'),
  hideRecordingOverlay: () => ipcRenderer.send('hide-recording-overlay'),
  updateRecordingTime: (timeString) => ipcRenderer.send('update-recording-time', timeString),
  setWebcamStream: (streamId) => ipcRenderer.send('set-webcam-stream', streamId),
  onRecordingTimeUpdate: (callback) => ipcRenderer.on('recording-time-update', (event, timeString) => callback(timeString)),
  stopRecording: () => ipcRenderer.send('stop-recording'),
  onStopRecordingRequested: (callback) => ipcRenderer.on('stop-recording-requested', callback)
});
