let currentVideoPath = null;
let timelineClips = [];
let clipIdCounter = 0;

const importBtn = document.getElementById('importBtn');
const exportBtn = document.getElementById('exportBtn');
const deleteBtn = document.getElementById('deleteBtn');
const videoPlayer = document.getElementById('videoPlayer');
const dropzone = document.getElementById('dropzone');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const videoPreview = document.querySelector('.video-preview');

function updateStatus(message, isError = false) {
  console.log(`[${isError ? 'ERROR' : 'STATUS'}] ${message}`);
}

importBtn.addEventListener('click', async () => {
  try {
    const videoPath = await window.electronAPI.selectVideo();

    if (videoPath) {
      addVideoToTimeline(videoPath);
      updateStatus(`Video imported: ${videoPath.split('\\').pop()}`);
    }
  } catch (error) {
    updateStatus(`Import failed: ${error.message}`, true);
  }
});

function addVideoToTimeline(videoPath) {
  const fileName = videoPath.split('\\').pop();

  // Create temp video to get duration
  const tempVideo = document.createElement('video');
  tempVideo.src = `file://${videoPath}`;
  tempVideo.addEventListener('loadedmetadata', () => {
    const duration = tempVideo.duration;

    // Calculate position at end of timeline
    const endPosition = timelineClips.length > 0
      ? Math.max(...timelineClips.map(c => c.startTime + (c.trimEnd - c.trimStart)))
      : 0;

    const clip = {
      id: `timeline-${Date.now()}-${clipIdCounter++}`,
      clipId: clipIdCounter,
      name: fileName,
      path: videoPath,
      startTime: endPosition,
      duration: duration,
      trimStart: 0,
      trimEnd: duration
    };

    timelineClips.push(clip);
    renderTimelineClips();
    updateTimeDisplay();
    exportBtn.disabled = false;

    // Load first clip in player if this is the first clip
    if (timelineClips.length === 1) {
      videoPlayer.src = `file://${videoPath}`;
      videoPlayer.currentTime = 0;
    }

    updateStatus(`Added to timeline: ${fileName}`);
  });
}

exportBtn.addEventListener('click', async () => {
  if (timelineClips.length === 0) {
    updateStatus('No clips on timeline to export', true);
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

    const result = await window.electronAPI.exportTimeline(timelineClips, outputPath);

    if (result.success) {
      updateStatus(`Video exported successfully to: ${outputPath.split('\\').pop()}`);
    }
  } catch (error) {
    updateStatus(`Export failed: ${error.message || error.error}`, true);
  } finally {
    exportBtn.disabled = false;
    importBtn.disabled = false;
    progressBar.style.display = 'none';
    progressFill.style.width = '0%';
    progressText.textContent = '0%';
  }
});

// Timeline Foundation
const timeline = document.getElementById('timeline');
const timeRuler = document.getElementById('timeRuler');
const playhead = document.getElementById('playhead');
const timeDisplay = document.getElementById('timeDisplay');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const playBtn = document.getElementById('playBtn');
const markInBtn = document.getElementById('markInBtn');
const markOutBtn = document.getElementById('markOutBtn');

let timelineState = {
  duration: 60,
  currentTime: 0,
  pixelsPerSecond: 10,
  minZoom: 5,
  maxZoom: 50,
  isPlaying: false
};

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updateTimeDisplay() {
  const totalDuration = timelineClips.length > 0
    ? Math.max(...timelineClips.map(c => c.startTime + (c.trimEnd - c.trimStart)))
    : 0;
  timeDisplay.textContent = `${formatTime(timelineState.currentTime)} / ${formatTime(totalDuration)}`;
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
  updateTimeDisplay();
}

function seekTimeline(clickX) {
  const rect = timeline.getBoundingClientRect();
  const position = clickX - rect.left;
  const seekTime = Math.max(0, Math.min(position / timelineState.pixelsPerSecond, timelineState.duration));
  timelineState.currentTime = seekTime;
  updatePlayhead();
  
  // Find which clip we're seeking into
  for (const clip of timelineClips) {
    const clipStart = clip.startTime;
    const clipEnd = clip.startTime + (clip.trimEnd - clip.trimStart);
    
    if (seekTime >= clipStart && seekTime < clipEnd) {
      // Load this clip and seek to the right position within it
      const offsetInClip = seekTime - clipStart;
      const videoTime = clip.trimStart + offsetInClip;

      if (videoPlayer.src !== `file://${clip.path}`) {
        videoPlayer.src = `file://${clip.path}`;
      }
      videoPlayer.currentTime = videoTime;
      updateStatus(`Seeked to ${clip.name} @ ${formatTime(videoTime)}`);
      return;
    }
  }
}

timeline.addEventListener('click', (e) => {
  if (e.target.classList.contains('timeline-clip') || e.target.closest('.timeline-clip')) {
    return;
  }
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

playBtn.addEventListener('click', () => {
  updateStatus(`Play button clicked (clips: ${timelineClips.length})`);

  if (timelineClips.length === 0) {
    updateStatus('No clips on timeline to play', true);
    return;
  }

  if (timelineState.isPlaying) {
    videoPlayer.pause();
    timelineState.isPlaying = false;
    playBtn.textContent = '▶';
    updateStatus('Playback paused');
  } else {
    currentPlayingClipIndex = 0;
    const firstClip = timelineClips[0];
    updateStatus(`Loading: ${firstClip.name}`);
    videoPlayer.src = `file://${firstClip.path}`;
    videoPlayer.currentTime = firstClip.trimStart || 0;
    videoPlayer.play();
    timelineState.isPlaying = true;
    playBtn.textContent = '⏸';
    updateStatus(`Playing: ${firstClip.name} from ${formatTime(firstClip.trimStart || 0)}`);
  }
});

let animationFrameId = null;

let currentPlayingClipIndex = 0;

videoPlayer.addEventListener('play', () => {
  function updatePlayheadFromVideo() {
    if (timelineState.isPlaying && timelineClips.length > 0) {
      const currentClip = timelineClips[currentPlayingClipIndex];
      const trimStart = currentClip.trimStart || 0;
      const trimEnd = currentClip.trimEnd || currentClip.duration;
      
      if (videoPlayer.currentTime >= trimEnd) {
        if (currentPlayingClipIndex < timelineClips.length - 1) {
          currentPlayingClipIndex++;
          const nextClip = timelineClips[currentPlayingClipIndex];
          videoPlayer.src = `file://${nextClip.path}`;
          videoPlayer.currentTime = nextClip.trimStart || 0;
          videoPlayer.play();
          updateStatus(`Playing: ${nextClip.name}`);
          return;
        } else {
          videoPlayer.pause();
          timelineState.isPlaying = false;
          playBtn.textContent = '▶';
          currentPlayingClipIndex = 0;
          updateStatus('Playback complete');
          return;
        }
      }
      
      timelineState.currentTime = currentClip.startTime + (videoPlayer.currentTime - trimStart);
      updatePlayhead();
      animationFrameId = requestAnimationFrame(updatePlayheadFromVideo);
    }
  }
  updatePlayheadFromVideo();
});

videoPlayer.addEventListener('pause', () => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
});

renderTimeRuler();
updatePlayhead();
updateTimeDisplay();

// Playhead dragging
playhead.addEventListener('mousedown', (e) => {
  e.preventDefault();
  e.stopPropagation();

  // Pause playback if playing
  const wasPlaying = timelineState.isPlaying;
  if (wasPlaying) {
    videoPlayer.pause();
    timelineState.isPlaying = false;
    playBtn.textContent = '▶';
  }

  playheadDragState = { isDragging: true, wasPlaying };
  document.addEventListener('mousemove', handlePlayheadDrag);
  document.addEventListener('mouseup', handlePlayheadDragEnd);
});

function handlePlayheadDrag(e) {
  if (!playheadDragState) return;
  seekTimeline(e.clientX);
}

function handlePlayheadDragEnd() {
  // Keep paused even if it was playing before
  playheadDragState = null;
  document.removeEventListener('mousemove', handlePlayheadDrag);
  document.removeEventListener('mouseup', handlePlayheadDragEnd);
}

// Clip Management
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
    
    clipEl.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('trim-handle') || e.target.classList.contains('clip-delete')) {
        return;
      }
      startClipDrag(e, clip);
    });
    
    clipEl.addEventListener('click', (e) => {
      if (!e.target.classList.contains('trim-handle') && !e.target.classList.contains('clip-delete')) {
        selectedClip = clip.id;
        console.log(`[CLIP SELECT] Clip selected: ${clip.name} (ID: ${clip.id})`);
        renderTimelineClips();
        updateToolbarButtonStates();

        updateStatus(`Loading clip: ${clip.name}`);
        videoPlayer.src = `file://${clip.path}`;
        videoPlayer.currentTime = clip.trimStart || 0;
        updateStatus(`Preview: ${clip.name} @ ${formatTime(clip.trimStart || 0)}`);
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
let clipDragState = null;
let playheadDragState = null;

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

function startClipDrag(e, clip) {
  e.stopPropagation();
  e.preventDefault();
  const rect = timeline.getBoundingClientRect();
  const clipElement = e.currentTarget;
  clipDragState = {
    clip,
    startX: e.clientX,
    initialStartTime: clip.startTime,
    timelineLeft: rect.left
  };
  clipElement.style.opacity = '0.7';
  document.addEventListener('mousemove', handleClipDragMove);
  document.addEventListener('mouseup', handleClipDragEnd);
}

function handleClipDragMove(e) {
  if (!clipDragState) return;
  
  const deltaX = e.clientX - clipDragState.startX;
  const deltaTime = deltaX / timelineState.pixelsPerSecond;
  clipDragState.clip.startTime = Math.max(0, clipDragState.initialStartTime + deltaTime);
  
  renderTimelineClips();
}

function handleClipDragEnd(e) {
  if (!clipDragState) return;
  
  const clipElements = document.querySelectorAll('.timeline-clip');
  clipElements.forEach(el => el.style.opacity = '1');
  
  updateStatus(`Moved clip: ${clipDragState.clip.name}`);
  clipDragState = null;
  document.removeEventListener('mousemove', handleClipDragMove);
  document.removeEventListener('mouseup', handleClipDragEnd);
}



window.deleteTimelineClip = function(clipId) {
  timelineClips = timelineClips.filter(c => c.id !== clipId);
  if (selectedClip === clipId) {
    selectedClip = null;
    updateToolbarButtonStates();
  }
  renderTimelineClips();
  updateTimeDisplay();
  if (timelineClips.length === 0) {
    exportBtn.disabled = true;
  }
};

// Delete button handler
deleteBtn.addEventListener('click', () => {
  if (!selectedClip) return;
  window.deleteTimelineClip(selectedClip);
});

function updateToolbarButtonStates() {
  const hasSelection = selectedClip !== null;
  markInBtn.disabled = !hasSelection;
  markOutBtn.disabled = !hasSelection;
  deleteBtn.disabled = !hasSelection;
}

// Mark In/Out button handlers
markInBtn.addEventListener('click', () => {
  if (!selectedClip) return;

  const clip = timelineClips.find(c => c.id === selectedClip);
  if (!clip) return;

  const currentTime = videoPlayer.currentTime;
  if (currentTime < clip.trimEnd) {
    clip.trimStart = Math.max(0, currentTime);
    renderTimelineClips();
    updateTimeDisplay();

    // Keep playhead at the same position (which is now the clip's new start)
    // The timeline position is: clip start position + 0 (since we're at the new trimStart)
    timelineState.currentTime = clip.startTime;
    updatePlayhead();

    updateStatus(`In point set at ${formatTime(clip.trimStart)}`);
  } else {
    updateStatus('In point must be before out point', true);
  }
});

markOutBtn.addEventListener('click', () => {
  if (!selectedClip) return;

  const clip = timelineClips.find(c => c.id === selectedClip);
  if (!clip) return;

  const currentTime = videoPlayer.currentTime;
  if (currentTime > clip.trimStart && currentTime <= clip.duration) {
    clip.trimEnd = currentTime;
    renderTimelineClips();
    updateTimeDisplay();
    updateStatus(`Out point set at ${formatTime(clip.trimEnd)}`);
  } else {
    updateStatus('Out point must be after in point and within clip duration', true);
  }
});

// Keyboard shortcuts for trimming
document.addEventListener('keydown', (e) => {
  console.log(`[KEYDOWN] Key pressed: ${e.key}, selectedClip: ${selectedClip}, timelineClips: ${timelineClips.length}`);

  if (!selectedClip) {
    console.log('[KEYDOWN] No clip selected, ignoring keypress');
    return;
  }

  const clip = timelineClips.find(c => c.id === selectedClip);
  if (!clip) {
    console.log('[KEYDOWN] Selected clip not found in timeline');
    return;
  }

  console.log(`[KEYDOWN] Found clip: ${clip.name}, current video time: ${videoPlayer.currentTime}`);

  // I key - Mark In point
  if (e.key === 'i' || e.key === 'I') {
    e.preventDefault();
    const currentTime = videoPlayer.currentTime;
    if (currentTime < clip.trimEnd) {
      clip.trimStart = Math.max(0, currentTime);
      renderTimelineClips();
      updateTimeDisplay();

      // Keep playhead at the same position (which is now the clip's new start)
      // The timeline position is: clip start position + 0 (since we're at the new trimStart)
      timelineState.currentTime = clip.startTime;
      updatePlayhead();

      updateStatus(`In point set at ${formatTime(clip.trimStart)}`);
    } else {
      updateStatus('In point must be before out point', true);
    }
  }

  // O key - Mark Out point
  if (e.key === 'o' || e.key === 'O') {
    e.preventDefault();
    const currentTime = videoPlayer.currentTime;
    if (currentTime > clip.trimStart && currentTime <= clip.duration) {
      clip.trimEnd = currentTime;
      renderTimelineClips();
      updateTimeDisplay();
      updateStatus(`Out point set at ${formatTime(clip.trimEnd)}`);
    } else {
      updateStatus('Out point must be after in point and within clip duration', true);
    }
  }
});

// Drag-Drop Import
videoPreview.addEventListener('dragenter', (e) => {
  e.preventDefault();
  if (e.dataTransfer.types.includes('Files')) {
    dropzone.classList.add('drag-over');
  }
});

videoPreview.addEventListener('dragover', (e) => {
  e.preventDefault();
  if (e.dataTransfer.types.includes('Files')) {
    e.dataTransfer.dropEffect = 'copy';
  }
});

videoPreview.addEventListener('dragleave', (e) => {
  if (e.target === videoPreview || e.target === dropzone) {
    dropzone.classList.remove('drag-over');
  }
});

videoPreview.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('drag-over');

  const files = Array.from(e.dataTransfer.files);
  const videoFiles = files.filter(file =>
    file.type.startsWith('video/') ||
    /\.(mp4|mov|webm)$/i.test(file.name)
  );

  if (videoFiles.length > 0) {
    videoFiles.forEach(file => {
      const videoPath = file.path;
      addVideoToTimeline(videoPath);
    });

    updateStatus(`Imported ${videoFiles.length} video(s)`);
  }
});
