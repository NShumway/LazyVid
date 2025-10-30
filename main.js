const { app, BrowserWindow, ipcMain, dialog, desktopCapturer } = require('electron');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
let ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

// Fix path for asar unpacked files
// If the path points inside app.asar, replace with app.asar.unpacked
if (ffmpegPath.includes('app.asar')) {
  ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked');
}

console.log('[Main] FFmpeg path:', ffmpegPath);
console.log('[Main] FFmpeg exists:', fs.existsSync(ffmpegPath));
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

ipcMain.handle('export-timeline', async (event, clips, outputPath, resolution = 'source') => {
  return new Promise((resolve, reject) => {
    if (clips.length === 0) {
      reject({ success: false, error: 'No clips to export' });
      return;
    }

    console.log('[export-timeline] Resolution mode:', resolution);
    console.log('[export-timeline] Clips:', clips.map(c => ({ path: c.path, resolution: c.resolution })));

    // Determine target resolution
    let targetWidth, targetHeight;
    if (resolution === '1080p') {
      targetWidth = 1920;
      targetHeight = 1080;
    } else if (resolution === '720p') {
      targetWidth = 1280;
      targetHeight = 720;
    } else {
      // Source resolution - find the largest resolution among clips
      targetWidth = Math.max(...clips.map(c => c.resolution?.width || 1920));
      targetHeight = Math.max(...clips.map(c => c.resolution?.height || 1080));
    }

    console.log('[export-timeline] Target resolution:', targetWidth, 'x', targetHeight);

    // Build scale and pad filter for letterboxing/pillarboxing
    const scaleFilter = `scale=w=${targetWidth}:h=${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:black`;

    if (clips.length === 1) {
      const clip = clips[0];
      const trimDuration = (clip.trimEnd || clip.duration) - (clip.trimStart || 0);

      let command = ffmpeg(clip.path)
        .setStartTime(clip.trimStart || 0)
        .setDuration(trimDuration)
        .output(outputPath)
        .videoCodec('libx264')
        .audioCodec('aac');

      // Apply scaling/letterboxing only when needed
      // For non-source resolutions (720p/1080p), always scale
      // For source resolution, only scale if clip resolution differs from target
      const needsScaling = resolution !== 'source' ||
        (clip.resolution && (clip.resolution.width !== targetWidth || clip.resolution.height !== targetHeight));

      console.log('[export-timeline] Single clip - needsScaling:', needsScaling, 'clip resolution:', clip.resolution);

      if (needsScaling) {
        command = command.videoFilters(scaleFilter);
      }

      command
        .on('end', () => {
          console.log('[export-timeline] Single clip export completed successfully');
          resolve({ success: true });
        })
        .on('error', (err) => {
          console.error('[export-timeline] Single clip export error:', err);
          console.error('[export-timeline] Error message:', err.message);
          console.error('[export-timeline] Error stack:', err.stack);
          reject({ success: false, error: err.message });
        })
        .on('progress', (progress) => {
          mainWindow.webContents.send('export-progress', progress.percent || 0);
        })
        .run();
    } else {
      const fs = require('fs');
      const os = require('os');
      const tempDir = os.tmpdir();

      // For multi-clip with scaling, we need to pre-process each clip
      if (resolution !== 'source') {
        const processedClips = [];
        let processedCount = 0;

        const processClip = (clip, index) => {
          return new Promise((resolveClip, rejectClip) => {
            const tempFile = path.join(tempDir, `lazyvid-processed-${index}-${Date.now()}.mp4`);
            const trimDuration = (clip.trimEnd || clip.duration) - (clip.trimStart || 0);

            ffmpeg(clip.path)
              .setStartTime(clip.trimStart || 0)
              .setDuration(trimDuration)
              .videoFilters(scaleFilter)
              .videoCodec('libx264')
              .audioCodec('aac')
              .output(tempFile)
              .on('end', () => {
                processedClips.push({ path: tempFile, trimStart: 0, trimEnd: trimDuration });
                processedCount++;
                mainWindow.webContents.send('export-progress', (processedCount / clips.length) * 50); // First 50% for processing
                resolveClip();
              })
              .on('error', rejectClip)
              .run();
          });
        };

        Promise.all(clips.map((clip, idx) => processClip(clip, idx)))
          .then(() => {
            // Concatenate processed clips
            const listFile = path.join(tempDir, 'lazyvid-concat-list.txt');
            const fileList = processedClips.map((clip) => {
              return `file '${clip.path.replace(/\\/g, '/')}'`;
            }).join('\n');

            fs.writeFileSync(listFile, fileList);

            ffmpeg()
              .input(listFile)
              .inputOptions(['-f concat', '-safe 0'])
              .output(outputPath)
              .videoCodec('libx264')
              .audioCodec('aac')
              .on('end', () => {
                // Cleanup
                fs.unlinkSync(listFile);
                processedClips.forEach(pc => {
                  if (fs.existsSync(pc.path)) fs.unlinkSync(pc.path);
                });
                resolve({ success: true });
              })
              .on('error', (err) => {
                // Cleanup on error
                if (fs.existsSync(listFile)) fs.unlinkSync(listFile);
                processedClips.forEach(pc => {
                  if (fs.existsSync(pc.path)) fs.unlinkSync(pc.path);
                });
                reject({ success: false, error: err.message });
              })
              .on('progress', (progress) => {
                mainWindow.webContents.send('export-progress', 50 + (progress.percent || 0) / 2); // Second 50% for concat
              })
              .run();
          })
          .catch((err) => reject({ success: false, error: err.message }));
      } else {
        // Source resolution - use original concat approach
        const listFile = path.join(tempDir, 'lazyvid-concat-list.txt');
        const fileList = clips.map((clip) => {
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
    }
  });
});
