let currentVideoPath = null;
let mediaLibrary = [];
let timelineClips = [];
let clipIdCounter = 0;

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
      
      addToMediaLibrary(videoPath);
      
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

// Timeline Foundation
const timeline = document.getElementById('timeline');
const timeRuler = document.getElementById('timeRuler');
const playhead = document.getElementById('playhead');
const timeDisplay = document.getElementById('timeDisplay');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');

let timelineState = {
  duration: 60,
  currentTime: 0,
  pixelsPerSecond: 10,
  minZoom: 5,
  maxZoom: 50
};

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function renderTimeRuler() {
  timeRuler.innerHTML = '';
  const timelineWidth = timeline.offsetWidth;
  const visibleDuration = timelineWidth / timelineState.pixelsPerSecond;
  const interval = visibleDuration > 60 ? 10 : visibleDuration > 30 ? 5 : 1;
  
  for (let time = 0; time <= timelineState.duration; time += interval) {
    const position = time * timelineState.pixelsPerSecond;
    if (position <= timelineWidth) {
      const marker = document.createElement('div');
      marker.className = 'time-marker';
      marker.style.left = `${position}px`;
      marker.textContent = formatTime(time);
      timeRuler.appendChild(marker);
    }
  }
}

function updatePlayhead() {
  const position = timelineState.currentTime * timelineState.pixelsPerSecond;
  playhead.style.left = `${position}px`;
  timeDisplay.textContent = formatTime(timelineState.currentTime);
}

function seekTimeline(clickX) {
  const rect = timeline.getBoundingClientRect();
  const position = clickX - rect.left;
  timelineState.currentTime = Math.max(0, Math.min(position / timelineState.pixelsPerSecond, timelineState.duration));
  updatePlayhead();
}

timeline.addEventListener('click', (e) => {
  seekTimeline(e.clientX);
});

zoomInBtn.addEventListener('click', () => {
  if (timelineState.pixelsPerSecond < timelineState.maxZoom) {
    timelineState.pixelsPerSecond += 5;
    renderTimeRuler();
    updatePlayhead();
  }
});

zoomOutBtn.addEventListener('click', () => {
  if (timelineState.pixelsPerSecond > timelineState.minZoom) {
    timelineState.pixelsPerSecond -= 5;
    renderTimeRuler();
    updatePlayhead();
  }
});

window.addEventListener('resize', renderTimeRuler);

renderTimeRuler();
updatePlayhead();

// Clip Management
const mediaItems = document.getElementById('mediaItems');

function addToMediaLibrary(videoPath) {
  const fileName = videoPath.split('\\').pop();
  const clip = {
    id: clipIdCounter++,
    path: videoPath,
    name: fileName,
    duration: 0
  };
  
  const tempVideo = document.createElement('video');
  tempVideo.src = `file://${videoPath}`;
  tempVideo.addEventListener('loadedmetadata', () => {
    clip.duration = tempVideo.duration;
    renderMediaLibrary();
  });
  
  mediaLibrary.push(clip);
  renderMediaLibrary();
}

function renderMediaLibrary() {
  if (mediaLibrary.length === 0) {
    mediaItems.innerHTML = '<p class="empty-state">No clips imported</p>';
    return;
  }
  
  mediaItems.innerHTML = mediaLibrary.map(clip => `
    <div class="media-item" draggable="true" data-clip-id="${clip.id}">
      <div class="media-item-name">${clip.name}</div>
      <div class="media-item-duration">${formatTime(clip.duration)}</div>
    </div>
  `).join('');
  
  document.querySelectorAll('.media-item').forEach(item => {
    item.addEventListener('dragstart', handleDragStart);
  });
}

function handleDragStart(e) {
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData('text/plain', e.target.dataset.clipId);
}

timeline.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});

timeline.addEventListener('drop', (e) => {
  e.preventDefault();
  const clipId = parseInt(e.dataTransfer.getData('text/plain'));
  const clip = mediaLibrary.find(c => c.id === clipId);
  
  if (clip) {
    const rect = timeline.getBoundingClientRect();
    const dropPosition = e.clientX - rect.left;
    const startTime = dropPosition / timelineState.pixelsPerSecond;
    
    addClipToTimeline(clip, startTime);
  }
});

function addClipToTimeline(clip, startTime) {
  const timelineClip = {
    id: `timeline-${Date.now()}`,
    clipId: clip.id,
    name: clip.name,
    path: clip.path,
    startTime: startTime,
    duration: clip.duration,
    trimStart: 0,
    trimEnd: clip.duration
  };
  
  timelineClips.push(timelineClip);
  renderTimelineClips();
}

let selectedClip = null;

function renderTimelineClips() {
  document.querySelectorAll('.timeline-clip').forEach(el => el.remove());
  
  timelineClips.forEach(clip => {
    const visibleDuration = clip.trimEnd - clip.trimStart;
    const clipEl = document.createElement('div');
    clipEl.className = 'timeline-clip';
    if (selectedClip === clip.id) clipEl.classList.add('selected');
    clipEl.dataset.timelineClipId = clip.id;
    clipEl.style.left = `${clip.startTime * timelineState.pixelsPerSecond}px`;
    clipEl.style.width = `${visibleDuration * timelineState.pixelsPerSecond}px`;
    clipEl.innerHTML = `
      <div class="trim-handle trim-handle-left" data-handle="left"></div>
      ${clip.name}
      <div class="trim-handle trim-handle-right" data-handle="right"></div>
      <button class="clip-delete" onclick="deleteTimelineClip('${clip.id}')">×</button>
    `;
    
    clipEl.draggable = true;
    clipEl.addEventListener('dragstart', handleClipDragStart);
    clipEl.addEventListener('click', (e) => {
      if (!e.target.classList.contains('trim-handle') && !e.target.classList.contains('clip-delete')) {
        selectedClip = clip.id;
        renderTimelineClips();
      }
    });
    
    const leftHandle = clipEl.querySelector('.trim-handle-left');
    const rightHandle = clipEl.querySelector('.trim-handle-right');
    
    leftHandle.addEventListener('mousedown', (e) => startTrim(e, clip, 'left'));
    rightHandle.addEventListener('mousedown', (e) => startTrim(e, clip, 'right'));
    
    timeline.appendChild(clipEl);
  });
}

let trimState = null;

function startTrim(e, clip, handle) {
  e.stopPropagation();
  e.preventDefault();
  trimState = { clip, handle, startX: e.clientX };
  document.addEventListener('mousemove', handleTrimMove);
  document.addEventListener('mouseup', handleTrimEnd);
}

function handleTrimMove(e) {
  if (!trimState) return;
  
  const deltaX = e.clientX - trimState.startX;
  const deltaTime = deltaX / timelineState.pixelsPerSecond;
  const clip = trimState.clip;
  
  if (trimState.handle === 'left') {
    const newTrimStart = Math.max(0, Math.min(clip.trimStart + deltaTime, clip.trimEnd - 0.1));
    clip.trimStart = newTrimStart;
  } else {
    const newTrimEnd = Math.max(clip.trimStart + 0.1, Math.min(clip.trimEnd + deltaTime, clip.duration));
    clip.trimEnd = newTrimEnd;
  }
  
  trimState.startX = e.clientX;
  renderTimelineClips();
}

function handleTrimEnd() {
  trimState = null;
  document.removeEventListener('mousemove', handleTrimMove);
  document.removeEventListener('mouseup', handleTrimEnd);
}

function handleClipDragStart(e) {
  e.stopPropagation();
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('timeline-clip-id', e.target.dataset.timelineClipId);
}

timeline.addEventListener('drop', (e) => {
  const timelineClipId = e.dataTransfer.getData('timeline-clip-id');
  if (timelineClipId) {
    e.preventDefault();
    const clip = timelineClips.find(c => c.id === timelineClipId);
    if (clip) {
      const rect = timeline.getBoundingClientRect();
      const newPosition = e.clientX - rect.left;
      clip.startTime = Math.max(0, newPosition / timelineState.pixelsPerSecond);
      renderTimelineClips();
    }
  }
});

window.deleteTimelineClip = function(clipId) {
  timelineClips = timelineClips.filter(c => c.id !== clipId);
  renderTimelineClips();
};
