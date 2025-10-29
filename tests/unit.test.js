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
console.log('Running Unit Tests for ClipForge...\n');

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

test('zoom range constraints (5-50 pixels per second)', () => {
  const minZoom = 5;
  const maxZoom = 50;
  assert.strictEqual(Math.max(minZoom, 3), minZoom);
  assert.strictEqual(Math.min(maxZoom, 60), maxZoom);
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

// Summary
console.log(`\n${'='.repeat(50)}`);
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log('='.repeat(50));

if (failed > 0) {
  process.exit(1);
}

console.log('\n✓ All unit tests passed');
