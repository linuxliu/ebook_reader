# Packaging and Distribution Guide

This document explains how to build, package, and distribute the Electron Ebook Reader application.

## Prerequisites

- Node.js 18 or later
- npm or yarn
- Platform-specific requirements:
  - **Windows**: Windows 10 or later
  - **macOS**: macOS 10.15 or later, Xcode Command Line Tools
  - **Linux**: Ubuntu 18.04 or later (or equivalent)

## Quick Start

### Build for Current Platform

```bash
# Build application only
npm run build

# Build and package for current platform
npm run dist

# Build portable version (Windows only)
npm run build:portable
```

### Build for Specific Platforms

```bash
# Windows
npm run dist:win

# macOS
npm run dist:mac

# Linux
npm run dist:linux

# All platforms
npm run dist:all
```

### Advanced Build Options

```bash
# Clean build directories
npm run build:clean

# Full clean build for all platforms
npm run build:full

# Use custom build script
node scripts/build.js <command>
```

## Build Script Commands

The `scripts/build.js` script provides several commands:

- `clean` - Clean build directories
- `build` - Build application only
- `win` - Build for Windows
- `mac` - Build for macOS
- `linux` - Build for Linux
- `all` - Build for all platforms
- `portable` - Create portable version
- `full` - Clean, build, and package for all platforms

## Environment Variables

### Code Signing

#### Windows
```bash
export CSC_LINK="path/to/certificate.p12"
export CSC_KEY_PASSWORD="certificate_password"
```

#### macOS
```bash
export CSC_IDENTITY_AUTO_DISCOVERY=true
export APPLE_ID="your@apple.id"
export APPLE_ID_PASSWORD="app_specific_password"
export APPLE_TEAM_ID="your_team_id"
```

### Build Configuration
```bash
export BUILD_TARGET="nsis"        # Specific build target
export BUILD_ARCH="x64"           # Target architecture
export BUILD_NUMBER="123"         # Build number for versioning
export NODE_ENV="production"      # Environment
```

## Output Files

Built applications are saved to the `release/` directory:

### Windows
- `*.exe` - NSIS installer
- `*-portable.exe` - Portable executable
- `*.zip` - Zip archive

### macOS
- `*.dmg` - DMG installer
- `*.zip` - Zip archive

### Linux
- `*.AppImage` - AppImage executable
- `*.deb` - Debian package
- `*.rpm` - RPM package

## Auto-Updates

The application includes auto-update functionality using `electron-updater`.

### Configuration

Auto-updates are configured in `package.json`:

```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "your-github-username",
      "repo": "electron-ebook-reader"
    }
  }
}
```

### GitHub Releases

1. Create a new release on GitHub with a version tag (e.g., `v1.0.1`)
2. Upload the built files to the release
3. The application will automatically check for updates

### Development Testing

For testing auto-updates in development:

1. Start the update server:
   ```bash
   npm run update-server
   ```

2. Build the application with development update configuration
3. Test update functionality

## Code Signing

### Windows Code Signing

1. Obtain a code signing certificate (.p12 file)
2. Set environment variables:
   ```bash
   export CSC_LINK="path/to/certificate.p12"
   export CSC_KEY_PASSWORD="password"
   ```
3. Build the application

### macOS Code Signing

1. Install Xcode and sign in with Apple Developer account
2. Set environment variables:
   ```bash
   export APPLE_ID="your@apple.id"
   export APPLE_ID_PASSWORD="app_specific_password"
   export APPLE_TEAM_ID="team_id"
   ```
3. Build the application

### Linux Code Signing

Linux packages can be signed using GPG keys. Configure in `electron-builder` configuration.

## CI/CD with GitHub Actions

The repository includes a GitHub Actions workflow (`.github/workflows/build-and-release.yml`) that:

1. Runs tests on all platforms
2. Builds the application for Windows, macOS, and Linux
3. Creates GitHub releases automatically
4. Publishes updates for auto-updater

### Setup

1. Add the following secrets to your GitHub repository:
   - `CSC_LINK` - Base64 encoded certificate file
   - `CSC_KEY_PASSWORD` - Certificate password
   - `APPLE_ID` - Apple ID for notarization
   - `APPLE_ID_PASSWORD` - App-specific password
   - `APPLE_TEAM_ID` - Apple Developer Team ID

2. Push a tag to trigger the build:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

## Troubleshooting

### Common Issues

#### Build Fails on macOS
- Ensure Xcode Command Line Tools are installed
- Check code signing certificates
- Verify Apple Developer account access

#### Windows Build Issues
- Install Windows Build Tools
- Check certificate file path and password
- Ensure proper file permissions

#### Linux Build Issues
- Install required system dependencies
- Check AppImage and package creation tools

### Debug Mode

Enable debug output:
```bash
DEBUG=electron-builder npm run dist
```

### Clean Build

If builds are failing, try a clean build:
```bash
npm run build:clean
npm run build:full
```

## File Associations

The application automatically registers file associations for:
- `.epub` files
- `.pdf` files
- `.mobi` files
- `.txt` files

This is configured in the NSIS installer script (`build/installer.nsh`).

## Distribution Channels

### Direct Download
- Host files on your website
- Provide download links for each platform

### Package Managers
- **Windows**: Consider publishing to Chocolatey or Scoop
- **macOS**: Consider publishing to Homebrew Cask
- **Linux**: Consider publishing to Snap Store or Flatpak

### App Stores
- **Microsoft Store**: Package as MSIX
- **Mac App Store**: Follow Apple's guidelines
- **Linux**: Snap Store, Flathub

## Security Considerations

1. **Code Signing**: Always sign your applications
2. **Update Security**: Use HTTPS for update servers
3. **Certificate Management**: Keep certificates secure
4. **Dependency Scanning**: Regularly scan for vulnerabilities

## Performance Optimization

1. **Bundle Size**: Minimize dependencies
2. **Compression**: Use maximum compression
3. **Caching**: Implement proper caching strategies
4. **Lazy Loading**: Load modules on demand

## Support

For build and packaging issues:
1. Check the troubleshooting section
2. Review electron-builder documentation
3. Check GitHub Issues
4. Contact the development team