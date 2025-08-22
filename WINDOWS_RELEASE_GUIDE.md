# Windows Release Automation - Implementation Guide

## Overview

This implementation adds automatic Windows .exe generation and release for the Legado project. When a tag starting with "v" is pushed (e.g., `v3.24.081407`), the system automatically:

1. Builds a Windows portable executable
2. Performs smoke testing
3. Generates SHA256 checksums
4. Publishes to GitHub Releases

## Components

### 1. Release Workflow (`.github/workflows/release-windows.yml`)
- **Trigger**: Git tags matching `v*` pattern
- **Runner**: `windows-latest` for native Windows builds
- **Permissions**: Minimal (`contents: write` only)
- **Security**: Fixed action versions, no floating dependencies

### 2. Build Script (`scripts/build-windows-exe.ps1`)
- **Language**: PowerShell (Windows-native)
- **Functionality**: Node.js/Electron detection and building
- **Output**: Portable .exe in `dist/legado-vX.Y.Z.exe`
- **Error Handling**: Comprehensive logging and failure detection

### 3. Application Updates (`windows-app/`)
- **Package.json**: Added portable build target configuration
- **Main.js**: Added CLI arguments (`--version`, `--help`)
- **Icons**: Basic Windows icon files for branding

## Usage

### For Maintainers

1. **Create Release**:
   ```bash
   git tag v3.24.081407
   git push origin v3.24.081407
   ```

2. **Monitor Build**: Check GitHub Actions for build progress

3. **Verify Release**: Release will appear automatically with:
   - `legado-v3.24.081407.exe` (portable executable)
   - `checksums.sha256` (verification file)
   - Auto-generated release notes

### For Users

1. **Download**: Get latest .exe from [Releases](https://github.com/longzanxi/legado/releases)

2. **Verify** (recommended):
   ```cmd
   certutil -hashfile legado-v3.24.081407.exe SHA256
   ```

3. **Run**: Double-click the .exe (no installation required)

## Security Features

- **File Integrity**: SHA256 checksums for all releases
- **Minimal Permissions**: GitHub Actions uses least-privilege access
- **Fixed Dependencies**: All third-party actions pinned to specific versions
- **Transparency**: Full build logs available in GitHub Actions

## Testing

### Manual Testing
```bash
cd windows-app
npm install
npm run build:win:portable
```

### Smoke Test Simulation
```bash
node main.js --version
node main.js --help
```

## Troubleshooting

### Common Issues

1. **Build Fails**: Check Node.js version compatibility
2. **Smoke Test Fails**: Verify Electron app starts properly
3. **Release Not Created**: Ensure tag follows `v*` pattern
4. **Large File Size**: Normal for Electron apps (~170MB)

### Debug Steps

1. Check GitHub Actions logs
2. Verify package.json configuration
3. Test build locally on Windows
4. Validate workflow YAML syntax

## Version History

- **v1.0**: Initial implementation with basic Windows support
- **Future**: Code signing, installer options, auto-update support

## Maintenance

- **Dependencies**: Update action versions annually
- **Security**: Monitor for vulnerabilities in build tools
- **Documentation**: Keep download instructions current