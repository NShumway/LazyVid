# LazyVid - Technical Requirements

## Project Overview
Build a desktop video editor in 72 hours with two hard deadlines:
- **MVP Deadline:** Tuesday, October 28th at 10:59 PM CT
- **Final Submission:** Wednesday, October 29th at 10:59 PM CT

## Locked Tech Stack

### Desktop Framework
- **Electron** with Node.js 20.x (managed via Volta)
- Provides native desktop APIs and cross-platform compatibility
- Better Windows CLI integration than Tauri

### Frontend
- **Vanilla JavaScript**
- Zero build complexity for maximum development speed
- Direct DOM manipulation
- HTML5 drag-and-drop API for timeline interactions

### Video Processing
- **fluent-ffmpeg** (Node.js wrapper for FFmpeg)
- **FFmpeg binary** bundled with application
- Simplifies deployment (no user-side FFmpeg installation required)
- Used for video encoding, stitching, trimming, and export

### Timeline UI
- **Custom CSS/DOM-based implementation**
- HTML5 drag-and-drop API for clip manipulation
- CSS Grid/Flexbox for layout
- Prioritizes simplicity and debuggability over Canvas complexity

### Video Player
- **HTML5 `<video>` element**
- Native browser API, zero dependencies
- Built-in playback controls can be customized

### Recording APIs
- **Electron `desktopCapturer` API** - Screen/window selection
- **`navigator.mediaDevices.getUserMedia()`** - Webcam access
- **`navigator.mediaDevices.getDisplayMedia()`** - Screen sharing fallback
- **MediaRecorder API** - Recording streams to files

### Build & Packaging
- **electron-builder** for creating distributable packages
- Target Windows platform primarily (cross-platform nice-to-have)

## MVP Requirements (Hard Gate - Tuesday 10:59 PM CT)

Must have all of these working:
1. Desktop app launches successfully
2. Video import via drag-and-drop or file picker (MP4/MOV)
3. Simple timeline view displaying imported clips
4. Video preview player that plays imported clips
5. Basic trim functionality (set in/out points on a single clip)
6. Export single clip to MP4
7. Built and packaged as native app (not dev mode)

## Core Features (Full Submission - Wednesday 10:59 PM CT)

### Recording Features
- Screen recording (full screen or window selection)
- Webcam recording (system camera access)
- Simultaneous screen + webcam (picture-in-picture)
- Microphone audio capture
- Save recordings directly to timeline

### Import & Media Management
- Drag and drop video files (MP4, MOV, WebM)
- File picker for importing from disk
- Media library panel showing imported clips
- Thumbnail previews of clips
- Basic metadata display (duration, resolution, file size)

### Timeline Editor
- Visual timeline with playhead (current time indicator)
- Drag clips onto timeline
- Arrange clips in sequence
- Trim clips (adjust start/end points)
- Split clips at playhead position
- Delete clips from timeline
- Multiple tracks (minimum 2: main video + overlay/PiP)
- Zoom in/out on timeline for precision editing
- Snap-to-grid or snap-to-clip edges

### Preview & Playback
- Real-time preview of timeline composition
- Play/pause controls
- Scrubbing (drag playhead to any position)
- Audio playback synchronized with video
- Preview window shows current frame at playhead

### Export & Sharing
- Export timeline to MP4
- Resolution options (720p, 1080p, or source resolution)
- Progress indicator during export
- Save to local file system

## Performance Targets
- Timeline UI remains responsive with 10+ clips
- Preview playback at 30 fps minimum
- Export completes without crashes
- App launch time under 5 seconds
- No memory leaks during extended editing sessions (15+ minutes)
- Exported videos maintain reasonable quality (not bloated)

## Required Dependencies

### Core Dependencies
```json
{
  "electron": "^latest",
  "fluent-ffmpeg": "^latest",
  "electron-builder": "^latest"
}
```

### System Requirements
- FFmpeg binary (bundled with app distribution)
- Node.js 20.x (managed via Volta)
- Windows 11 (primary development/testing platform)

## Build Strategy (Priority Order)

1. **Start with Import and Preview** - Validate media pipeline
2. **Build the Timeline** - Core interface (draggable, trimmable, deletable clips)
3. **Test Export Early** - FFmpeg encoding validation
4. **Add Recording** - Screen and webcam capture (not critical for MVP)
5. **Package and Test** - Build distributable, test on real hardware

## Architecture Principles

- **Velocity over perfection** - Working beats feature-rich but broken
- **Core loop focus:** Record → Import → Arrange → Export
- **Pragmatic decisions** - Use simplest approach that works
- **Test packaging early** - Don't wait until last minute
- **Windows-first** - Optimize for Windows CLI and native behavior

## Submission Requirements

- GitHub repository with setup instructions
- Demo video (3-5 minutes) showing all features
- Packaged desktop app (GitHub Releases, Google Drive, or Dropbox)
- README with clear run/build instructions

## Success Criteria

A simple, working video editor that can record, arrange clips, and export beats a feature-rich app that crashes or doesn't package correctly.

**Remember:** Just submit. Don't miss a submission.
