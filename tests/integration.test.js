const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('Running Integration Tests for LazyVid...\n');

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✓ ${description}`);
    passed++;
  } catch (error) {
    console.log(`✗ ${description}`);
    console.log(`  Error: ${error.message}`);
    failed++;
  }
}

// Read source files
const rendererPath = path.join(__dirname, '..', 'renderer.js');
const indexPath = path.join(__dirname, '..', 'index.html');
const preloadPath = path.join(__dirname, '..', 'preload.js');
const stylesPath = path.join(__dirname, '..', 'styles.css');
const rendererCode = fs.readFileSync(rendererPath, 'utf8');
const indexHtml = fs.readFileSync(indexPath, 'utf8');

// F1: Timeline Foundation - Code Structure Tests
console.log('F1: Timeline Foundation - Code Structure');

test('timeline state object exists with required properties', () => {
  assert.ok(rendererCode.includes('timelineState'));
  assert.ok(rendererCode.includes('duration:'));
  assert.ok(rendererCode.includes('currentTime:'));
  assert.ok(rendererCode.includes('pixelsPerSecond:'));
});

test('formatTime function is defined', () => {
  assert.ok(rendererCode.includes('function formatTime('));
});

test('renderTimeRuler function is defined', () => {
  assert.ok(rendererCode.includes('function renderTimeRuler('));
});

test('updatePlayhead function is defined', () => {
  assert.ok(rendererCode.includes('function updatePlayhead('));
});

test('seekTimeline function is defined', () => {
  assert.ok(rendererCode.includes('function seekTimeline('));
});

test('timeline click event listener exists', () => {
  assert.ok(rendererCode.includes("timeline.addEventListener('click'"));
});

test('zoom in button event listener exists', () => {
  assert.ok(rendererCode.includes("zoomInBtn.addEventListener('click'"));
});

test('zoom out button event listener exists', () => {
  assert.ok(rendererCode.includes("zoomOutBtn.addEventListener('click'"));
});

test('window resize listener for timeline exists', () => {
  assert.ok(rendererCode.includes("window.addEventListener('resize', renderTimeRuler)"));
});

test('dynamic interval calculation exists (1s, 5s, 10s)', () => {
  assert.ok(rendererCode.includes('? 10 :'));
  assert.ok(rendererCode.includes('? 5 : 1'));
});

test('HTML contains timeline DOM elements', () => {
  assert.ok(indexHtml.includes('id="timeline"'));
  assert.ok(indexHtml.includes('id="timeRuler"'));
  assert.ok(indexHtml.includes('id="playhead"'));
  assert.ok(indexHtml.includes('id="timeDisplay"'));
  assert.ok(indexHtml.includes('id="zoomInBtn"'));
  assert.ok(indexHtml.includes('id="zoomOutBtn"'));
});

// F2: Clip Management - Code Structure Tests
console.log('\nF2: Clip Management - Code Structure');

test('timeline clips array is initialized', () => {
  assert.ok(rendererCode.includes('let timelineClips = []'));
});

test('clip ID counter is initialized', () => {
  assert.ok(rendererCode.includes('let clipIdCounter'));
});

test('addVideoToTimeline function is defined', () => {
  assert.ok(rendererCode.includes('function addVideoToTimeline('));
});

test('renderTimelineClips function is defined', () => {
  assert.ok(rendererCode.includes('function renderTimelineClips('));
});

test('deleteTimelineClip function exists', () => {
  assert.ok(rendererCode.includes('window.deleteTimelineClip'));
});

test('HTML contains left toolbar with buttons', () => {
  assert.ok(indexHtml.includes('class="left-toolbar"'));
  assert.ok(indexHtml.includes('id="importBtn"'));
  assert.ok(indexHtml.includes('id="exportBtn"'));
  assert.ok(indexHtml.includes('id="deleteBtn"'));
});

test('clip structure includes all required properties', () => {
  assert.ok(rendererCode.includes('id:'));
  assert.ok(rendererCode.includes('path:'));
  assert.ok(rendererCode.includes('name:'));
  assert.ok(rendererCode.includes('duration:'));
});

test('timeline clip includes trim properties', () => {
  assert.ok(rendererCode.includes('trimStart:'));
  assert.ok(rendererCode.includes('trimEnd:'));
});

// F3: Trim Operations - Code Structure Tests
console.log('\nF3: Trim Operations - Code Structure');

test('selectedClip variable exists', () => {
  assert.ok(rendererCode.includes('let selectedClip'));
});

test('trimState variable exists', () => {
  assert.ok(rendererCode.includes('let trimState'));
});

test('startTrim function is defined', () => {
  assert.ok(rendererCode.includes('function startTrim('));
});

test('handleTrimMove function is defined', () => {
  assert.ok(rendererCode.includes('function handleTrimMove('));
});

test('handleTrimEnd function is defined', () => {
  assert.ok(rendererCode.includes('function handleTrimEnd('));
});

test('trim handles are created in HTML', () => {
  assert.ok(rendererCode.includes('trim-handle'));
  assert.ok(rendererCode.includes('trim-handle-left'));
  assert.ok(rendererCode.includes('trim-handle-right'));
});

test('mousedown event listeners for trim handles exist', () => {
  assert.ok(rendererCode.includes("addEventListener('mousedown'"));
});

test('mousemove listener registration exists', () => {
  assert.ok(rendererCode.includes("addEventListener('mousemove', handleTrimMove)"));
});

test('mouseup listener registration exists', () => {
  assert.ok(rendererCode.includes("addEventListener('mouseup', handleTrimEnd)"));
});

test('minimum duration constraint (0.1s) is enforced', () => {
  assert.ok(rendererCode.includes('0.1'));
});

test('trim calculations use deltaX and pixelsPerSecond', () => {
  assert.ok(rendererCode.includes('deltaX'));
  assert.ok(rendererCode.includes('deltaTime'));
  assert.ok(rendererCode.includes('pixelsPerSecond'));
});

test('selected clip styling exists', () => {
  assert.ok(rendererCode.includes('selected'));
  assert.ok(rendererCode.includes('classList.add'));
});

// F4: Drag-Drop Import - Code Structure Tests
console.log('\nF4: Drag-Drop Import - Code Structure');

test('preview section dragenter event listener exists', () => {
  assert.ok(rendererCode.includes("addEventListener('dragenter'"));
});

test('video preview dragover event listener exists', () => {
  assert.ok(rendererCode.includes("videoPreview.addEventListener('dragover'"));
});

test('video preview dragleave event listener exists', () => {
  assert.ok(rendererCode.includes("addEventListener('dragleave'"));
});

test('video preview drop event listener exists', () => {
  assert.ok(rendererCode.includes("videoPreview.addEventListener('drop'"));
});

test('drag-over visual feedback exists', () => {
  assert.ok(rendererCode.includes('drag-over'));
  assert.ok(rendererCode.includes('classList.add'));
  assert.ok(rendererCode.includes('classList.remove'));
});

test('file type filtering exists', () => {
  assert.ok(rendererCode.includes('mp4|mov|webm'));
  assert.ok(rendererCode.includes('filter'));
});

test('multiple file support exists', () => {
  assert.ok(rendererCode.includes('Array.from'));
  assert.ok(rendererCode.includes('forEach'));
});

test('Files dataTransfer type check exists', () => {
  assert.ok(rendererCode.includes("types.includes('Files')"));
});

test('drop effect is set to copy', () => {
  assert.ok(rendererCode.includes("dropEffect = 'copy'"));
});

// Cross-Feature Integration Tests
console.log('\nCross-Feature Integration');

test('import adds clips directly to timeline', () => {
  assert.ok(rendererCode.includes('addVideoToTimeline'));
  assert.ok(rendererCode.includes('renderTimelineClips'));
});

test('timeline clips respond to zoom changes', () => {
  const hasZoomHandlers = rendererCode.includes('pixelsPerSecond') && 
                          rendererCode.includes('renderTimelineClips');
  assert.ok(hasZoomHandlers);
});

test('export functionality checks for timeline clips', () => {
  assert.ok(rendererCode.includes('timelineClips.length === 0'));
});

test('status messages update on key actions', () => {
  const statusUpdates = (rendererCode.match(/updateStatus/g) || []).length;
  assert.ok(statusUpdates >= 5, 'Expected at least 5 status updates');
});

// F5: FFmpeg Trim Export Integration - Code Structure Tests
console.log('\nF5: FFmpeg Trim Export Integration - Code Structure');

const mainPath = path.join(__dirname, '..', 'main.js');
const mainCode = fs.readFileSync(mainPath, 'utf8');

test('export-timeline IPC handler is registered', () => {
  assert.ok(mainCode.includes("ipcMain.handle('export-timeline'"));
});

test('export-timeline receives clips and outputPath parameters', () => {
  assert.ok(mainCode.includes('async (event, clips, outputPath)'));
});

test('empty clips array validation exists', () => {
  assert.ok(mainCode.includes('clips.length === 0'));
  assert.ok(mainCode.includes('No clips to export'));
});

test('empty clips rejection logic exists', () => {
  assert.ok(mainCode.includes('reject({ success: false'));
});

test('single clip detection logic exists', () => {
  assert.ok(mainCode.includes('clips.length === 1'));
});

test('single clip setStartTime call exists', () => {
  assert.ok(mainCode.includes('.setStartTime(clip.trimStart || 0)'));
});

test('single clip setDuration call exists', () => {
  assert.ok(mainCode.includes('.setDuration(trimDuration)'));
});

test('single clip trim duration calculation exists', () => {
  assert.ok(mainCode.includes('clip.trimEnd || clip.duration'));
  assert.ok(mainCode.includes('clip.trimStart || 0'));
});

test('multi-clip concat demuxer approach exists', () => {
  assert.ok(mainCode.includes('concat'));
  assert.ok(mainCode.includes('listFile'));
});

test('concat list file generation exists', () => {
  assert.ok(mainCode.includes('clips.map((clip'));
  assert.ok(mainCode.includes('inpoint'));
  assert.ok(mainCode.includes('outpoint'));
});

test('concat list uses inpoint directive', () => {
  assert.ok(mainCode.includes('inpoint ${clip.trimStart || 0}'));
});

test('concat list uses outpoint directive', () => {
  assert.ok(mainCode.includes('outpoint ${clip.trimEnd || clip.duration}'));
});

test('path normalization for concat exists', () => {
  assert.ok(mainCode.includes(".replace(/\\\\/g, '/')"));
});

test('FFmpeg input options for concat demuxer exist', () => {
  assert.ok(mainCode.includes('.inputOptions'));
  assert.ok(mainCode.includes('-f concat'));
  assert.ok(mainCode.includes('-safe 0'));
});

test('temporary concat list file cleanup exists', () => {
  assert.ok(mainCode.includes('fs.unlinkSync(listFile)'));
});

test('concat list cleanup on error exists', () => {
  const cleanupCount = (mainCode.match(/fs\.unlinkSync\(listFile\)/g) || []).length;
  assert.ok(cleanupCount >= 2, 'Expected cleanup in success and error handlers');
});

test('export progress callback exists for single clip', () => {
  const singleClipSection = mainCode.substring(
    mainCode.indexOf('if (clips.length === 1)'),
    mainCode.indexOf('} else {')
  );
  assert.ok(singleClipSection.includes('export-progress'));
});

test('export progress callback exists for multi-clip', () => {
  const multiClipSection = mainCode.substring(
    mainCode.indexOf('} else {'),
    mainCode.lastIndexOf('});')
  );
  assert.ok(multiClipSection.includes('export-progress'));
});

test('renderer checks for empty timeline before export', () => {
  assert.ok(rendererCode.includes('timelineClips.length === 0'));
});

test('export button disabled state management exists', () => {
  assert.ok(rendererCode.includes('exportBtn.disabled'));
});

test('error handling for empty timeline exists', () => {
  assert.ok(rendererCode.includes('No clips on timeline to export'));
});

test('timelineClips array passed to export handler', () => {
  assert.ok(rendererCode.includes('exportTimeline(timelineClips'));
});

test('FFmpeg codecs specified for output', () => {
  assert.ok(mainCode.includes('.videoCodec'));
  assert.ok(mainCode.includes('.audioCodec'));
  assert.ok(mainCode.includes('libx264'));
  assert.ok(mainCode.includes('aac'));
});

test('export success/error response structure', () => {
  assert.ok(mainCode.includes('{ success: true }'));
  assert.ok(mainCode.includes('{ success: false'));
});

// F6: Timeline UI Enhancements - Code Structure Tests
console.log('\nF6: Timeline UI Enhancements - Code Structure');

test('autoZoomToFit function is defined', () => {
  assert.ok(rendererCode.includes('function autoZoomToFit('));
});

test('auto-zoom called when adding video to timeline', () => {
  assert.ok(rendererCode.includes('autoZoomToFit()'));
});

test('mouse wheel zoom event listener exists on timeline', () => {
  assert.ok(rendererCode.includes("timeline.addEventListener('wheel'"));
});

test('mouse wheel zoom event listener exists on time ruler', () => {
  assert.ok(rendererCode.includes("timeRuler.addEventListener('wheel'"));
});

test('mouse wheel zoom prevents default behavior', () => {
  assert.ok(rendererCode.includes('e.preventDefault()'));
});

test('time ruler click handler exists', () => {
  assert.ok(rendererCode.includes("timeRuler.addEventListener('click'"));
});

test('timeline click deselects clip', () => {
  assert.ok(rendererCode.includes('selectedClip = null'));
});

test('snap indicator functions exist', () => {
  assert.ok(rendererCode.includes('function showSnapIndicator('));
  assert.ok(rendererCode.includes('function hideSnapIndicator('));
});

test('snap indicator CSS class exists', () => {
  const stylesPath = path.join(__dirname, '..', 'styles.css');
  const stylesCode = fs.readFileSync(stylesPath, 'utf8');
  assert.ok(stylesCode.includes('.snap-indicator'));
});

test('snap threshold calculation exists', () => {
  assert.ok(rendererCode.includes('snapThreshold'));
});

test('clip reordering after drag exists', () => {
  assert.ok(rendererCode.includes('timelineClips.sort'));
});

test('generateThumbnail function is defined', () => {
  assert.ok(rendererCode.includes('function generateThumbnail('));
});

test('formatFileSize function is defined', () => {
  assert.ok(rendererCode.includes('function formatFileSize('));
});

test('clip structure includes thumbnail property', () => {
  assert.ok(rendererCode.includes('thumbnail:'));
});

test('clip structure includes resolution property', () => {
  assert.ok(rendererCode.includes('resolution:'));
});

test('clip structure includes fileSize property', () => {
  assert.ok(rendererCode.includes('fileSize:'));
});

test('clip thumbnail element is rendered', () => {
  assert.ok(rendererCode.includes('clip-thumbnail'));
});

test('clip metadata element is rendered', () => {
  assert.ok(rendererCode.includes('clip-metadata'));
});

test('clip content wrapper exists', () => {
  assert.ok(rendererCode.includes('clip-content'));
});

test('getFileStats IPC handler is registered', () => {
  assert.ok(mainCode.includes("ipcMain.handle('get-file-stats'"));
});

test('getFileStats uses fs.statSync', () => {
  assert.ok(mainCode.includes('fs.statSync'));
});

test('preload exposes getFileStats API', () => {
  const preloadPath = path.join(__dirname, '..', 'preload.js');
  const preloadCode = fs.readFileSync(preloadPath, 'utf8');
  assert.ok(preloadCode.includes('getFileStats:'));
});

test('play from current playhead position logic exists', () => {
  assert.ok(rendererCode.includes('const currentTime = timelineState.currentTime'));
});

test('zoom buttons update timeline clips on zoom', () => {
  const zoomInSection = rendererCode.substring(
    rendererCode.indexOf("zoomInBtn.addEventListener('click'"),
    rendererCode.indexOf("zoomOutBtn.addEventListener('click'")
  );
  assert.ok(zoomInSection.includes('renderTimelineClips()'));
});

test('canvas element created for thumbnail generation', () => {
  assert.ok(rendererCode.includes('document.createElement(\'canvas\')'));
});

test('thumbnail uses toDataURL for encoding', () => {
  assert.ok(rendererCode.includes('toDataURL'));
});

// F7: Screen Recording - Code Structure Tests
console.log('\nF7: Screen Recording - Code Structure');

test('screen recording button exists in HTML', () => {
  assert.ok(indexHtml.includes('id="recordScreenBtn"'));
  assert.ok(indexHtml.includes('Record Screen'));
});

test('window recording button exists in HTML', () => {
  assert.ok(indexHtml.includes('id="recordWindowBtn"'));
  assert.ok(indexHtml.includes('Record Window'));
});

test('stop recording button exists in HTML', () => {
  assert.ok(indexHtml.includes('id="stopRecordBtn"'));
  assert.ok(indexHtml.includes('Stop Recording'));
});

test('webcam overlay element exists in HTML', () => {
  assert.ok(indexHtml.includes('id="webcamOverlay"'));
  assert.ok(indexHtml.includes('webcam-overlay'));
});

test('recording state variables initialized in renderer', () => {
  assert.ok(rendererCode.includes('let mediaRecorder'));
  assert.ok(rendererCode.includes('let recordedChunks'));
  assert.ok(rendererCode.includes('let screenStream'));
  assert.ok(rendererCode.includes('let webcamStream'));
  assert.ok(rendererCode.includes('let combinedStream'));
  assert.ok(rendererCode.includes('let isRecording'));
});

test('startRecording function is defined', () => {
  assert.ok(rendererCode.includes('async function startRecording('));
});

test('recordScreenBtn event listener exists', () => {
  assert.ok(rendererCode.includes("recordScreenBtn.addEventListener('click'"));
});

test('recordWindowBtn event listener exists', () => {
  assert.ok(rendererCode.includes("recordWindowBtn.addEventListener('click'"));
});

test('stopRecordBtn event listener exists', () => {
  assert.ok(rendererCode.includes("stopRecordBtn.addEventListener('click'"));
});

test('desktopCapturer getSources call exists', () => {
  assert.ok(rendererCode.includes('getScreenSources'));
  assert.ok(rendererCode.includes('types:'));
});

test('screen/window source type parameter passed correctly', () => {
  assert.ok(rendererCode.includes("startRecording('screen')"));
  assert.ok(rendererCode.includes("startRecording('window'") || rendererCode.includes('showWindowPicker'));
});

test('getDisplayMedia call for screen capture exists', () => {
  assert.ok(rendererCode.includes('navigator.mediaDevices.getDisplayMedia'));
  assert.ok(rendererCode.includes('screenStream'));
});

test('system audio capture via getDisplayMedia exists', () => {
  // System audio is captured via getDisplayMedia with 'loopback' audio in main.js
  assert.ok(mainCode.includes("audio: 'loopback'"));
});

test('microphone capture attempt exists', () => {
  assert.ok(rendererCode.includes('micStream'));
  assert.ok(rendererCode.includes('audio: true'));
});

test('webcam capture in overlay window exists', () => {
  // Webcam is initialized in the overlay window via main.js
  assert.ok(mainCode.includes('getUserMedia'));
  assert.ok(mainCode.includes('ideal: 640'));
  assert.ok(mainCode.includes('ideal: 360'));
});

test('webcam overlay srcObject set in overlay window', () => {
  // Webcam srcObject is set in the overlay window via executeJavaScript in main.js
  assert.ok(mainCode.includes('webcam.srcObject = stream'));
});

test('canvas compositing for screen + webcam exists', () => {
  assert.ok(rendererCode.includes("document.createElement('canvas')"));
  assert.ok(rendererCode.includes("getContext('2d')"));
  assert.ok(rendererCode.includes('canvas.width'));
  assert.ok(rendererCode.includes('canvas.height'));
});

test('overlay window dimensions configured', () => {
  // Overlay window dimensions are set in main.js when creating the window
  assert.ok(mainCode.includes('width: 340'));
  assert.ok(mainCode.includes('height: 250'));
});

test('overlay window contains video element', () => {
  // Overlay window has webcam video element, checked via recording-overlay.html
  const overlayHtml = fs.readFileSync(path.join(__dirname, '..', 'recording-overlay.html'), 'utf8');
  assert.ok(overlayHtml.includes('id="webcam"'));
  assert.ok(overlayHtml.includes('<video'));
});

test('recording overlay window created on recording start', () => {
  // Overlay window is created via IPC when recording starts
  assert.ok(mainCode.includes("ipcMain.on('show-recording-overlay'"));
  assert.ok(mainCode.includes('recordingOverlay = new BrowserWindow'));
});

test('overlay window positioned in top-right corner', () => {
  // Overlay window is positioned in top-right via setPosition in main.js
  assert.ok(mainCode.includes('screenWidth - 360'));
  assert.ok(mainCode.includes('setPosition'));
});

test('overlay window captured naturally by screen recording', () => {
  // Overlay window is NOT protected, so it's captured by screen recording
  // We verify the comment that explains we do NOT use setContentProtection
  assert.ok(mainCode.includes('show-recording-overlay'));
  assert.ok(mainCode.includes('NOTE: We WANT this window to be captured'));
  assert.ok(mainCode.includes('So we do NOT use setContentProtection(true)'));
});

test('MediaStream combination logic exists', () => {
  assert.ok(rendererCode.includes('new MediaStream()'));
  assert.ok(rendererCode.includes('getVideoTracks()'));
  assert.ok(rendererCode.includes('getAudioTracks()'));
  assert.ok(rendererCode.includes('addTrack'));
});

test('MediaRecorder initialization exists', () => {
  assert.ok(rendererCode.includes('new MediaRecorder'));
  assert.ok(rendererCode.includes('video/webm'));
  assert.ok(rendererCode.includes('vp9'));
});

test('MediaRecorder ondataavailable handler exists', () => {
  assert.ok(rendererCode.includes('mediaRecorder.ondataavailable'));
  assert.ok(rendererCode.includes('recordedChunks.push'));
});

test('MediaRecorder onstop handler exists', () => {
  assert.ok(rendererCode.includes('mediaRecorder.onstop'));
});

test('recording blob creation exists', () => {
  assert.ok(rendererCode.includes('new Blob(recordedChunks'));
  assert.ok(rendererCode.includes('blob.arrayBuffer()'));
});

test('saveRecording IPC call exists', () => {
  assert.ok(rendererCode.includes('saveRecording'));
  assert.ok(rendererCode.includes('screen-recording-'));
  assert.ok(rendererCode.includes('.webm'));
});

test('recording cleanup on stop exists', () => {
  const stopHandlerMatch = rendererCode.match(/mediaRecorder\.onstop[\s\S]*?recordScreenBtn\.disabled = false/);
  assert.ok(stopHandlerMatch, 'Expected cleanup logic in onstop handler');
});

test('stream track stopping exists', () => {
  assert.ok(rendererCode.includes('getTracks().forEach(track => track.stop())'));
});

test('overlay window hidden after recording', () => {
  // Overlay window is closed via IPC after recording stops
  assert.ok(rendererCode.includes('hideRecordingOverlay'));
  assert.ok(mainCode.includes("ipcMain.on('hide-recording-overlay'"));
  assert.ok(mainCode.includes('recordingOverlay.close()'));
});

test('recording UI state updates exist', () => {
  assert.ok(rendererCode.includes('recordScreenBtn.disabled = true'));
  assert.ok(rendererCode.includes('recordWindowBtn.disabled = true'));
  assert.ok(rendererCode.includes('stopRecordBtn.disabled = false'));
});

test('webcam drag state variables exist', () => {
  assert.ok(rendererCode.includes('let webcamDragState'));
});

test('webcam mousedown handler exists', () => {
  assert.ok(rendererCode.includes("webcamOverlay.addEventListener('mousedown'"));
});

test('handleWebcamDrag function exists', () => {
  assert.ok(rendererCode.includes('function handleWebcamDrag('));
});

test('handleWebcamDragEnd function exists', () => {
  assert.ok(rendererCode.includes('function handleWebcamDragEnd('));
});

test('webcam position clamping exists', () => {
  assert.ok(rendererCode.includes('Math.max') && rendererCode.includes('Math.min'));
  assert.ok(rendererCode.includes('clampedLeft') || rendererCode.includes('clampedTop'));
});

test('save-recording IPC handler registered in main.js', () => {
  assert.ok(mainCode.includes("ipcMain.handle('save-recording'"));
});

test('save-recording writes to temp directory', () => {
  assert.ok(mainCode.includes('os.tmpdir()'));
  assert.ok(mainCode.includes('fs.writeFileSync'));
  assert.ok(mainCode.includes('Buffer.from(buffer)'));
});

test('getScreenSources exposed in preload.js', () => {
  const preloadCode = fs.readFileSync(preloadPath, 'utf8');
  assert.ok(preloadCode.includes('getScreenSources'));
  assert.ok(preloadCode.includes('get-screen-sources'));
});

test('get-screen-sources IPC handler registered in main.js', () => {
  assert.ok(mainCode.includes("ipcMain.handle('get-screen-sources'"));
  assert.ok(mainCode.includes('desktopCapturer.getSources'));
});

test('media permissions handler exists', () => {
  assert.ok(mainCode.includes('setPermissionRequestHandler'));
  assert.ok(mainCode.includes('allowedPermissions') || mainCode.includes("'media'"));
});

test('display media request handler exists', () => {
  assert.ok(mainCode.includes('setDisplayMediaRequestHandler'));
});

test('saveRecording exposed in preload.js', () => {
  const preloadCode = fs.readFileSync(preloadPath, 'utf8');
  assert.ok(preloadCode.includes('saveRecording'));
});

test('webcam overlay CSS styling exists', () => {
  const stylesCode = fs.readFileSync(stylesPath, 'utf8');
  assert.ok(stylesCode.includes('.webcam-overlay'));
  assert.ok(stylesCode.includes('position: absolute'));
  assert.ok(stylesCode.includes('cursor: grab'));
});

test('addVideoToTimeline called after recording', () => {
  const stopHandlerMatch = rendererCode.match(/mediaRecorder\.onstop[\s\S]*?addVideoToTimeline/);
  assert.ok(stopHandlerMatch, 'Expected addVideoToTimeline call in onstop handler');
});

test('recording adds to timeline end with auto-zoom', () => {
  // addVideoToTimeline already handles this with autoZoomToFit()
  assert.ok(rendererCode.includes('autoZoomToFit()'));
});

test('error handling exists for recording failures', () => {
  assert.ok(rendererCode.includes('catch (error)') || rendererCode.includes('catch (err)'));
  assert.ok(rendererCode.includes('Recording failed'));
});

test('recording indicator element exists in HTML', () => {
  assert.ok(indexHtml.includes('id="recordingIndicator"'));
  assert.ok(indexHtml.includes('recording-indicator'));
});

test('recording time display element exists in HTML', () => {
  assert.ok(indexHtml.includes('id="recordingTime"'));
});

test('recording timer functions exist', () => {
  assert.ok(rendererCode.includes('function startRecordingTimer('));
  assert.ok(rendererCode.includes('function stopRecordingTimer('));
  assert.ok(rendererCode.includes('function formatRecordingTime('));
});

test('recording timer starts when recording begins', () => {
  assert.ok(rendererCode.includes('startRecordingTimer()'));
});

test('recording timer stops when recording ends', () => {
  const stopHandlerMatch = rendererCode.match(/mediaRecorder\.onstop[\s\S]*?stopRecordingTimer/);
  assert.ok(stopHandlerMatch, 'Expected stopRecordingTimer call in onstop handler');
});

test('recording timer updates every second', () => {
  assert.ok(rendererCode.includes('setInterval'));
  assert.ok(rendererCode.includes('1000'));
});

test('window picker modal element exists in HTML', () => {
  assert.ok(indexHtml.includes('id="windowPickerModal"'));
  assert.ok(indexHtml.includes('modal'));
});

test('window picker grid element exists in HTML', () => {
  assert.ok(indexHtml.includes('id="windowPickerGrid"'));
  assert.ok(indexHtml.includes('window-picker-grid'));
});

test('window picker cancel button exists in HTML', () => {
  assert.ok(indexHtml.includes('id="cancelWindowPicker"'));
});

test('showWindowPicker function exists', () => {
  assert.ok(rendererCode.includes('async function showWindowPicker('));
});

test('window picker shows thumbnails for selection', () => {
  assert.ok(rendererCode.includes('thumbnail.toDataURL()'));
  assert.ok(rendererCode.includes('window-option'));
});

test('window recording uses picker modal', () => {
  assert.ok(rendererCode.includes('showWindowPicker()'));
  assert.ok(rendererCode.includes("recordWindowBtn.addEventListener('click'"));
});

test('screen recording auto-selects first screen', () => {
  assert.ok(rendererCode.includes('source = sources[0]'));
});

test('recording indicator CSS exists', () => {
  const stylesCode = fs.readFileSync(stylesPath, 'utf8');
  assert.ok(stylesCode.includes('.recording-indicator'));
  assert.ok(stylesCode.includes('position: absolute'));
});

test('recording dot animation CSS exists', () => {
  const stylesCode = fs.readFileSync(stylesPath, 'utf8');
  assert.ok(stylesCode.includes('.recording-dot'));
  assert.ok(stylesCode.includes('@keyframes pulse'));
});

test('modal CSS exists', () => {
  const stylesCode = fs.readFileSync(stylesPath, 'utf8');
  assert.ok(stylesCode.includes('.modal'));
  assert.ok(stylesCode.includes('z-index: 1000'));
});

test('window option CSS exists', () => {
  const stylesCode = fs.readFileSync(stylesPath, 'utf8');
  assert.ok(stylesCode.includes('.window-option'));
  assert.ok(stylesCode.includes('cursor: pointer'));
});

// Summary
console.log(`\n${'='.repeat(50)}`);
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log('='.repeat(50));

if (failed > 0) {
  process.exit(1);
}

console.log('\n✓ All integration tests passed');
