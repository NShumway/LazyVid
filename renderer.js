let currentVideoPath = null;

const importBtn = document.getElementById('importBtn');
const exportBtn = document.getElementById('exportBtn');
const videoPlayer = document.getElementById('videoPlayer');
const dropzone = document.getElementById('dropzone');
const statusMessage = document.getElementById('statusMessage');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

function updateStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.style.color = isError ? '#e74c3c' : '#2ecc71';
}

function updateChecklist(item, status) {
  const element = document.getElementById(`check-${item}`);
  if (element) {
    const symbols = { pending: '⏳', success: '✓', error: '✗' };
    element.textContent = element.textContent.replace(/^[✓✗⏳]/, symbols[status]);
    element.style.color = status === 'success' ? '#2ecc71' : status === 'error' ? '#e74c3c' : '#95a5a6';
  }
}

importBtn.addEventListener('click', async () => {
  try {
    const videoPath = await window.electronAPI.selectVideo();
    
    if (videoPath) {
      currentVideoPath = videoPath;
      
      videoPlayer.src = `file://${videoPath}`;
      videoPlayer.style.display = 'block';
      dropzone.style.display = 'none';
      exportBtn.disabled = false;
      
      updateStatus(`Video loaded: ${videoPath.split('\\').pop()}`);
      updateChecklist('import', 'success');
      updateChecklist('preview', 'success');
      updateChecklist('ffmpeg', 'success');
    }
  } catch (error) {
    updateStatus(`Import failed: ${error.message}`, true);
    updateChecklist('import', 'error');
  }
});

exportBtn.addEventListener('click', async () => {
  if (!currentVideoPath) {
    updateStatus('No video loaded', true);
    return;
  }

  try {
    const outputPath = await window.electronAPI.saveDialog('exported-video.mp4');
    
    if (!outputPath) {
      return;
    }

    exportBtn.disabled = true;
    importBtn.disabled = true;
    progressBar.style.display = 'block';
    updateStatus('Exporting video...');

    window.electronAPI.onExportProgress((percent) => {
      const rounded = Math.round(percent);
      progressFill.style.width = `${rounded}%`;
      progressText.textContent = `${rounded}%`;
    });

    const result = await window.electronAPI.exportVideo(currentVideoPath, outputPath);

    if (result.success) {
      updateStatus(`Video exported successfully to: ${outputPath.split('\\').pop()}`);
      updateChecklist('export', 'success');
    }
  } catch (error) {
    updateStatus(`Export failed: ${error.message || error.error}`, true);
    updateChecklist('export', 'error');
  } finally {
    exportBtn.disabled = false;
    importBtn.disabled = false;
    progressBar.style.display = 'none';
    progressFill.style.width = '0%';
    progressText.textContent = '0%';
  }
});

videoPlayer.addEventListener('loadedmetadata', () => {
  updateStatus(`Video ready: ${videoPlayer.videoWidth}x${videoPlayer.videoHeight}, ${Math.round(videoPlayer.duration)}s`);
});

videoPlayer.addEventListener('error', () => {
  updateStatus('Video playback error', true);
  updateChecklist('preview', 'error');
});
