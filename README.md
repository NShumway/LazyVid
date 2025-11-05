# LazyVid

A desktop video editor built with Electron featuring screen recording with webcam overlay, timeline editing, and video export.

## Tech Stack

- **Electron 28** - Desktop application framework
- **fluent-ffmpeg** - Video processing and export
- **@ffmpeg-installer/ffmpeg** - Bundled FFmpeg binary (no user installation required)
- **electron-builder** - Windows application packaging

## Features

### ✅ Screen Recording
- **Full screen recording** with automatic source selection
- **Window recording** with picker modal showing thumbnails
- **Webcam overlay** - Picture-in-picture webcam feed in top-right corner
- **Recording indicator** - Red timer with pulsing dot, draggable overlay window
- **Audio capture** - System audio (via getDisplayMedia) + microphone
- **Stop button** - Integrated in the overlay window for easy access
- Recordings automatically added to timeline with correct duration

### ✅ Video Import/Export
- **Drag & drop** video files (MP4, MOV, WebM)
- **File picker** import
- **Export resolution options** - Choose from Source, 1080p, or 720p
- **Letterboxing/Pillarboxing** - Handles mixed resolutions with proper aspect ratio
- **Native resolution capture** - Supports ultra-wide and high-res displays (up to 8K)
- **Progress tracking** during export
- **Multi-clip export** with concat demuxer

### ✅ Timeline Editing
- **Visual timeline** with zoom controls (mouse wheel supported)
- **Clip trimming** - Drag trim handles to set in/out points
- **Split clips** at playhead position
- **Delete clips** from timeline
- **Reorder clips** via drag and drop
- **Thumbnails** - Auto-generated from first frame
- **Metadata display** - Resolution, file size, duration
- **Auto-zoom** to fit all content when adding clips
- **Snap guides** - Visual indicators when clips snap together

## Prerequisites

- Node.js 20.x (managed via Volta)
- **Windows 11** or **macOS 10.13+**

## Installation

```bash
npm install
```

**macOS Additional Step:** If you encounter FFmpeg errors on macOS, you may need to manually install the platform-specific FFmpeg binary:

```bash
npm install @ffmpeg-installer/darwin-arm64  # For Apple Silicon (M1/M2/M3)
# or
npm install @ffmpeg-installer/darwin-x64    # For Intel Macs
```

## Development

Run the app in development mode:

```bash
npm start
```

## Building & Publishing

### Platform-Specific Builds

Build for your current platform:

```bash
npm run dist        # Builds for macOS (if on Mac) or Windows (if on Windows)
npm run dist:mac    # Builds specifically for macOS
npm run dist:win    # Builds specifically for Windows
```

### macOS Build

#### Quick Build:

```bash
./build-dist.sh
```

This automated script handles the complete build process:
1. Cleans the dist folder
2. Runs electron-builder
3. Verifies FFmpeg node_modules were packaged
4. Runs validation checks

**Output location:** `dist/mac-arm64/LazyVid.app` (on Apple Silicon) or `dist/mac/LazyVid.app` (on Intel)

#### Manual Build Steps (macOS):

```bash
# 1. Clean dist folder
rm -rf dist

# 2. Build with electron-builder
npm run dist:mac

# 3. Validate the build
npm run validate
```

#### Build Configuration (macOS)

The app is configured with these settings in `package.json`:
- `target: "dir"` - Creates unpacked directory (no DMG installer)
- `identity: null` - No code signing required
- `category: "public.app-category.video"` - Video editing category

#### Build Output (macOS):

```
dist/
└── mac-arm64/           # or mac/ on Intel
    └── LazyVid.app/
        └── Contents/
            ├── MacOS/
            │   └── LazyVid
            └── Resources/
                ├── app.asar
                └── app.asar.unpacked/
                    └── node_modules/
                        └── @ffmpeg-installer/
```

### Windows Build

#### Quick Build:

```powershell
.\build-dist.ps1
```

This automated script handles the complete build process:
1. Cleans the dist folder
2. Runs electron-builder
3. Verifies FFmpeg node_modules were packaged
4. Runs validation checks

**Output location:** `dist/win-unpacked/LazyVid.exe`

#### Prerequisites for Building (Windows):

**IMPORTANT:** Due to Windows permission restrictions, the build process may fail if you don't have administrator privileges or Developer Mode enabled.

1. **Enable Developer Mode** (Recommended - No admin required):
   - Open Windows Settings
   - Go to "Privacy & Security" > "For developers"
   - Enable "Developer Mode"
   - This allows creating symbolic links without admin privileges

   OR

2. **Run as Administrator**:
   - Open PowerShell or Terminal as Administrator
   - Navigate to project directory
   - Run `.\build-dist.ps1`

#### Manual Build Steps (Windows):

```powershell
# 1. Clean dist folder
Remove-Item -Path "dist" -Recurse -Force

# 2. Build with electron-builder
npm run dist:win

# 3. Validate the build
npm run validate
```

#### Build Configuration (Windows)

The app is configured with these settings in `package.json`:
- `target: "dir"` - Creates unpacked directory (no installer)
- `sign: null` - No code signing
- `signDlls: false` - Don't sign DLL files
- `signAndEditExecutable: false` - Skip executable signing/editing

#### Common Build Issues (Windows):

**Error: "Cannot create symbolic link : A required privilege is not held"**
- **Solution:** Enable Developer Mode (see above) or run as Administrator

**Error: "winCodeSign extraction failed"**
- **Solution:** This is caused by symbolic link permissions. Enable Developer Mode fixes this.

#### Build Output (Windows):

```
dist/
└── win-unpacked/
    ├── LazyVid.exe (169 MB)
    ├── resources/
    │   ├── app.asar (12.5 MB - Your app code + dependencies)
    │   └── app.asar.unpacked/
    │       └── node_modules/ (FFmpeg binaries and dependencies)
    └── [Electron runtime files...]
```

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

### On macOS:
1. Navigate to `dist/mac-arm64/` (or `dist/mac/` on Intel)
2. Double-click `LazyVid.app` to launch
3. If you get a security warning, go to System Preferences > Security & Privacy and click "Open Anyway"
4. Click "Import Video" and select any MP4/MOV file
5. Verify video plays in the preview player
6. Click "Export Video" and choose a save location
7. Verify export completes with progress indicator
8. Verify exported file plays correctly

### On Windows:
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

## Testing

Run the automated test suite:

```powershell
npm test
```

Test suite includes:
- **75 unit tests** - Testing core functionality (timeline, trimming, recording logic)
- **176 integration tests** - Testing code structure and feature integration
- **Total: 251 tests** - All passing ✅

Run specific test suites:
```powershell
npm run test:unit         # Run unit tests only
npm run test:integration  # Run integration tests only
```

## Architecture

### Core Files
- **main.js** - Electron main process (IPC handlers, FFmpeg integration, window management)
- **preload.js** - Secure IPC bridge between main and renderer
- **renderer.js** - UI logic (vanilla JavaScript, ~1500 lines)
- **index.html** - Main application interface
- **recording-overlay.html** - Recording indicator + webcam overlay window
- **styles.css** - UI styling (~615 lines)

### Supporting Files
- **validate.js** - Build verification script
- **tests/unit.test.js** - Unit tests (75 tests)
- **tests/integration.test.js** - Integration tests (176 tests)

## Validation Checklist

All items must pass for successful thin-slice validation:

- [x] Electron app launches
- [x] Video import via file picker
- [x] Video preview playback
- [x] FFmpeg binary accessible
- [x] Export video to MP4
- [x] Packaged as distributable

## Known Limitations

Current scope limitations:

- Single video track (no multi-track timeline)
- No audio-only tracks
- No video effects or transitions
- No keyframe animation
- Cross-platform support: Windows and macOS (Linux not tested)

## License

MIT
