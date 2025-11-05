#!/bin/bash
# LazyVid Build Script for macOS
# Builds the macOS distributable and prepares it for distribution

# Enable strict error handling
set -e

# ANSI color codes
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}========================================"
echo -e "LazyVid Build Script (macOS)"
echo -e "========================================${NC}"
echo ""

# Step 1: Clean dist folder
echo -e "${YELLOW}[1/4] Cleaning dist folder...${NC}"
if [ -d "dist" ]; then
    rm -rf dist
    echo -e "${GREEN}[OK] Cleaned dist folder${NC}"
else
    echo -e "${GREEN}[OK] No dist folder to clean${NC}"
fi
echo ""

# Step 2: Run npm run dist
echo -e "${YELLOW}[2/4] Building distributable with electron-builder...${NC}"
if npm run dist; then
    # Check for architecture-specific build output
    if [ -d "dist/mac-arm64/LazyVid.app" ]; then
        MAC_BUILD_DIR="dist/mac-arm64"
        echo -e "${GREEN}[OK] Build completed (ARM64)${NC}"
    elif [ -d "dist/mac/LazyVid.app" ]; then
        MAC_BUILD_DIR="dist/mac"
        echo -e "${GREEN}[OK] Build completed (x64)${NC}"
    else
        echo -e "${RED}[ERROR] Build completed but LazyVid.app was not created!${NC}"
        exit 1
    fi
else
    echo -e "${RED}[ERROR] Build failed with exit code $?!${NC}"
    exit 1
fi
echo ""

# Step 3: Verify node_modules were packaged
echo -e "${YELLOW}[3/4] Verifying node_modules were packaged...${NC}"
if [ -d "$MAC_BUILD_DIR/LazyVid.app/Contents/Resources/app.asar.unpacked/node_modules/@ffmpeg-installer" ]; then
    echo -e "${GREEN}[OK] FFmpeg node_modules verified in app.asar.unpacked${NC}"
elif [ -d "$MAC_BUILD_DIR/LazyVid.app/Contents/Resources/app.asar.unpacked/node_modules" ]; then
    echo -e "${YELLOW}[WARNING] node_modules found but @ffmpeg-installer may be missing${NC}"
else
    echo -e "${RED}[ERROR] node_modules not found in packaged app!${NC}"
    echo -e "${RED}This may cause FFmpeg to fail. Check your electron-builder configuration.${NC}"
    exit 1
fi
echo ""

# Step 4: Run validation
echo -e "${YELLOW}[4/4] Running validation...${NC}"
if npm run validate; then
    echo -e "${GREEN}[OK] Validation passed${NC}"
else
    echo -e "${RED}[ERROR] Validation failed with exit code $?!${NC}"
    exit 1
fi
echo ""

# Success message
echo -e "${CYAN}========================================"
echo -e "${GREEN}Build Complete!${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "Application location: ${NC}$MAC_BUILD_DIR/LazyVid.app"
echo ""
