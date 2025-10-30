# LazyVid Build Script
# Builds the Windows distributable and prepares it for distribution

# Enable strict error handling
$ErrorActionPreference = "Stop"

# Ensure we're in the script's directory
Set-Location $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "LazyVid Build Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Clean dist folder
Write-Host "[1/4] Cleaning dist folder..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Path "dist" -Recurse -Force
    Write-Host "[OK] Cleaned dist folder" -ForegroundColor Green
} else {
    Write-Host "[OK] No dist folder to clean" -ForegroundColor Green
}
Write-Host ""

# Step 2: Run npm run dist
Write-Host "[2/4] Building distributable with electron-builder..." -ForegroundColor Yellow
try {
    $output = npm run dist 2>&1 | Out-String
    Write-Host $output
    $buildExitCode = $LASTEXITCODE
    if ($buildExitCode -ne 0) {
        Write-Host "[ERROR] Build failed with exit code $buildExitCode!" -ForegroundColor Red
        exit 1
    }
    if (-not (Test-Path "dist\win-unpacked\LazyVid.exe")) {
        Write-Host "[ERROR] Build completed but LazyVid.exe was not created!" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Build completed" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Build process threw an exception: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 3: Verify node_modules were packaged
Write-Host "[3/4] Verifying node_modules were packaged..." -ForegroundColor Yellow
if (Test-Path "dist\win-unpacked\resources\app.asar.unpacked\node_modules\@ffmpeg-installer") {
    Write-Host "[OK] FFmpeg node_modules verified in app.asar.unpacked" -ForegroundColor Green
} elseif (Test-Path "dist\win-unpacked\resources\app.asar.unpacked\node_modules") {
    Write-Host "[WARNING] node_modules found but @ffmpeg-installer may be missing" -ForegroundColor Yellow
} else {
    Write-Host "[ERROR] node_modules not found in packaged app!" -ForegroundColor Red
    Write-Host "This may cause FFmpeg to fail. Check your electron-builder configuration." -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Run validation
Write-Host "[4/4] Running validation..." -ForegroundColor Yellow
npm run validate
$validateExitCode = $LASTEXITCODE
if ($validateExitCode -ne 0) {
    Write-Host "[ERROR] Validation failed with exit code $validateExitCode!" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Validation passed" -ForegroundColor Green
Write-Host ""

# Success message
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Build Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Executable location: dist\win-unpacked\LazyVid.exe" -ForegroundColor White
Write-Host ""
