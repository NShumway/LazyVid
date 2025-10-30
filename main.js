const { app, BrowserWindow, ipcMain, dialog, desktopCapturer } = require('electron');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

ffmpeg.setFfmpegPath(ffmpegPath);

let mainWindow;
let recordingOverlay = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      // Required for screen capture in Electron 28+
      webSecurity: true
    }
  });

  // Enable screen capture permissions - allow all media requests
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'display-capture', 'mediaKeySystem'];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  // Handle display media requests (for screen capture)
  // This handler is called when renderer uses getDisplayMedia()
  let selectedSourceId = null;

  mainWindow.webContents.session.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
      if (sources.length === 0) {
        return callback({});
      }

      // If we have a pre-selected source from IPC, use it
      // Otherwise use the first screen
      let sourceToUse = sources[0];
      if (selectedSourceId) {
        const found = sources.find(s => s.id === selectedSourceId);
        if (found) sourceToUse = found;
        selectedSourceId = null; // Reset after use
      }

      callback({ video: sourceToUse, audio: 'loopback' });
    }).catch((err) => {
      console.error('Failed to get sources:', err);
      callback({});
    });
  });

  // Store selected source ID from renderer
  ipcMain.on('set-selected-source', (event, sourceId) => {
    selectedSourceId = sourceId;
  });

  // Create recording overlay window
  ipcMain.on('show-recording-overlay', () => {
    if (recordingOverlay) return;

    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    recordingOverlay = new BrowserWindow({
      width: 340,
      height: 250,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      }
    });

    // Position in top-right corner
    recordingOverlay.setPosition(screenWidth - 360, 20);
    recordingOverlay.setIgnoreMouseEvents(false);

    // NOTE: We WANT this window to be captured in the screen recording
    // So we do NOT use setContentProtection(true)

    recordingOverlay.loadFile('recording-overlay.html');

    // Once loaded, start the webcam
    recordingOverlay.webContents.on('did-finish-load', () => {
      recordingOverlay.webContents.executeJavaScript(`
        navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 360 } }, audio: false })
          .then(stream => {
            const webcam = document.getElementById('webcam');
            webcam.srcObject = stream;
          })
          .catch(err => console.log('Webcam not available:', err));
      `);
    });
  });

  // Hide recording overlay
  ipcMain.on('hide-recording-overlay', () => {
    if (recordingOverlay) {
      recordingOverlay.close();
      recordingOverlay = null;
    }
  });

  // Update recording time in overlay
  ipcMain.on('update-recording-time', (event, timeString) => {
    if (recordingOverlay && !recordingOverlay.isDestroyed()) {
      recordingOverlay.webContents.send('recording-time-update', timeString);
    }
  });

  // Stop recording from overlay window
  ipcMain.on('stop-recording', () => {
    // Forward to main window
    mainWindow.webContents.send('stop-recording-requested');
  });

  // Enable permission checking for getUserMedia with chromeMediaSource
  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    return true;
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

ipcMain.handle('get-file-stats', async (event, filePath) => {
  try {
    const stats = fs.statSync(filePath);
    return { size: stats.size };
  } catch (err) {
    throw new Error(`Failed to get file stats: ${err.message}`);
  }
});

ipcMain.handle('get-screen-sources', async (event, options) => {
  try {
    const sources = await desktopCapturer.getSources(options);
    return sources;
  } catch (err) {
    throw new Error(`Failed to get screen sources: ${err.message}`);
  }
});

ipcMain.handle('save-recording', async (event, buffer, fileName) => {
  const os = require('os');
  const tempDir = os.tmpdir();
  const filePath = path.join(tempDir, fileName);

  try {
    fs.writeFileSync(filePath, Buffer.from(buffer));
    return filePath;
  } catch (err) {
    throw new Error(`Failed to save recording: ${err.message}`);
  }
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
