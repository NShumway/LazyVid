# Feature Branch Strategy

## Orthogonal Feature Groups

Each group represents an independent vertical slice that can be developed and tested in isolation.

---

## MVP Track (Due: Tuesday 10:59 PM CT)

### ✅ F0: Foundation (COMPLETE)
**Branch:** `master` (shipped)
- [x] Electron app launches
- [x] Basic UI shell
- [x] File picker import
- [x] Video preview player
- [x] FFmpeg export pipeline
- [x] CI/CD green

### F1: Timeline Foundation
**Branch:** `feature/timeline-foundation`
**Dependencies:** F0
**Deliverables:**
- Visual timeline container with time ruler
- Single track layout (CSS Grid)
- Playhead indicator with time display
- Zoom in/out controls (timeline scale)
- Click-to-seek on timeline

**Validation:**
- Timeline renders with proper time markers
- Playhead moves on timeline click
- Zoom changes visible time range

---

### F2: Clip Management
**Branch:** `feature/clip-management`
**Dependencies:** F1
**Deliverables:**
- Drag clips from media library to timeline
- Visual clip representation (thumbnail + duration)
- Drag clips to reorder on timeline
- Delete clips from timeline (keyboard + button)
- Media library panel with imported clips

**Validation:**
- Clips appear on timeline when dragged
- Clips can be reordered
- Deleted clips removed from timeline

---

### F3: Trim Operations
**Branch:** `feature/trim-operations`
**Dependencies:** F2
**Deliverables:**
- Select clip on timeline
- Trim handles on clip edges
- Drag handles to adjust in/out points
- Visual feedback during trim
- Apply trim to FFmpeg export

**Validation:**
- Trim handles appear on selected clip
- Dragging handles adjusts clip duration
- Exported video reflects trimmed duration

---

### F4: Drag-and-Drop Import
**Branch:** `feature/drag-drop-import`
**Dependencies:** F0 (parallel with F1-F3)
**Deliverables:**
- Drag video files into app window
- Drop zone visual feedback
- Add dropped files to media library
- Support MP4, MOV, WebM

**Validation:**
- Dragging file over window shows drop zone
- Dropped video appears in media library
- Multiple files can be dropped

---

## Full Submission Track (Due: Wednesday 10:59 PM CT)

### F5: Recording - Screen Capture
**Branch:** `feature/recording-screen`
**Dependencies:** F0
**Deliverables:**
- Screen source selection dialog (Electron desktopCapturer)
- Start/stop recording UI
- Save recording to temp file
- Auto-add recording to media library
- Microphone audio capture toggle

**Validation:**
- Screen selection shows available sources
- Recording saves to file
- Recorded file appears in media library

---

### F6: Recording - Webcam Capture
**Branch:** `feature/recording-webcam`
**Dependencies:** F5
**Deliverables:**
- Webcam source selection
- Start/stop webcam recording
- Preview webcam feed during recording
- Save webcam recording to media library

**Validation:**
- Webcam preview shows live feed
- Recording saves with video + audio
- Recorded file playable in app

---

### F7: Picture-in-Picture
**Branch:** `feature/pip-overlay`
**Dependencies:** F2, F6
**Deliverables:**
- Second timeline track for overlays
- Drag webcam clips to overlay track
- Position/resize overlay in preview
- FFmpeg composite export (screen + webcam)

**Validation:**
- Overlay track visible in timeline
- Webcam clips appear as overlay in preview
- Export contains both layers

---

### F8: Timeline Enhancements
**Branch:** `feature/timeline-enhancements`
**Dependencies:** F2
**Deliverables:**
- Split clip at playhead position
- Snap-to-grid when dragging clips
- Snap-to-clip edges
- Ripple delete (close gaps automatically)

**Validation:**
- Split creates two clips at playhead
- Clips snap to grid/edges when dragging
- Ripple delete closes timeline gaps

---

### F9: Playback Controls
**Branch:** `feature/playback-controls`
**Dependencies:** F2
**Deliverables:**
- Play/pause button
- Scrubbing (drag playhead)
- Keyboard shortcuts (space = play/pause, arrow keys = frame step)
- Audio sync with video during playback
- Timeline auto-scrolls during playback

**Validation:**
- Play button plays timeline composition
- Dragging playhead updates preview
- Keyboard shortcuts work
- Audio stays in sync

---

### F10: Export Options
**Branch:** `feature/export-options`
**Dependencies:** F3
**Deliverables:**
- Resolution selector (720p, 1080p, source)
- Codec options (H.264, H.265)
- Quality presets (fast, balanced, high quality)
- Export settings modal
- Remember last export settings

**Validation:**
- Export dialog shows options
- Selected resolution applied to output
- Settings persist between exports

---

### F11: Media Library Enhancements
**Branch:** `feature/media-library`
**Dependencies:** F2
**Deliverables:**
- Thumbnail generation for clips
- Metadata display (duration, resolution, file size)
- Search/filter media library
- Sort by name, date, duration
- Delete clips from library

**Validation:**
- Thumbnails appear for all clips
- Metadata displays correctly
- Search filters library results

---

## Branch Merge Strategy

1. **MVP Critical Path:** F1 → F2 → F3 → F4 → merge to `master`
2. **Recording Path:** F5 → F6 → F7 → merge to `master`
3. **Polish Path:** F8 → F9 → F10 → F11 → merge to `master`

## Independence Matrix

| Feature | Dependencies | Can Develop in Parallel With |
|---------|--------------|------------------------------|
| F1 | F0 | F4, F5, F6 |
| F2 | F1 | F4, F5, F6 |
| F3 | F2 | F4, F5, F6 |
| F4 | F0 | F1, F2, F3, F5, F6 |
| F5 | F0 | F1, F2, F3, F4, F6 |
| F6 | F5 | F1, F2, F3, F4 |
| F7 | F2, F6 | F8, F9, F10, F11 |
| F8 | F2 | F5, F6, F9, F10, F11 |
| F9 | F2 | F5, F6, F8, F10, F11 |
| F10 | F3 | F5, F6, F8, F9, F11 |
| F11 | F2 | F5, F6, F8, F9, F10 |

## Development Order (Recommended)

**Tuesday (MVP Day):**
1. F1 (Timeline Foundation) - 2-3 hours
2. F2 (Clip Management) - 3-4 hours
3. F3 (Trim Operations) - 2-3 hours
4. F4 (Drag-Drop Import) - 1-2 hours

**Wednesday (Full Submission):**
1. F5 (Screen Recording) - 3-4 hours
2. F6 (Webcam Recording) - 2-3 hours
3. F9 (Playback Controls) - 2-3 hours
4. F7 (PiP) - 2-3 hours
5. F8, F10, F11 (Polish) - Time permitting
