# GitHub Actions Workflows

This directory contains GitHub Actions workflows for LazyVid.

## Workflows

### build.yml
Runs on every push to main/master/develop branches and on pull requests. This workflow:
- Runs tests
- Builds the Windows application
- Validates the build
- Uploads build artifacts (retained for 30 days)

### release.yml
Triggers automatically on pushes to main/master branches. This workflow:
- Runs tests on both macOS and Windows
- Builds release distributables for macOS (DMG, ZIP) and Windows (NSIS installer, ZIP)
- Creates a GitHub release with auto-generated release notes
- Uploads all build artifacts to the release

## Release Process

Every commit to main/master will trigger an automatic release with a version tag like:
- `v123-20240315-143022` (where 123 is the GitHub run number and timestamp)

The release will include:
- **macOS**: DMG installer and ZIP archive (both ARM64 and x64)
- **Windows**: NSIS installer (.exe) and ZIP archive (x64)

## Manual Release

If you need to create a release manually, you can:
1. Tag a commit: `git tag v1.0.0`
2. Push the tag: `git push origin v1.0.0`
3. The release workflow will automatically run

## Notes

- Code signing is disabled (identity: null) for easier local development
- Artifacts are uploaded as GitHub releases automatically
- The build process includes FFmpeg dependencies via asar unpacking
