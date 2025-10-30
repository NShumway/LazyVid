const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

ffmpeg.setFfmpegPath(ffmpegPath);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');
  // mainWindow.webContents.openDevTools();
}

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

ipcMain.handle('select-video', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Videos', extensions: ['mp4', 'mov', 'webm'] }
    ]
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('export-video', async (event, inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .output(outputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .on('end', () => resolve({ success: true }))
      .on('error', (err) => reject({ success: false, error: err.message }))
      .on('progress', (progress) => {
        mainWindow.webContents.send('export-progress', progress.percent || 0);
      })
      .run();
  });
});

ipcMain.handle('save-dialog', async (event, defaultName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [
      { name: 'MP4 Video', extensions: ['mp4'] }
    ]
  });
  
  if (!result.canceled) {
    return result.filePath;
  }
  return null;
});

ipcMain.handle('export-timeline', async (event, clips, outputPath) => {
  return new Promise((resolve, reject) => {
    if (clips.length === 0) {
      reject({ success: false, error: 'No clips to export' });
      return;
    }

    if (clips.length === 1) {
      const clip = clips[0];
      const trimDuration = (clip.trimEnd || clip.duration) - (clip.trimStart || 0);
      
      ffmpeg(clip.path)
        .setStartTime(clip.trimStart || 0)
        .setDuration(trimDuration)
        .output(outputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .on('end', () => resolve({ success: true }))
        .on('error', (err) => reject({ success: false, error: err.message }))
        .on('progress', (progress) => {
          mainWindow.webContents.send('export-progress', progress.percent || 0);
        })
        .run();
    } else {
      const fs = require('fs');
      const os = require('os');
      const tempDir = os.tmpdir();
      const listFile = path.join(tempDir, 'lazyvid-concat-list.txt');
      
      const fileList = clips.map((clip, idx) => {
        return `file '${clip.path.replace(/\\/g, '/')}'\ninpoint ${clip.trimStart || 0}\noutpoint ${clip.trimEnd || clip.duration}`;
      }).join('\n');
      
      fs.writeFileSync(listFile, fileList);
      
      ffmpeg()
        .input(listFile)
        .inputOptions(['-f concat', '-safe 0'])
        .output(outputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .on('end', () => {
          fs.unlinkSync(listFile);
          resolve({ success: true });
        })
        .on('error', (err) => {
          if (fs.existsSync(listFile)) fs.unlinkSync(listFile);
          reject({ success: false, error: err.message });
        })
        .on('progress', (progress) => {
          mainWindow.webContents.send('export-progress', progress.percent || 0);
        })
        .run();
    }
  });
});
