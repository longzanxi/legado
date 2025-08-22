param(
  [string]$Version = ""
)

$ErrorActionPreference = "Stop"
$dist = Join-Path $PSScriptRoot "..\dist"
New-Item -ItemType Directory -Force -Path $dist | Out-Null

Write-Host "Building Legado Windows .exe..."
Write-Host "Version: $Version"
Write-Host "Output directory: $dist"

# Navigate to windows-app directory
Push-Location (Join-Path $PSScriptRoot "..\windows-app")

try {
    # Check if this is a Node.js project with package.json
    if (-not (Test-Path "package.json")) {
        throw "package.json not found in windows-app directory"
    }

    # Install Node.js if not available
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Host "Node.js not found, installing via Chocolatey..."
        if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
            Write-Host "Installing Chocolatey..."
            Set-ExecutionPolicy Bypass -Scope Process -Force
            [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
            Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        }
        choco install -y nodejs
        # Refresh environment variables
        $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
    }

    # Verify Node.js installation
    node --version
    npm --version

    # Install dependencies
    Write-Host "Installing dependencies..."
    npm ci

    # Update version in package.json if provided
    if ($Version) {
        Write-Host "Updating version to $Version in package.json..."
        $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
        $packageJson.version = $Version
        $packageJson | ConvertTo-Json -Depth 10 | Set-Content "package.json"
    }

    # Build portable executable
    Write-Host "Building Windows executable..."
    npm run build:win:portable

    # Find the generated executable
    $exeFiles = Get-ChildItem "dist" -Filter "*.exe" -Recurse
    if ($exeFiles.Count -eq 0) {
        throw "No .exe file found after build"
    }

    # Copy the executable to the target location
    $sourceExe = $exeFiles[0].FullName
    $targetName = if ($Version) { "legado-v$Version.exe" } else { "legado.exe" }
    $targetExe = Join-Path $dist $targetName
    
    Write-Host "Copying $sourceExe to $targetExe"
    Copy-Item $sourceExe $targetExe -Force

    Write-Host "Successfully built: $targetExe"
    Write-Host "File size: $((Get-Item $targetExe).Length / 1MB) MB"

} catch {
    Write-Error "Build failed: $($_.Exception.Message)"
    exit 1
} finally {
    Pop-Location
}