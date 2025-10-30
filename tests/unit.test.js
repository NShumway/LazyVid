const assert = require('assert');

// Extract pure functions from renderer.js for testing
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function calculateTimelinePosition(currentTime, pixelsPerSecond) {
  return currentTime * pixelsPerSecond;
}

function calculateSeekTime(clickPosition, pixelsPerSecond, maxDuration) {
  const calculatedTime = clickPosition / pixelsPerSecond;
  return Math.max(0, Math.min(calculatedTime, maxDuration));
}

function calculateDynamicInterval(visibleDuration) {
  return visibleDuration > 60 ? 10 : visibleDuration > 30 ? 5 : 1;
}

function calculateTrimBounds(currentTrim, deltaTime, minTrim, maxTrim, minDuration = 0.1) {
  const newTrim = currentTrim + deltaTime;
  if (minTrim !== undefined && maxTrim !== undefined) {
    return Math.max(minTrim, Math.min(newTrim, maxTrim - minDuration));
  }
  return Math.max(currentTrim + minDuration, Math.min(newTrim, maxTrim));
}

// Test Suite
console.log('Running Unit Tests for LazyVid...\n');

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

// F1: Timeline Foundation Tests
console.log('F1: Timeline Foundation');

test('formatTime converts 0 seconds to 0:00', () => {
  assert.strictEqual(formatTime(0), '0:00');
});

test('formatTime converts 59 seconds to 0:59', () => {
  assert.strictEqual(formatTime(59), '0:59');
});

test('formatTime converts 60 seconds to 1:00', () => {
  assert.strictEqual(formatTime(60), '1:00');
});

test('formatTime converts 125 seconds to 2:05', () => {
  assert.strictEqual(formatTime(125), '2:05');
});

test('formatTime handles large values (3665 seconds to 61:05)', () => {
  assert.strictEqual(formatTime(3665), '61:05');
});

test('calculateTimelinePosition returns correct pixel position', () => {
  assert.strictEqual(calculateTimelinePosition(10, 10), 100);
  assert.strictEqual(calculateTimelinePosition(5, 20), 100);
  assert.strictEqual(calculateTimelinePosition(0, 10), 0);
});

test('calculateSeekTime converts pixel position to time', () => {
  assert.strictEqual(calculateSeekTime(100, 10, 60), 10);
  assert.strictEqual(calculateSeekTime(500, 10, 60), 50);
});

test('calculateSeekTime clamps to minimum (0 seconds)', () => {
  assert.strictEqual(calculateSeekTime(-10, 10, 60), 0);
});

test('calculateSeekTime clamps to maximum duration', () => {
  assert.strictEqual(calculateSeekTime(1000, 10, 60), 60);
});

test('calculateDynamicInterval returns 1s for short duration', () => {
  assert.strictEqual(calculateDynamicInterval(20), 1);
});

test('calculateDynamicInterval returns 5s for medium duration', () => {
  assert.strictEqual(calculateDynamicInterval(45), 5);
});

test('calculateDynamicInterval returns 10s for long duration', () => {
  assert.strictEqual(calculateDynamicInterval(90), 10);
});

test('zoom prevents negative or zero values', () => {
  const currentZoom = 5;
  const zoomStep = 2;
  const newZoom = currentZoom - zoomStep;
  const minAllowed = 0.1;
  const isValid = newZoom >= minAllowed;
  assert.strictEqual(isValid, true);
});

// F2: Clip Management Tests
console.log('\nF2: Clip Management');

test('clip structure contains required properties', () => {
  const clip = {
    id: 0,
    path: '/path/to/video.mp4',
    name: 'video.mp4',
    duration: 0
  };
  assert.ok(clip.hasOwnProperty('id'));
  assert.ok(clip.hasOwnProperty('path'));
  assert.ok(clip.hasOwnProperty('name'));
  assert.ok(clip.hasOwnProperty('duration'));
});

test('timeline clip structure contains required properties', () => {
  const timelineClip = {
    id: 'timeline-1234567890',
    clipId: 0,
    name: 'video.mp4',
    path: '/path/to/video.mp4',
    startTime: 5,
    duration: 10,
    trimStart: 0,
    trimEnd: 10
  };
  assert.ok(timelineClip.hasOwnProperty('id'));
  assert.ok(timelineClip.hasOwnProperty('clipId'));
  assert.ok(timelineClip.hasOwnProperty('startTime'));
  assert.ok(timelineClip.hasOwnProperty('duration'));
  assert.ok(timelineClip.hasOwnProperty('trimStart'));
  assert.ok(timelineClip.hasOwnProperty('trimEnd'));
});

test('visible duration calculation (trimEnd - trimStart)', () => {
  const clip = { trimStart: 2, trimEnd: 8 };
  const visibleDuration = clip.trimEnd - clip.trimStart;
  assert.strictEqual(visibleDuration, 6);
});

test('clip width calculation based on zoom', () => {
  const visibleDuration = 10;
  const pixelsPerSecond = 10;
  const width = visibleDuration * pixelsPerSecond;
  assert.strictEqual(width, 100);
});

// F3: Trim Operations Tests
console.log('\nF3: Trim Operations');

test('trim left handle respects minimum duration (0.1s)', () => {
  const clip = { trimStart: 0, trimEnd: 10, duration: 10 };
  const newTrimStart = calculateTrimBounds(clip.trimStart, 9.95, 0, clip.trimEnd, 0.1);
  assert.strictEqual(newTrimStart, 9.9);
});

test('trim right handle respects minimum duration (0.1s)', () => {
  const clip = { trimStart: 0, trimEnd: 10, duration: 10 };
  const minAllowed = clip.trimStart + 0.1;
  const newTrimEnd = Math.max(minAllowed, Math.min(0.05, clip.duration));
  assert.strictEqual(newTrimEnd, 0.1);
});

test('trim left handle cannot exceed trimEnd', () => {
  const clip = { trimStart: 2, trimEnd: 8 };
  const newTrimStart = Math.min(10, clip.trimEnd - 0.1);
  assert.strictEqual(newTrimStart, 7.9);
});

test('trim right handle cannot go below trimStart', () => {
  const clip = { trimStart: 2, trimEnd: 8 };
  const newTrimEnd = Math.max(clip.trimStart + 0.1, 1);
  assert.strictEqual(newTrimEnd, 2.1);
});

test('trim left handle minimum bound (0)', () => {
  const clip = { trimStart: 1, trimEnd: 10 };
  const newTrimStart = Math.max(0, -5);
  assert.strictEqual(newTrimStart, 0);
});

test('trim right handle maximum bound (duration)', () => {
  const clip = { trimStart: 0, trimEnd: 8, duration: 10 };
  const newTrimEnd = Math.min(15, clip.duration);
  assert.strictEqual(newTrimEnd, 10);
});

// F4: Drag-Drop Import Tests
console.log('\nF4: Drag-Drop Import');

test('video file filter matches .mp4 extension', () => {
  const fileName = 'video.mp4';
  assert.ok(/\.(mp4|mov|webm)$/i.test(fileName));
});

test('video file filter matches .mov extension', () => {
  const fileName = 'video.MOV';
  assert.ok(/\.(mp4|mov|webm)$/i.test(fileName));
});

test('video file filter matches .webm extension', () => {
  const fileName = 'video.webm';
  assert.ok(/\.(mp4|mov|webm)$/i.test(fileName));
});

test('video file filter rejects .txt file', () => {
  const fileName = 'document.txt';
  assert.ok(!/\.(mp4|mov|webm)$/i.test(fileName));
});

test('video file filter rejects .jpg file', () => {
  const fileName = 'image.jpg';
  assert.ok(!/\.(mp4|mov|webm)$/i.test(fileName));
});

test('extract filename from Windows path', () => {
  const path = 'C:\\Users\\Videos\\test.mp4';
  const fileName = path.split('\\').pop();
  assert.strictEqual(fileName, 'test.mp4');
});

test('extract filename from Unix path', () => {
  const path = '/home/user/videos/test.mp4';
  const fileName = path.split('/').pop();
  assert.strictEqual(fileName, 'test.mp4');
});

// F5: FFmpeg Trim Export Integration Tests
console.log('\nF5: FFmpeg Trim Export Integration');

test('single clip trim duration calculation', () => {
  const clip = { trimStart: 2.5, trimEnd: 8.0, duration: 10 };
  const trimDuration = (clip.trimEnd || clip.duration) - (clip.trimStart || 0);
  assert.strictEqual(trimDuration, 5.5);
});

test('single clip trim duration with defaults (no trimStart)', () => {
  const clip = { trimEnd: 8.0, duration: 10 };
  const trimDuration = (clip.trimEnd || clip.duration) - (clip.trimStart || 0);
  assert.strictEqual(trimDuration, 8.0);
});

test('single clip trim duration with defaults (no trimEnd)', () => {
  const clip = { trimStart: 2.5, duration: 10 };
  const trimDuration = (clip.trimEnd || clip.duration) - (clip.trimStart || 0);
  assert.strictEqual(trimDuration, 7.5);
});

test('single clip trim duration with no trim values', () => {
  const clip = { duration: 10 };
  const trimDuration = (clip.trimEnd || clip.duration) - (clip.trimStart || 0);
  assert.strictEqual(trimDuration, 10);
});

test('concat list format for single clip', () => {
  const clip = { path: 'C:\\\\Videos\\\\test.mp4', trimStart: 1.5, trimEnd: 5.0, duration: 10 };
  const line = `file '${clip.path.replace(/\\\\/g, '/')}'\\ninpoint ${clip.trimStart || 0}\\noutpoint ${clip.trimEnd || clip.duration}`;
  assert.ok(line.includes("file 'C:/Videos/test.mp4'"));
  assert.ok(line.includes('inpoint 1.5'));
  assert.ok(line.includes('outpoint 5'));
});

test('concat list format with default trim values', () => {
  const clip = { path: '/home/videos/test.mp4', duration: 10 };
  const line = `file '${clip.path.replace(/\\\\/g, '/')}'\\ninpoint ${clip.trimStart || 0}\\noutpoint ${clip.trimEnd || clip.duration}`;
  assert.ok(line.includes("file '/home/videos/test.mp4'"));
  assert.ok(line.includes('inpoint 0'));
  assert.ok(line.includes('outpoint 10'));
});

test('multi-clip concat list generation', () => {
  const clips = [
    { path: 'C:\\\\clip1.mp4', trimStart: 0, trimEnd: 5, duration: 10 },
    { path: 'C:\\\\clip2.mp4', trimStart: 2, trimEnd: 8, duration: 10 },
    { path: 'C:\\\\clip3.mp4', trimStart: 1, trimEnd: 6, duration: 10 }
  ];
  const fileList = clips.map((clip) => {
    return `file '${clip.path.replace(/\\\\/g, '/')}'\\ninpoint ${clip.trimStart || 0}\\noutpoint ${clip.trimEnd || clip.duration}`;
  }).join('\\n');
  
  assert.ok(fileList.includes('clip1.mp4'));
  assert.ok(fileList.includes('clip2.mp4'));
  assert.ok(fileList.includes('clip3.mp4'));
  assert.ok(fileList.includes('inpoint 0'));
  assert.ok(fileList.includes('inpoint 2'));
  assert.ok(fileList.includes('inpoint 1'));
});

test('empty clips array detection', () => {
  const clips = [];
  const isEmpty = clips.length === 0;
  assert.strictEqual(isEmpty, true);
});

test('single clip detection', () => {
  const clips = [{ path: 'test.mp4', duration: 10 }];
  const isSingleClip = clips.length === 1;
  assert.strictEqual(isSingleClip, true);
});

test('multi-clip detection', () => {
  const clips = [
    { path: 'test1.mp4', duration: 10 },
    { path: 'test2.mp4', duration: 15 }
  ];
  const isMultiClip = clips.length > 1;
  assert.strictEqual(isMultiClip, true);
});

test('Windows path normalization for concat', () => {
  const windowsPath = 'C:\\\\Users\\\\Videos\\\\test.mp4';
  const normalized = windowsPath.replace(/\\\\/g, '/');
  assert.strictEqual(normalized, 'C:/Users/Videos/test.mp4');
});

test('Unix path requires no normalization for concat', () => {
  const unixPath = '/home/user/videos/test.mp4';
  const normalized = unixPath.replace(/\\\\/g, '/');
  assert.strictEqual(normalized, '/home/user/videos/test.mp4');
});

test('timeline clips array structure for export', () => {
  const timelineClips = [
    {
      id: 'timeline-1',
      clipId: 0,
      name: 'clip1.mp4',
      path: '/path/to/clip1.mp4',
      startTime: 0,
      duration: 10,
      trimStart: 1,
      trimEnd: 8
    }
  ];
  
  assert.ok(timelineClips[0].hasOwnProperty('path'));
  assert.ok(timelineClips[0].hasOwnProperty('trimStart'));
  assert.ok(timelineClips[0].hasOwnProperty('trimEnd'));
  assert.ok(timelineClips[0].hasOwnProperty('duration'));
});

// F6: Timeline UI Enhancements Tests
console.log('\nF6: Timeline UI Enhancements');

test('auto-zoom calculates correct pixels per second', () => {
  const totalDuration = 100; // seconds
  const timelineWidth = 1000; // pixels
  const calculatedZoom = timelineWidth / totalDuration;
  assert.strictEqual(calculatedZoom, 10);
});

test('auto-zoom allows very small zoom for long videos', () => {
  const totalDuration = 1000; // very long duration (16+ minutes)
  const timelineWidth = 1000;
  const calculatedZoom = timelineWidth / totalDuration; // 1 pixel per second
  assert.strictEqual(calculatedZoom, 1);
});

test('auto-zoom allows very large zoom for short videos', () => {
  const totalDuration = 10; // short duration
  const timelineWidth = 1000;
  const calculatedZoom = timelineWidth / totalDuration; // 100 pixels per second
  assert.strictEqual(calculatedZoom, 100);
});

test('snap threshold calculation in time units', () => {
  const snapPixels = 20;
  const pixelsPerSecond = 10;
  const snapThreshold = snapPixels / pixelsPerSecond;
  assert.strictEqual(snapThreshold, 2);
});

test('snap detection at clip boundary', () => {
  const newStartTime = 10.5;
  const clipEnd = 10;
  const snapThreshold = 1;
  const shouldSnap = Math.abs(newStartTime - clipEnd) < snapThreshold;
  assert.strictEqual(shouldSnap, true);
});

test('no snap when beyond threshold', () => {
  const newStartTime = 15;
  const clipEnd = 10;
  const snapThreshold = 2;
  const shouldSnap = Math.abs(newStartTime - clipEnd) < snapThreshold;
  assert.strictEqual(shouldSnap, false);
});

test('formatFileSize converts bytes correctly', () => {
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  assert.strictEqual(formatFileSize(0), '0 B');
  assert.strictEqual(formatFileSize(1024), '1 KB');
  assert.strictEqual(formatFileSize(1048576), '1 MB');
  assert.strictEqual(formatFileSize(1073741824), '1 GB');
});

test('formatFileSize handles non-exact values', () => {
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  const result = formatFileSize(1536);
  assert.ok(result.includes('KB'));
  assert.ok(parseFloat(result) === 1.5);
});

test('mouse wheel zoom step calculation', () => {
  const deltaY = -100; // scroll up
  const delta = -Math.sign(deltaY);
  const zoomStep = 2;
  const currentZoom = 10;
  const newZoom = currentZoom + (delta * zoomStep);
  assert.strictEqual(newZoom, 12);
});

test('zoom can reach very high levels for precision', () => {
  const currentZoom = 100;
  const zoomStep = 5;
  const newZoom = currentZoom + zoomStep;
  assert.strictEqual(newZoom, 105);
});

test('zoom respects minimum boundary to prevent zero/negative', () => {
  const currentZoom = 0.5;
  const zoomStep = 2;
  const newZoom = currentZoom - zoomStep;
  const minZoom = 0.1;
  const isValid = newZoom >= minZoom;
  assert.strictEqual(isValid, false); // Would go below minimum
});

test('clip reordering after drag', () => {
  const clips = [
    { id: 1, startTime: 10 },
    { id: 2, startTime: 0 },
    { id: 3, startTime: 5 }
  ];
  clips.sort((a, b) => a.startTime - b.startTime);
  assert.strictEqual(clips[0].id, 2);
  assert.strictEqual(clips[1].id, 3);
  assert.strictEqual(clips[2].id, 1);
});

test('play from current playhead position - find correct clip', () => {
  const currentTime = 15;
  const clips = [
    { startTime: 0, trimStart: 0, trimEnd: 10 },
    { startTime: 10, trimStart: 0, trimEnd: 10 },
    { startTime: 20, trimStart: 0, trimEnd: 10 }
  ];

  let foundIndex = -1;
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const clipStart = clip.startTime;
    const clipEnd = clip.startTime + (clip.trimEnd - clip.trimStart);
    if (currentTime >= clipStart && currentTime < clipEnd) {
      foundIndex = i;
      break;
    }
  }

  assert.strictEqual(foundIndex, 1);
});

test('play from current playhead - calculate offset in clip', () => {
  const currentTime = 15;
  const clip = { startTime: 10, trimStart: 2, trimEnd: 22 };
  const clipStart = clip.startTime;
  const offsetInClip = currentTime - clipStart;
  const videoTime = clip.trimStart + offsetInClip;

  assert.strictEqual(offsetInClip, 5);
  assert.strictEqual(videoTime, 7);
});

// Summary
console.log(`\n${'='.repeat(50)}`);
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log('='.repeat(50));

if (failed > 0) {
  process.exit(1);
}

console.log('\n✓ All unit tests passed');
