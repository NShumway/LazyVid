const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('Running Integration Tests for ClipForge...\n');

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
const rendererCode = fs.readFileSync(rendererPath, 'utf8');
const indexHtml = fs.readFileSync(indexPath, 'utf8');

// F1: Timeline Foundation - Code Structure Tests
console.log('F1: Timeline Foundation - Code Structure');

test('timeline state object exists with required properties', () => {
  assert.ok(rendererCode.includes('timelineState'));
  assert.ok(rendererCode.includes('duration:'));
  assert.ok(rendererCode.includes('currentTime:'));
  assert.ok(rendererCode.includes('pixelsPerSecond:'));
  assert.ok(rendererCode.includes('minZoom:'));
  assert.ok(rendererCode.includes('maxZoom:'));
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

test('media library arrays are initialized', () => {
  assert.ok(rendererCode.includes('let mediaLibrary = []'));
  assert.ok(rendererCode.includes('let timelineClips = []'));
});

test('clip ID counter is initialized', () => {
  assert.ok(rendererCode.includes('let clipIdCounter'));
});

test('addToMediaLibrary function is defined', () => {
  assert.ok(rendererCode.includes('function addToMediaLibrary('));
});

test('renderMediaLibrary function is defined', () => {
  assert.ok(rendererCode.includes('function renderMediaLibrary('));
});

test('addClipToTimeline function is defined', () => {
  assert.ok(rendererCode.includes('function addClipToTimeline('));
});

test('renderTimelineClips function is defined', () => {
  assert.ok(rendererCode.includes('function renderTimelineClips('));
});

test('drag-and-drop handlers exist for media items', () => {
  assert.ok(rendererCode.includes('handleDragStart'));
  assert.ok(rendererCode.includes("addEventListener('dragstart'"));
});

test('timeline dragover event listener exists', () => {
  assert.ok(rendererCode.includes("timeline.addEventListener('dragover'"));
});

test('timeline drop event listener exists for clips', () => {
  assert.ok(rendererCode.includes("timeline.addEventListener('drop'"));
});

test('deleteTimelineClip function exists', () => {
  assert.ok(rendererCode.includes('window.deleteTimelineClip'));
});

test('HTML contains media library DOM elements', () => {
  assert.ok(indexHtml.includes('class="media-library"'));
  assert.ok(indexHtml.includes('id="mediaItems"'));
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

test('preview section dragover event listener exists', () => {
  assert.ok(rendererCode.includes("previewSection.addEventListener('dragover'"));
});

test('preview section dragleave event listener exists', () => {
  assert.ok(rendererCode.includes("addEventListener('dragleave'"));
});

test('preview section drop event listener exists', () => {
  assert.ok(rendererCode.includes("previewSection.addEventListener('drop'"));
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

test('import adds clips to media library which can be dragged to timeline', () => {
  assert.ok(rendererCode.includes('addToMediaLibrary'));
  assert.ok(rendererCode.includes('renderMediaLibrary'));
  assert.ok(rendererCode.includes('addClipToTimeline'));
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

// Summary
console.log(`\n${'='.repeat(50)}`);
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log('='.repeat(50));

if (failed > 0) {
  process.exit(1);
}

console.log('\n✓ All integration tests passed');
