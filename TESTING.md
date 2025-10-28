# ClipForge Testing Strategy

## Overview
This document outlines the testing approach for ClipForge, focusing on fast-running tests with minimal dependencies that validate all implemented features before merge into master.

## Test Execution
```bash
# Run all tests
npm test

# Run unit tests only
npm test:unit

# Run integration tests only
npm test:integration
```

## Testing Philosophy

### Zero Additional Dependencies
All tests use Node.js built-in modules (`assert`, `fs`, `path`) to ensure:
- **Fast execution** (< 2 seconds total)
- **No installation overhead** in CI pipeline
- **Minimal maintenance burden**
- **No version conflicts** with existing dependencies

### Two-Tier Testing Approach

#### 1. Unit Tests (`tests/unit.test.js`)
Tests pure functions and calculations without DOM interaction:
- Timeline calculations (position, seek, zoom)
- Time formatting (MM:SS format)
- Trim boundary calculations (0.1s minimum)
- File path parsing
- Video file filtering

**Runtime:** ~200ms

#### 2. Integration Tests (`tests/integration.test.js`)
Static code analysis to verify feature implementation:
- Function definitions exist
- Event listeners are registered
- Required DOM elements present in HTML
- Data structures contain required properties
- Cross-feature workflows are wired correctly

**Runtime:** ~300ms

## Feature Coverage

### F1: Timeline Foundation ✅
**Unit Tests:**
- `formatTime()` converts seconds to MM:SS format (5 tests)
- Timeline position calculations (3 tests)
- Seek time clamping to bounds (4 tests)
- Dynamic interval calculation for 1s/5s/10s markers (3 tests)
- Zoom constraints (5-50 pixels/second) (1 test)

**Integration Tests:**
- Timeline state object structure (6 properties)
- Core functions defined (5 functions)
- Event listeners registered (4 listeners)
- HTML DOM elements present (6 elements)
- Window resize handler exists

**Total:** 16 unit + 11 integration = 27 tests

### F2: Clip Management ✅
**Unit Tests:**
- Clip data structure validation (2 tests)
- Visible duration calculation (1 test)
- Clip width calculation (1 test)

**Integration Tests:**
- Data arrays initialized (2 tests)
- Core functions defined (4 functions)
- Drag-and-drop handlers (5 tests)
- HTML elements present (2 tests)
- Data structure properties (2 tests)

**Total:** 4 unit + 13 integration = 17 tests

### F3: Trim Operations ✅
**Unit Tests:**
- Minimum duration constraint (0.1s) (2 tests)
- Trim handle bounds checking (4 tests)

**Integration Tests:**
- State variables exist (2 tests)
- Core functions defined (3 functions)
- DOM elements created (3 tests)
- Event listeners registered (3 tests)
- Calculations use correct variables (2 tests)

**Total:** 6 unit + 12 integration = 18 tests

### F4: Drag-Drop Import ✅
**Unit Tests:**
- File extension filtering (mp4/mov/webm) (5 tests)
- Path parsing (Windows/Unix) (2 tests)

**Integration Tests:**
- Event listeners registered (4 tests)
- Visual feedback implemented (3 tests)
- File type filtering exists (2 tests)
- Multiple file support (1 test)

**Total:** 7 unit + 9 integration = 16 tests

### Cross-Feature Integration ✅
**Integration Tests:**
- Import → Library → Timeline workflow (1 test)
- Zoom affects timeline clips (1 test)
- Export validates timeline (1 test)
- Status messages throughout app (1 test)

**Total:** 4 integration tests

## Summary
- **Total Tests:** 78
- **Unit Tests:** 33 (pure function logic)
- **Integration Tests:** 45 (code structure validation)
- **Execution Time:** ~500ms
- **CI Impact:** Adds ~1 second to pipeline

## Tests Intentionally Skipped

The following test categories are skipped due to requiring additional dependencies or technical infrastructure:

### 1. End-to-End (E2E) Tests
**Why Skipped:** Requires Electron test harness (Spectron/Playwright)
**Examples:**
- Launching Electron app and verifying window
- Clicking import button and loading video
- Dragging clips to timeline and verifying render
- Trimming clips and verifying visual feedback
- Exporting video and verifying output file

**Alternative Coverage:** Integration tests verify code structure; manual testing validates behavior

### 2. DOM Rendering Tests
**Why Skipped:** Requires JSDOM, Happy-DOM, or similar
**Examples:**
- Timeline ruler markers render at correct positions
- Playhead moves when timeline is clicked
- Clip elements appear when dropped on timeline
- Trim handles appear when clip is selected
- Drag-over styling applies correctly

**Alternative Coverage:** Integration tests verify DOM manipulation code exists

### 3. Video Processing Tests
**Why Skipped:** Requires FFmpeg and test video fixtures
**Examples:**
- Video metadata extraction (duration, resolution)
- Video preview playback functionality
- Export pipeline with actual video concatenation
- Trim operations produce correct output files

**Alternative Coverage:** Validated in build step (FFmpeg must be accessible)

### 4. Event Simulation Tests
**Why Skipped:** Requires DOM testing library
**Examples:**
- Simulating drag-and-drop gestures
- Mouse events for trim handle interaction
- Keyboard shortcuts (if implemented)
- Window resize events

**Alternative Coverage:** Integration tests verify event handlers are registered

### 5. Visual Regression Tests
**Why Skipped:** Requires screenshot comparison tools (Percy, Chromatic)
**Examples:**
- Timeline appearance matches design
- Clip styling (blue gradient, text)
- Hover states and selected states
- Progress bar animations

**Alternative Coverage:** Manual QA during development

### 6. Performance Tests
**Why Skipped:** Requires benchmarking framework and video fixtures
**Examples:**
- Timeline with 100+ clips renders smoothly
- Zoom operations remain responsive
- Large video file import speed
- Export speed for various durations

**Alternative Coverage:** Performance validated through manual testing

## Future Testing Enhancements

When the project matures and testing infrastructure becomes valuable:

### Phase 2: Add E2E Testing
- **Tool:** Playwright for Electron
- **Coverage:** Critical user workflows (import → edit → export)
- **Trigger:** Run on PR to master only (skip on feature branches)

### Phase 3: Add Visual Tests
- **Tool:** Percy or Chromatic
- **Coverage:** UI component regression
- **Trigger:** Manual or weekly schedule

### Phase 4: Add Performance Tests
- **Tool:** Custom benchmarks with real video fixtures
- **Coverage:** Timeline scalability, export speed
- **Trigger:** Nightly or on demand

## CI/CD Integration

### Current Pipeline (GitHub Actions)
```yaml
1. Checkout code
2. Setup Node.js 20.x
3. Install dependencies (npm ci)
4. Run tests (npm test) ← NEW STEP
5. Build application (npm run dist)
6. Validate build (npm run validate)
7. Upload artifact
```

### Test Failure Behavior
- Tests run **before** build step
- Any test failure stops the pipeline
- Build never occurs if tests fail
- Fast feedback loop (~1 min total including tests)

## Running Tests Locally

```bash
# During development
npm test

# Watch mode (manual refresh)
nodemon --exec "npm test" --watch renderer.js --watch tests/

# Verbose output
node tests/unit.test.js
node tests/integration.test.js

# Check exit codes
npm test && echo "Tests passed" || echo "Tests failed"
```

## Maintenance Guidelines

### When Adding New Features
1. Extract pure functions for unit testing
2. Add structure validation to integration tests
3. Update this document with new coverage
4. Keep test execution under 2 seconds

### When Tests Fail
1. Check if code structure changed (function renames, etc.)
2. Verify pure function logic is correct
3. Update tests if intentional breaking change
4. Never skip tests to "go green"

## Principles

✅ **DO:**
- Test business logic and calculations
- Verify code structure and wiring
- Keep tests fast (< 2 seconds)
- Use built-in Node.js modules only
- Document skipped test categories

❌ **DON'T:**
- Add testing frameworks without clear ROI
- Write tests that require Electron to run
- Mock heavily (sign of poor architecture)
- Test implementation details
- Skip tests that can run fast with current stack

---

**Last Updated:** 2025-01-28
**Test Count:** 78
**Execution Time:** ~500ms
**Pass Rate:** 100%
