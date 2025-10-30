# LazyVid

[![Build and Validate](https://github.com/YOUR_USERNAME/LazyVid/actions/workflows/build.yml/badge.svg)](https://github.com/YOUR_USERNAME/LazyVid/actions/workflows/build.yml)

A desktop video editor built with Electron for screen recording and video editing.

## Tech Stack Validation

This thin-slice MVP proves the following technologies work together as a complete, packaged application:

- **Electron 28** - Desktop application framework
- **fluent-ffmpeg** - Video processing and export
- **@ffmpeg-installer/ffmpeg** - Bundled FFmpeg binary (no user installation required)
- **electron-builder** - Windows application packaging

## Features

This MVP validates the complete workflow:

1. ✅ Desktop app launches successfully
2. ✅ Video import via file picker (MP4, MOV, WebM)
3. ✅ HTML5 video preview with native playback controls
4. ✅ FFmpeg integration for video re-encoding
5. ✅ Export to MP4 with progress tracking
6. ✅ Packaged as standalone Windows executable

## Prerequisites

- Node.js 20.x (managed via Volta)
- Windows 11

## Installation

```powershell
npm install
```

## Development

Run the app in development mode:

```powershell
npm start
```

## Building

Create a distributable Windows application:

```powershell
npm run dist
```

The packaged app will be in `dist/win-unpacked/LazyVid.exe`

## Validation

Run the validation script to verify all required files and build artifacts:

```powershell
npm run validate
```

This checks:
- All source files exist
- Executable was built successfully
- Build size is reasonable

## Testing the Packaged App

1. Navigate to `dist/win-unpacked/`
2. Run `LazyVid.exe`
3. Click "Import Video" and select any MP4/MOV file
4. Verify video plays in the preview player
5. Click "Export Video" and choose a save location
6. Verify export completes with progress indicator
7. Verify exported file plays correctly

## CI/CD

GitHub Actions workflow automatically:
1. Installs dependencies with `npm ci`
2. Builds Windows executable with `npm run dist`
3. Validates build with `npm run validate`
4. Uploads artifact for download

The workflow runs on:
- Push to `main` or `develop` branches
- Pull requests to `main`

## Architecture

- **main.js** - Electron main process (IPC handlers, FFmpeg integration)
- **preload.js** - Secure IPC bridge between main and renderer
- **renderer.js** - UI logic (vanilla JavaScript)
- **index.html** - Application interface
- **styles.css** - UI styling
- **validate.js** - Build verification script

## Validation Checklist

All items must pass for successful thin-slice validation:

- [x] Electron app launches
- [x] Video import via file picker
- [x] Video preview playback
- [x] FFmpeg binary accessible
- [x] Export video to MP4
- [x] Packaged as distributable

## Known Limitations

This is a proof-of-concept with intentional scope limitations:

- No timeline editing
- No trimming or splitting
- No drag-and-drop
- No recording features
- Export is simple re-encode (no custom settings)

## Next Steps

With the stack validated, the following features can be added:

1. Timeline UI with draggable clips
2. Trim functionality (in/out points)
3. Split clips at playhead
4. Screen/webcam recording
5. Multi-track timeline
6. Export resolution options

## License

MIT
