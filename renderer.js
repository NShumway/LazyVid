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

async function addVideoToTimeline(videoPath, overrideDuration = null) {
  console.log('[addVideoToTimeline] Path:', videoPath);
  console.log('[addVideoToTimeline] Override duration:', overrideDuration);
  const fileName = videoPath.split('\\').pop().split('/').pop();

  // Create temp video to get duration and metadata
  const tempVideo = document.createElement('video');
  // Convert Windows path to file URL format
  const fileUrl = videoPath.startsWith('file://') ? videoPath : `file:///${videoPath.replace(/\\/g, '/')}`;
  console.log('[addVideoToTimeline] File URL:', fileUrl);

  tempVideo.preload = 'metadata';
  tempVideo.src = fileUrl;

  // Add timeout in case metadata never loads
  const metadataTimeout = setTimeout(() => {
    console.error('[addVideoToTimeline] Metadata loading timed out');
    updateStatus(`Failed to load video metadata: ${fileName}`, true);
  }, 10000);

  tempVideo.addEventListener('loadedmetadata', async () => {
    clearTimeout(metadataTimeout);
    console.log('[addVideoToTimeline] Metadata loaded, duration:', tempVideo.duration);

    // Use override duration if provided (for WebM files with Infinity duration)
    let duration = tempVideo.duration;
    if (overrideDuration !== null && (isNaN(duration) || !isFinite(duration) || duration === 0)) {
      console.log('[addVideoToTimeline] Using override duration:', overrideDuration);
      duration = overrideDuration;
    }
    const resolution = { width: tempVideo.videoWidth, height: tempVideo.videoHeight };
    const resolutionDisplay = `${tempVideo.videoWidth}x${tempVideo.videoHeight}`;

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
      resolutionDisplay: resolutionDisplay,
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
      videoPlayer.src = fileUrl;
      videoPlayer.currentTime = 0;
    }

    updateStatus(`Added to timeline: ${fileName}`);
  });

  tempVideo.addEventListener('error', (e) => {
    clearTimeout(metadataTimeout);
    console.error('[addVideoToTimeline] Error loading video:', e, tempVideo.error);
    if (tempVideo.error) {
      console.error('[addVideoToTimeline] Error code:', tempVideo.error.code);
      console.error('[addVideoToTimeline] Error message:', tempVideo.error.message);
    }
    updateStatus(`Failed to load video: ${fileName}`, true);
  });

  // Force load
  tempVideo.load();
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

  // Show export resolution modal
  showExportResolutionModal();
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
    const metadataHtml = clip.resolutionDisplay && clip.fileSize
      ? `<div class="clip-metadata">
           <span>${formatTime(visibleDuration)}</span>
           <span>${clip.resolutionDisplay}</span>
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
    resolutionDisplay: clip.resolutionDisplay,
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

// Screen Recording
const recordScreenBtn = document.getElementById('recordScreenBtn');
const recordWindowBtn = document.getElementById('recordWindowBtn');
const stopRecordBtn = document.getElementById('stopRecordBtn');
const webcamOverlay = document.getElementById('webcamOverlay');
const recordingIndicator = document.getElementById('recordingIndicator');
const recordingTime = document.getElementById('recordingTime');
const windowPickerModal = document.getElementById('windowPickerModal');
const windowPickerGrid = document.getElementById('windowPickerGrid');
const cancelWindowPicker = document.getElementById('cancelWindowPicker');

let mediaRecorder = null;
let recordedChunks = [];
let screenStream = null;
let webcamStream = null;
let combinedStream = null;
let isRecording = false;
let recordingStartTime = null;
let recordingTimerInterval = null;

// Webcam overlay dragging
let webcamDragState = null;

webcamOverlay.addEventListener('mousedown', (e) => {
  e.preventDefault();
  e.stopPropagation();

  const rect = webcamOverlay.getBoundingClientRect();
  webcamDragState = {
    startX: e.clientX,
    startY: e.clientY,
    initialLeft: rect.left,
    initialTop: rect.top
  };

  document.addEventListener('mousemove', handleWebcamDrag);
  document.addEventListener('mouseup', handleWebcamDragEnd);
});

function handleWebcamDrag(e) {
  if (!webcamDragState) return;

  const deltaX = e.clientX - webcamDragState.startX;
  const deltaY = e.clientY - webcamDragState.startY;

  const newLeft = webcamDragState.initialLeft + deltaX;
  const newTop = webcamDragState.initialTop + deltaY;

  const previewRect = videoPreview.getBoundingClientRect();
  const webcamRect = webcamOverlay.getBoundingClientRect();

  // Constrain to video preview bounds
  const clampedLeft = Math.max(0, Math.min(newLeft - previewRect.left, previewRect.width - webcamRect.width));
  const clampedTop = Math.max(0, Math.min(newTop - previewRect.top, previewRect.height - webcamRect.height));

  webcamOverlay.style.left = `${clampedLeft}px`;
  webcamOverlay.style.top = `${clampedTop}px`;
  webcamOverlay.style.right = 'auto';
}

function handleWebcamDragEnd() {
  webcamDragState = null;
  document.removeEventListener('mousemove', handleWebcamDrag);
  document.removeEventListener('mouseup', handleWebcamDragEnd);
}

function formatRecordingTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function startRecordingTimer() {
  recordingStartTime = Date.now();

  // Show overlay window instead of in-app indicator
  window.electronAPI.showRecordingOverlay();
  window.electronAPI.updateRecordingTime('00:00');

  recordingTimerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
    const timeString = formatRecordingTime(elapsed);
    window.electronAPI.updateRecordingTime(timeString);
  }, 1000);
}

function stopRecordingTimer() {
  if (recordingTimerInterval) {
    clearInterval(recordingTimerInterval);
    recordingTimerInterval = null;
  }

  // Hide overlay window
  window.electronAPI.hideRecordingOverlay();
  recordingStartTime = null;
}

async function showWindowPicker() {
  return new Promise(async (resolve, reject) => {
    try {
      // Get available windows
      const sources = await window.electronAPI.getScreenSources({
        types: ['window'],
        thumbnailSize: { width: 200, height: 150 }
      });

      if (sources.length === 0) {
        updateStatus('No windows available to record', true);
        reject(new Error('No windows available'));
        return;
      }

      // Clear previous options
      windowPickerGrid.innerHTML = '';

      // Create window options
      sources.forEach(source => {
        const option = document.createElement('div');
        option.className = 'window-option';
        option.innerHTML = `
          <img src="${source.thumbnail.toDataURL()}" alt="${source.name}" />
          <span>${source.name}</span>
        `;
        option.addEventListener('click', () => {
          windowPickerModal.style.display = 'none';
          resolve(source);
        });
        windowPickerGrid.appendChild(option);
      });

      // Show modal
      windowPickerModal.style.display = 'flex';

      // Handle cancel
      const handleCancel = () => {
        windowPickerModal.style.display = 'none';
        cancelWindowPicker.removeEventListener('click', handleCancel);
        reject(new Error('User cancelled'));
      };
      cancelWindowPicker.addEventListener('click', handleCancel);
    } catch (error) {
      reject(error);
    }
  });
}

// Export Resolution Modal
function showExportResolutionModal() {
  return new Promise((resolve, reject) => {
    const modal = document.getElementById('exportResolutionModal');
    const confirmBtn = document.getElementById('confirmExport');
    const cancelBtn = document.getElementById('cancelExport');

    // Show modal
    modal.style.display = 'flex';

    const handleConfirm = async () => {
      const selectedResolution = document.querySelector('input[name="resolution"]:checked').value;
      modal.style.display = 'none';

      // Remove event listeners
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);

      // Start export process with selected resolution
      await performExport(selectedResolution);
    };

    const handleCancel = () => {
      modal.style.display = 'none';
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
    };

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
  });
}

async function performExport(resolution) {
  const outputPath = await window.electronAPI.saveDialog('exported-video.mp4');

  if (!outputPath) {
    return;
  }

  // Disable buttons during export
  exportBtn.disabled = true;
  importBtn.disabled = true;

  // Show progress bar, hide time display
  timeDisplay.style.display = 'none';
  progressBar.style.display = 'block';
  progressFill.style.width = '0%';
  progressText.textContent = '0%';

  updateStatus('Exporting video...');
  console.log('[Export] Starting export, progress bar visible');

  // Set up progress listener (this automatically removes old listeners)
  window.electronAPI.onExportProgress((percent) => {
    const rounded = Math.round(percent);
    progressFill.style.width = `${rounded}%`;
    progressText.textContent = `${rounded}%`;
  });

  try {
    const result = await window.electronAPI.exportTimeline(timelineClips, outputPath, resolution);

    console.log('[Export] Export completed, result:', JSON.stringify(result, null, 2));
    // Show 100% completion
    progressFill.style.width = '100%';
    progressText.textContent = '100%';

    if (result.success) {
      updateStatus(`Video exported successfully to: ${outputPath.split('\\').pop()}`);

      // Wait 5 seconds with progress bar visible at 100%
      console.log('[Export] Waiting 5 seconds...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log('[Export] 5 seconds complete');
    } else {
      console.log('[Export] Export result.success is false, not waiting');
      console.log('[Export] Result error:', result.error);

      // Show user-friendly error message
      const errorMsg = result.error || 'Unknown error occurred';
      updateStatus(`Export failed: ${errorMsg}`, true);
      alert(`Export Failed\n\nThe video export failed with the following error:\n\n${errorMsg}\n\nPlease check the console (Ctrl+Shift+I) for more details.`);
    }

  } catch (error) {
    console.error('[Export] Export failed with exception');
    console.error('[Export] Error object:', error);
    console.error('[Export] Error message:', error.message);
    console.error('[Export] Error stack:', error.stack);
    // Try to extract the actual error from Electron IPC
    if (error.message && error.message.includes('[object Object]')) {
      console.error('[Export] Raw error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    }

    // Show user-friendly error message
    let userMessage = 'An unexpected error occurred during export.';
    if (error.message) {
      if (error.message.includes('ENOENT')) {
        userMessage = 'FFmpeg executable not found. The application may not be installed correctly.';
      } else if (error.message.includes('EACCES')) {
        userMessage = 'Permission denied. Please check file permissions and try again.';
      } else if (error.message.includes('ENOSPC')) {
        userMessage = 'Not enough disk space to complete the export.';
      } else {
        userMessage = error.message;
      }
    }

    updateStatus(`Export failed: ${userMessage}`, true);
    alert(`Export Failed\n\n${userMessage}\n\nPlease check the console (Ctrl+Shift+I) for technical details.`);
  }

  // Clean up
  console.log('[Export] Cleaning up UI');
  window.electronAPI.removeExportProgressListeners();
  exportBtn.disabled = false;
  importBtn.disabled = false;
  progressBar.style.display = 'none';
  progressFill.style.width = '0%';
  progressText.textContent = '0%';
  timeDisplay.style.display = 'block';
  console.log('[Export] Cleanup complete');
}

async function startRecording(sourceType, selectedSource = null) {
  try {
    updateStatus(`Selecting ${sourceType === 'screen' ? 'screen' : 'window'}...`);

    let source;

    if (selectedSource) {
      source = selectedSource;
    } else {
      // Get available sources
      const sources = await window.electronAPI.getScreenSources({
        types: [sourceType]
      });

      if (sources.length === 0) {
        updateStatus(`No ${sourceType} available to record`, true);
        return;
      }

      // For screen recording, auto-select first screen
      source = sources[0];
    }

    updateStatus(`Starting recording: ${source.name}`);

    // Notify main process about selected source (so it can be used in setDisplayMediaRequestHandler)
    window.electronAPI.setSelectedSource(source.id);

    // Get screen/window stream
    // Electron 28+ requires getDisplayMedia instead of getUserMedia with chromeMediaSource
    // Use only max constraints to let browser use native screen resolution
    screenStream = await navigator.mediaDevices.getDisplayMedia({
      audio: false,
      video: {
        frameRate: { ideal: 30 }
      }
    });

    // Log actual captured resolution
    const videoTrack = screenStream.getVideoTracks()[0];
    const settings = videoTrack.getSettings();
    console.log('[Recording] Captured resolution:', settings.width, 'x', settings.height);

    // Get microphone audio
    let micStream = null;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });
    } catch (err) {
      console.log('Microphone not available:', err);
    }

    // Webcam is now shown in the overlay window, which will be captured by screen recording
    // No need to composite it here

    // Combine video from screen with audio tracks
    combinedStream = new MediaStream();

    // Add video track from screen
    screenStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));

    // Add screen audio tracks if available
    screenStream.getAudioTracks().forEach(track => combinedStream.addTrack(track));

    // Add microphone audio if available
    if (micStream) {
      micStream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
    }

    // Create MediaRecorder
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType: 'video/webm;codecs=vp9'
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    mediaRecorder.onstop = async () => {
      updateStatus('Processing recording...');

      // Calculate actual recording duration in seconds
      const recordingDuration = recordingStartTime ? Math.floor((Date.now() - recordingStartTime) / 1000) : 0;
      console.log('[Recording] Duration:', recordingDuration, 'seconds');

      // Stop recording timer
      stopRecordingTimer();

      // Create blob from recorded chunks
      const blob = new Blob(recordedChunks, { type: 'video/webm' });

      // Convert blob to array buffer
      const arrayBuffer = await blob.arrayBuffer();

      // Save to temp file
      const fileName = `screen-recording-${Date.now()}.webm`;
      const filePath = await window.electronAPI.saveRecording(arrayBuffer, fileName);

      updateStatus('Recording saved, adding to timeline...');

      // Add to timeline with known duration
      addVideoToTimeline(filePath, recordingDuration);

      // Cleanup
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        screenStream = null;
      }
      if (combinedStream) {
        combinedStream.getTracks().forEach(track => track.stop());
        combinedStream = null;
      }
      // Webcam is in overlay window - it will be cleaned up when overlay closes

      isRecording = false;
      recordScreenBtn.disabled = false;
      recordWindowBtn.disabled = false;
      stopRecordBtn.disabled = true;
      stopRecordBtn.style.display = 'none';
      recordScreenBtn.style.display = 'flex';
      recordWindowBtn.style.display = 'flex';

      updateStatus('Recording added to timeline!');
    };

    // Start recording
    mediaRecorder.start(1000); // Collect data every second
    isRecording = true;

    // Start recording timer
    startRecordingTimer();

    // Update UI
    recordScreenBtn.disabled = true;
    recordWindowBtn.disabled = true;
    recordScreenBtn.style.display = 'none';
    recordWindowBtn.style.display = 'none';
    stopRecordBtn.disabled = false;
    stopRecordBtn.style.display = 'flex';

    updateStatus('Recording... Click stop button when done');
  } catch (error) {
    updateStatus(`Recording failed: ${error.message}`, true);
    console.error('Recording error:', error);

    // Cleanup on error
    if (screenStream) screenStream.getTracks().forEach(track => track.stop());
    if (combinedStream) combinedStream.getTracks().forEach(track => track.stop());

    // Stop timer and hide overlay
    stopRecordingTimer();

    isRecording = false;
    recordScreenBtn.disabled = false;
    recordWindowBtn.disabled = false;
    stopRecordBtn.disabled = true;
    stopRecordBtn.style.display = 'none';
    recordScreenBtn.style.display = 'flex';
    recordWindowBtn.style.display = 'flex';
  }
}

recordScreenBtn.addEventListener('click', () => {
  startRecording('screen');
});

recordWindowBtn.addEventListener('click', async () => {
  try {
    const selectedWindow = await showWindowPicker();
    startRecording('window', selectedWindow);
  } catch (error) {
    if (error.message !== 'User cancelled') {
      updateStatus(`Window selection failed: ${error.message}`, true);
    }
  }
});

stopRecordBtn.addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    updateStatus('Stopping recording...');
  }
});

// Listen for stop recording request from overlay window
window.electronAPI.onStopRecordingRequested(() => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    updateStatus('Stopping recording...');
  }
});
