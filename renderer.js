let currentVideoPath = null;
let timelineClips = [];
let clipIdCounter = 0;

const importBtn = document.getElementById('importBtn');
const exportBtn = document.getElementById('exportBtn');
const deleteBtn = document.getElementById('deleteBtn');
const splitBtn = document.getElementById('splitBtn');
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

async function addVideoToTimeline(videoPath) {
  const fileName = videoPath.split('\\').pop();

  // Create temp video to get duration and metadata
  const tempVideo = document.createElement('video');
  tempVideo.src = `file://${videoPath}`;

  tempVideo.addEventListener('loadedmetadata', async () => {
    const duration = tempVideo.duration;
    const resolution = `${tempVideo.videoWidth}x${tempVideo.videoHeight}`;

    // Get file size
    let fileSize = 0;
    try {
      const stats = await window.electronAPI.getFileStats(videoPath);
      fileSize = stats.size;
    } catch (err) {
      console.error('Failed to get file size:', err);
    }

    // Generate thumbnail from first frame
    const thumbnail = await generateThumbnail(tempVideo);

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
      trimEnd: duration,
      resolution: resolution,
      fileSize: fileSize,
      thumbnail: thumbnail
    };

    timelineClips.push(clip);

    // Auto-zoom timeline to fit all videos at 100% width
    autoZoomToFit();

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

function generateThumbnail(videoElement) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 68;
    const ctx = canvas.getContext('2d');

    const drawFrame = () => {
      if (videoElement.readyState >= 2) {
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      } else {
        setTimeout(drawFrame, 50);
      }
    };

    videoElement.currentTime = 0.1; // Slightly ahead to ensure frame is loaded
    videoElement.addEventListener('seeked', drawFrame, { once: true });
  });
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function autoZoomToFit() {
  if (timelineClips.length === 0) return;

  const totalDuration = Math.max(...timelineClips.map(c => c.startTime + (c.trimEnd - c.trimStart)));
  const timelineWidth = timeline.offsetWidth;

  // Calculate pixels per second to fit all content exactly
  timelineState.pixelsPerSecond = timelineWidth / totalDuration;

  // Update timeline duration to show everything
  timelineState.duration = Math.max(totalDuration, timelineState.duration);

  renderTimeRuler();
  updatePlayhead();
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

// Click on time ruler moves playhead (but doesn't deselect clips)
timeRuler.addEventListener('click', (e) => {
  seekTimeline(e.clientX);
});

timeline.addEventListener('click', (e) => {
  // If clicking on a clip or its children, let the clip handler deal with it
  if (e.target.classList.contains('timeline-clip') || e.target.closest('.timeline-clip')) {
    return;
  }

  // If clicking on playhead, don't deselect or seek
  if (e.target === playhead || e.target.closest('#playhead')) {
    return;
  }

  // Deselect any selected clip when clicking in the empty timeline area (not ruler, not playhead)
  if (selectedClip) {
    selectedClip = null;
    renderTimelineClips();
    updateToolbarButtonStates();
  }

  seekTimeline(e.clientX);
});

zoomInBtn.addEventListener('click', () => {
  timelineState.pixelsPerSecond += 5;
  renderTimeRuler();
  renderTimelineClips();
  updatePlayhead();
});

zoomOutBtn.addEventListener('click', () => {
  // Prevent zooming out to zero or negative
  if (timelineState.pixelsPerSecond > 0.5) {
    timelineState.pixelsPerSecond -= 5;
    if (timelineState.pixelsPerSecond < 0.5) {
      timelineState.pixelsPerSecond = 0.5;
    }
    renderTimeRuler();
    renderTimelineClips();
    updatePlayhead();
  }
});

window.addEventListener('resize', renderTimeRuler);

// Mouse wheel zoom on timeline
timeline.addEventListener('wheel', (e) => {
  e.preventDefault();

  const delta = -Math.sign(e.deltaY);
  const zoomStep = 2;
  const newZoom = timelineState.pixelsPerSecond + (delta * zoomStep);

  // Only prevent zooming to zero or negative
  if (newZoom >= 0.1) {
    timelineState.pixelsPerSecond = newZoom;
    renderTimeRuler();
    renderTimelineClips();
    updatePlayhead();
  }
});

// Mouse wheel zoom on time ruler
timeRuler.addEventListener('wheel', (e) => {
  e.preventDefault();

  const delta = -Math.sign(e.deltaY);
  const zoomStep = 2;
  const newZoom = timelineState.pixelsPerSecond + (delta * zoomStep);

  // Only prevent zooming to zero or negative
  if (newZoom >= 0.1) {
    timelineState.pixelsPerSecond = newZoom;
    renderTimeRuler();
    renderTimelineClips();
    updatePlayhead();
  }
});

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
    // Play from current playhead position
    const currentTime = timelineState.currentTime;

    // Find which clip contains the current playhead position
    let foundClip = false;
    for (let i = 0; i < timelineClips.length; i++) {
      const clip = timelineClips[i];
      const clipStart = clip.startTime;
      const clipEnd = clip.startTime + (clip.trimEnd - clip.trimStart);

      if (currentTime >= clipStart && currentTime < clipEnd) {
        // Start playing from this clip
        currentPlayingClipIndex = i;
        const offsetInClip = currentTime - clipStart;
        const videoTime = clip.trimStart + offsetInClip;

        updateStatus(`Loading: ${clip.name}`);
        videoPlayer.src = `file://${clip.path}`;
        videoPlayer.currentTime = videoTime;
        videoPlayer.play();
        timelineState.isPlaying = true;
        playBtn.textContent = '⏸';
        updateStatus(`Playing: ${clip.name} from ${formatTime(videoTime)}`);
        foundClip = true;
        break;
      }
    }

    // If playhead is beyond all clips or before first clip, start from beginning
    if (!foundClip) {
      currentPlayingClipIndex = 0;
      const firstClip = timelineClips[0];
      timelineState.currentTime = 0;
      updateStatus(`Loading: ${firstClip.name}`);
      videoPlayer.src = `file://${firstClip.path}`;
      videoPlayer.currentTime = firstClip.trimStart || 0;
      videoPlayer.play();
      timelineState.isPlaying = true;
      playBtn.textContent = '⏸';
      updateStatus(`Playing: ${firstClip.name} from start`);
    }
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

    // Build metadata display
    const metadataHtml = clip.resolution && clip.fileSize
      ? `<div class="clip-metadata">
           <span>${formatTime(visibleDuration)}</span>
           <span>${clip.resolution}</span>
           <span>${formatFileSize(clip.fileSize)}</span>
         </div>`
      : '';

    // Build thumbnail display
    const thumbnailHtml = clip.thumbnail
      ? `<img class="clip-thumbnail" src="${clip.thumbnail}" alt="Thumbnail" />`
      : '';

    clipEl.innerHTML = `
      <div class="trim-handle trim-handle-left" data-handle="left"></div>
      ${thumbnailHtml}
      <div class="clip-content">
        <div class="clip-name">${clip.name}</div>
        ${metadataHtml}
      </div>
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
      // Prevent click event if we just finished dragging (within 50ms)
      // This is a shorter window since we now have drag threshold
      if (Date.now() - lastDragEndTime < 50) {
        console.log('[CLIP SELECT] Click blocked - just finished dragging');
        return;
      }

      if (!e.target.classList.contains('trim-handle') && !e.target.classList.contains('clip-delete')) {
        selectedClip = clip.id;
        console.log(`[CLIP SELECT] Clip selected: ${clip.name} (ID: ${clip.id})`);
        renderTimelineClips();
        updateToolbarButtonStates();

        // Only load clip in player if not currently playing
        // During playback, the video player should continue uninterrupted
        if (!timelineState.isPlaying) {
          updateStatus(`Loading clip: ${clip.name}`);
          videoPlayer.src = `file://${clip.path}`;
          videoPlayer.currentTime = clip.trimStart || 0;
          updateStatus(`Preview: ${clip.name} @ ${formatTime(clip.trimStart || 0)}`);
        } else {
          updateStatus(`Clip selected: ${clip.name}`);
        }
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
let lastDragEndTime = 0; // Track when last drag ended to prevent click events

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
  // Don't preventDefault yet - wait until we actually start dragging
  // This allows click events to fire if we don't drag

  const rect = timeline.getBoundingClientRect();
  const clipElement = e.currentTarget;
  clipDragState = {
    clip,
    startX: e.clientX,
    startY: e.clientY,
    initialStartTime: clip.startTime,
    timelineLeft: rect.left,
    snapIndicator: null,
    isDragging: false, // Track if we've actually started dragging
    dragThreshold: 5 // Pixels to move before starting drag
  };
  document.addEventListener('mousemove', handleClipDragMove);
  document.addEventListener('mouseup', handleClipDragEnd);
}

function handleClipDragMove(e) {
  if (!clipDragState) return;

  // Check if we've moved beyond the drag threshold
  if (!clipDragState.isDragging) {
    const deltaX = Math.abs(e.clientX - clipDragState.startX);
    const deltaY = Math.abs(e.clientY - clipDragState.startY);
    const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (totalMovement < clipDragState.dragThreshold) {
      return; // Not enough movement to start dragging
    }

    // Start dragging - now we prevent default behavior and show visual feedback
    clipDragState.isDragging = true;
    e.preventDefault(); // Prevent text selection and other default behaviors

    // Select the clip being dragged
    selectedClip = clipDragState.clip.id;

    const clipElement = document.querySelector(`[data-timeline-clip-id="${clipDragState.clip.id}"]`);
    if (clipElement) {
      clipElement.style.opacity = '0.5';
      clipElement.style.zIndex = '20'; // Bring to front while dragging
    }

    // Re-render to show selection
    renderTimelineClips();
    updateToolbarButtonStates();
  }

  const deltaX = e.clientX - clipDragState.startX;
  const deltaTime = deltaX / timelineState.pixelsPerSecond;
  const newStartTime = Math.max(0, clipDragState.initialStartTime + deltaTime);

  // Find snap positions (other clip boundaries)
  const snapThreshold = 20 / timelineState.pixelsPerSecond; // 20 pixels in time
  const draggedClip = clipDragState.clip;
  const draggedClipDuration = draggedClip.trimEnd - draggedClip.trimStart;

  let snapPosition = null;
  let snapType = null;
  let targetIndex = null; // Track where in the array the clip should go

  // Get other clips (not the dragged one) sorted by position
  const otherClips = timelineClips.filter(c => c.id !== draggedClip.id).sort((a, b) => a.startTime - b.startTime);

  // Check for snaps with other clips
  for (let i = 0; i < otherClips.length; i++) {
    const clip = otherClips[i];
    const clipEnd = clip.startTime + (clip.trimEnd - clip.trimStart);

    // Snap to end of this clip (dragged clip comes after)
    if (Math.abs(newStartTime - clipEnd) < snapThreshold) {
      snapPosition = clipEnd;
      snapType = 'after';
      targetIndex = i + 1; // Insert after this clip
      break;
    }

    // Snap to start of this clip (dragged clip comes before)
    if (Math.abs((newStartTime + draggedClipDuration) - clip.startTime) < snapThreshold) {
      snapPosition = clip.startTime - draggedClipDuration;
      snapType = 'before';
      targetIndex = i; // Insert before this clip
      break;
    }
  }

  // Snap to timeline start
  if (snapPosition === null && Math.abs(newStartTime) < snapThreshold) {
    snapPosition = 0;
    snapType = 'start';
    targetIndex = 0;
  }

  // Apply snap or regular position
  if (snapPosition !== null) {
    clipDragState.clip.startTime = Math.max(0, snapPosition);
    showSnapIndicator(snapPosition, draggedClipDuration, snapType);

    // Reorganize clips to be contiguous
    reorganizeClips(draggedClip, targetIndex);
  } else {
    clipDragState.clip.startTime = newStartTime;
    hideSnapIndicator();
  }

  renderTimelineClips();
}

function reorganizeClips(draggedClip, targetIndex) {
  // Remove dragged clip from array temporarily
  const otherClips = timelineClips.filter(c => c.id !== draggedClip.id);

  // Insert dragged clip at target index
  const newOrder = [...otherClips.slice(0, targetIndex), draggedClip, ...otherClips.slice(targetIndex)];

  // Reposition all clips to be contiguous starting from 0
  let currentPosition = 0;
  for (const clip of newOrder) {
    clip.startTime = currentPosition;
    currentPosition += (clip.trimEnd - clip.trimStart);
  }

  // Update the global array
  timelineClips = newOrder;
}

function reorganizeAllClips() {
  // Sort clips by current position and make them contiguous
  timelineClips.sort((a, b) => a.startTime - b.startTime);

  let currentPosition = 0;
  for (const clip of timelineClips) {
    clip.startTime = currentPosition;
    currentPosition += (clip.trimEnd - clip.trimStart);
  }
}

function syncVideoPlayerToPlayhead() {
  // Find which clip contains the current playhead position
  const currentTime = timelineState.currentTime;

  for (const clip of timelineClips) {
    const clipStart = clip.startTime;
    const clipEnd = clip.startTime + (clip.trimEnd - clip.trimStart);

    if (currentTime >= clipStart && currentTime < clipEnd) {
      // Playhead is within this clip
      const offsetInClip = currentTime - clipStart;
      const videoTime = clip.trimStart + offsetInClip;

      // Load the clip and seek to the correct position
      videoPlayer.src = `file://${clip.path}`;
      videoPlayer.currentTime = videoTime;
      return;
    }
  }

  // Playhead is not within any clip - no update needed
}

function showSnapIndicator(position, duration, type) {
  hideSnapIndicator();

  const indicator = document.createElement('div');
  indicator.className = 'snap-indicator';
  indicator.style.left = `${position * timelineState.pixelsPerSecond}px`;
  indicator.style.width = `${duration * timelineState.pixelsPerSecond}px`;
  timeline.appendChild(indicator);

  clipDragState.snapIndicator = indicator;
}

function hideSnapIndicator() {
  if (clipDragState && clipDragState.snapIndicator) {
    clipDragState.snapIndicator.remove();
    clipDragState.snapIndicator = null;
  }
}

function handleClipDragEnd(e) {
  if (!clipDragState) return;

  const wasDragging = clipDragState.isDragging;

  hideSnapIndicator();

  if (wasDragging) {
    // Final reorganization to ensure no gaps/overlaps
    // Sort clips by current position to determine order
    timelineClips.sort((a, b) => a.startTime - b.startTime);

    // Reposition all clips to be contiguous from 0
    let currentPosition = 0;
    for (const clip of timelineClips) {
      clip.startTime = currentPosition;
      currentPosition += (clip.trimEnd - clip.trimStart);
    }

    const clipElements = document.querySelectorAll('.timeline-clip');
    clipElements.forEach(el => {
      el.style.opacity = '1';
      el.style.zIndex = ''; // Reset z-index to default
    });

    updateStatus(`Moved clip: ${clipDragState.clip.name}`);
    renderTimelineClips();

    // Mark that we just finished a drag to prevent click event
    lastDragEndTime = Date.now();
  }
  // If not dragging, this was just a click - let the click handler deal with selection

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
  splitBtn.disabled = !hasSelection;
  deleteBtn.disabled = !hasSelection;
}

// Mark In/Out button handlers
markInBtn.addEventListener('click', () => {
  if (!selectedClip) return;

  const clip = timelineClips.find(c => c.id === selectedClip);
  if (!clip) return;

  // Calculate the time within the clip based on the timeline playhead position
  const timelinePlayheadPosition = timelineState.currentTime;
  const clipStart = clip.startTime;
  const clipEnd = clip.startTime + (clip.trimEnd - clip.trimStart);

  // Check if playhead is within this clip
  if (timelinePlayheadPosition < clipStart || timelinePlayheadPosition >= clipEnd) {
    updateStatus('Move playhead to within the selected clip to set in point', true);
    return;
  }

  // Calculate position within the clip's original video
  const offsetInClip = timelinePlayheadPosition - clipStart;
  const timeInOriginalVideo = clip.trimStart + offsetInClip;

  if (timeInOriginalVideo < clip.trimEnd) {
    const oldTrimStart = clip.trimStart;
    clip.trimStart = Math.max(0, timeInOriginalVideo);
    const amountTrimmed = clip.trimStart - oldTrimStart;

    // Calculate new playhead position (shifts left by amount trimmed)
    const oldPlayheadPosition = timelineState.currentTime;

    // Reorganize clips to remove gaps
    reorganizeAllClips();

    // Move playhead left by the amount we trimmed off
    timelineState.currentTime = Math.max(0, oldPlayheadPosition - amountTrimmed);
    updatePlayhead();

    renderTimelineClips();
    updateTimeDisplay();

    // Update video player to show the frame at the playhead position
    syncVideoPlayerToPlayhead();

    updateStatus(`In point set at ${formatTime(clip.trimStart)}`);
  } else {
    updateStatus('In point must be before out point', true);
  }
});

markOutBtn.addEventListener('click', () => {
  if (!selectedClip) return;

  const clip = timelineClips.find(c => c.id === selectedClip);
  if (!clip) return;

  // Calculate the time within the clip based on the timeline playhead position
  const timelinePlayheadPosition = timelineState.currentTime;
  const clipStart = clip.startTime;
  const clipEnd = clip.startTime + (clip.trimEnd - clip.trimStart);

  // Check if playhead is within this clip
  if (timelinePlayheadPosition < clipStart || timelinePlayheadPosition >= clipEnd) {
    updateStatus('Move playhead to within the selected clip to set out point', true);
    return;
  }

  // Calculate position within the clip's original video
  const offsetInClip = timelinePlayheadPosition - clipStart;
  const timeInOriginalVideo = clip.trimStart + offsetInClip;

  if (timeInOriginalVideo > clip.trimStart && timeInOriginalVideo <= clip.duration) {
    clip.trimEnd = timeInOriginalVideo;

    // Reorganize clips to remove gaps
    reorganizeAllClips();

    renderTimelineClips();
    updateTimeDisplay();

    // Update video player to show the frame at the playhead position
    // Playhead doesn't move for Out point since nothing before it changed
    syncVideoPlayerToPlayhead();

    updateStatus(`Out point set at ${formatTime(clip.trimEnd)}`);
  } else {
    updateStatus('Out point must be after in point and within clip duration', true);
  }
});

// Split clip button handler
splitBtn.addEventListener('click', () => {
  if (!selectedClip) return;

  const clip = timelineClips.find(c => c.id === selectedClip);
  if (!clip) return;

  // Calculate the time within the clip based on the timeline playhead position
  const timelinePlayheadPosition = timelineState.currentTime;
  const clipStart = clip.startTime;
  const clipEnd = clip.startTime + (clip.trimEnd - clip.trimStart);

  // Check if playhead is within this clip
  if (timelinePlayheadPosition <= clipStart || timelinePlayheadPosition >= clipEnd) {
    updateStatus('Move playhead within the selected clip to split it', true);
    return;
  }

  // Calculate position within the clip's original video
  const offsetInClip = timelinePlayheadPosition - clipStart;
  const splitPoint = clip.trimStart + offsetInClip;

  // Create the second clip (right side of split)
  const newClip = {
    id: `timeline-${Date.now()}-${clipIdCounter++}`,
    clipId: clipIdCounter,
    name: clip.name,
    path: clip.path,
    startTime: timelinePlayheadPosition, // Will be repositioned by reorganize
    duration: clip.duration,
    trimStart: splitPoint,
    trimEnd: clip.trimEnd,
    resolution: clip.resolution,
    fileSize: clip.fileSize,
    thumbnail: clip.thumbnail
  };

  // Update the first clip (left side of split)
  clip.trimEnd = splitPoint;

  // Add the new clip to the timeline
  timelineClips.push(newClip);

  // Reorganize clips to be contiguous
  reorganizeAllClips();

  // Select the first part of the split
  selectedClip = clip.id;

  renderTimelineClips();
  updateTimeDisplay();
  updateToolbarButtonStates();

  updateStatus(`Split clip: ${clip.name}`);
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

  // Calculate the time within the clip based on the timeline playhead position
  const timelinePlayheadPosition = timelineState.currentTime;
  const clipStart = clip.startTime;
  const clipEnd = clip.startTime + (clip.trimEnd - clip.trimStart);

  // Check if playhead is within this clip
  if (timelinePlayheadPosition < clipStart || timelinePlayheadPosition >= clipEnd) {
    console.log(`[KEYDOWN] Playhead not within selected clip (playhead: ${timelinePlayheadPosition}, clip: ${clipStart}-${clipEnd})`);
    updateStatus('Move playhead to within the selected clip to set in/out points', true);
    return;
  }

  // Calculate position within the clip's original video
  const offsetInClip = timelinePlayheadPosition - clipStart;
  const timeInOriginalVideo = clip.trimStart + offsetInClip;

  console.log(`[KEYDOWN] Found clip: ${clip.name}, timeline playhead: ${timelinePlayheadPosition}, time in video: ${timeInOriginalVideo}`);

  // I key - Mark In point
  if (e.key === 'i' || e.key === 'I') {
    e.preventDefault();
    if (timeInOriginalVideo < clip.trimEnd) {
      const oldTrimStart = clip.trimStart;
      clip.trimStart = Math.max(0, timeInOriginalVideo);
      const amountTrimmed = clip.trimStart - oldTrimStart;

      // Calculate new playhead position (shifts left by amount trimmed)
      const oldPlayheadPosition = timelineState.currentTime;

      // Reorganize clips to remove gaps
      reorganizeAllClips();

      // Move playhead left by the amount we trimmed off
      timelineState.currentTime = Math.max(0, oldPlayheadPosition - amountTrimmed);
      updatePlayhead();

      renderTimelineClips();
      updateTimeDisplay();

      // Update video player to show the frame at the playhead position
      syncVideoPlayerToPlayhead();

      updateStatus(`In point set at ${formatTime(clip.trimStart)}`);
    } else {
      updateStatus('In point must be before out point', true);
    }
  }

  // O key - Mark Out point
  if (e.key === 'o' || e.key === 'O') {
    e.preventDefault();
    if (timeInOriginalVideo > clip.trimStart && timeInOriginalVideo <= clip.duration) {
      clip.trimEnd = timeInOriginalVideo;

      // Reorganize clips to remove gaps
      reorganizeAllClips();

      renderTimelineClips();
      updateTimeDisplay();

      // Update video player to show the frame at the playhead position
      // Playhead doesn't move for Out point since nothing before it changed
      syncVideoPlayerToPlayhead();

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
