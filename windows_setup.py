"""
Windows configuration helper for web2json with Poetry.
This script handles the complete installation process for web2json on Windows systems.

The installation is split into two phases to handle Windows environment variable limitations:
1. Initial phase (this script) - Sets up Scoop, pipx, and Poetry
2. Post-restart phase - Completes dependency installation after PATH changes take effect
"""
import os
import sys
import subprocess
import re
from pathlib import Path


def is_powershell_available():
    """Check if PowerShell is available on the system."""
    try:
        result = subprocess.run(
            ["powershell", "-Command", "echo 'PowerShell is available'"],
            capture_output=True,
            text=True,
            check=True
        )
        return True
    except Exception:
        return False


def is_tool_in_path(tool_name):
    """Check if a tool is available in the system PATH."""
    try:
        result = subprocess.run(
            ["where", tool_name],
            capture_output=True,
            text=True
        )
        return result.returncode == 0
    except Exception:
        return False


def install_scoop():
    """Install Scoop package manager and create the setup completion scripts."""
    print("Installing Scoop package manager...")
    
    try:
        # Set PowerShell execution policy to allow script execution
        subprocess.run(
            ["powershell", "-Command", "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser"],
            check=True
        )
        
        # Install Scoop using the official installer
        subprocess.run(
            ["powershell", "-Command", 
             "Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression"],
            check=True
        )
        
        print("[OK] Scoop installed successfully")
        
        # Create the main PowerShell script
        create_powershell_scripts()
        
        print("\n[OK] Created PowerShell setup scripts")
        print("\nIMPORTANT: You need to run the next part of the setup in a new PowerShell window.")
        print("The PATH changes from installing Scoop won't be available in this session.")
        print("\nPlease follow these steps:")
        print("1. Open a new PowerShell window")
        print("2. Navigate to this directory:")
        print(f"   cd {os.path.abspath(os.path.dirname(__file__))}")
        print("3. Run the first setup script:")
        print("   .\\complete_setup-part1.ps1")
        print("4. After system restart, run the second setup script:")
        print("   .\\complete_setup-part2.ps1")
        
        return True
    except Exception as e:
        print(f"[ERROR] Installing Scoop: {e}")
        print("\nPlease install Scoop manually:")
        print("1. Open PowerShell")
        print("2. Run: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser")
        print("3. Run: Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression")
        return False


def create_powershell_scripts():
    """Create the PowerShell scripts for both parts of the installation."""
    # Get the current directory for the batch file
    current_dir = os.path.abspath(os.path.dirname(__file__))
    
    # Create Part 1 script - Runs after Scoop is installed but before system restart
    with open("complete_setup-part1.ps1", "w", encoding="utf-8") as f:
        # Script header
        f.write("# web2json setup script part 1 - Run after Scoop installation\n\n")
        
        # Step 1: Install pipx using Scoop
        f.write("Write-Host 'Step 1: Installing pipx...' -ForegroundColor Cyan\n")
        f.write("scoop install pipx\n")
        f.write("if ($LASTEXITCODE -ne 0) {\n")
        f.write("    Write-Host 'Error installing pipx. Please try again or install manually.' -ForegroundColor Red\n")
        f.write("    exit 1\n")
        f.write("}\n\n")
        
        # Step 2: Ensure pipx is in PATH
        f.write("Write-Host 'Step 2: Setting up pipx...' -ForegroundColor Cyan\n")
        f.write("pipx ensurepath\n")
        f.write("Write-Host 'NOTE: pipx has been added to PATH, but will only be available after restart.' -ForegroundColor Yellow\n\n")
        
        # Step 3: Install Poetry using pipx
        f.write("Write-Host 'Step 3: Installing Poetry...' -ForegroundColor Cyan\n")
        f.write("pipx install poetry\n")
        f.write("if ($LASTEXITCODE -ne 0) {\n")
        f.write("    Write-Host 'Error installing Poetry. Please try again or install manually.' -ForegroundColor Red\n")
        f.write("    exit 1\n")
        f.write("}\n")
        f.write("Write-Host 'NOTE: Poetry has been installed, but will only be available in PATH after restart.' -ForegroundColor Yellow\n\n")
        
        # Step 4: Locate Poetry executable for direct use
        f.write("# Find Poetry's location for direct access\n")
        f.write("$poetryPath = \"$env:USERPROFILE\\.local\\bin\\poetry.exe\"\n")
        f.write("if (-not (Test-Path $poetryPath)) {\n")
        f.write("    # Try alternative location\n")
        f.write("    $poetryPath = \"$env:USERPROFILE\\AppData\\Roaming\\Python\\Scripts\\poetry.exe\"\n")
        f.write("    if (-not (Test-Path $poetryPath)) {\n")
        f.write("        Write-Host 'Could not find Poetry executable path.' -ForegroundColor Yellow\n")
        f.write("        $poetryPath = $null\n")
        f.write("    }\n")
        f.write("}\n\n")
        
        # Step 5: Download lxml wheel to avoid compilation issues
        f.write("Write-Host 'Step 4: Preparing lxml package...' -ForegroundColor Cyan\n")
        f.write("# Create a temporary virtual environment for pip\n")
        f.write("python -m venv .lxml_temp_env\n")
        f.write("if ($LASTEXITCODE -eq 0) {\n")
        f.write("    # Install wheel package\n")
        f.write("    .lxml_temp_env\\Scripts\\pip install wheel\n")
        f.write("    # Download lxml binary wheel\n")
        f.write("    .lxml_temp_env\\Scripts\\pip download --only-binary=:all: --dest=. lxml==5.3.1\n")
        f.write("    Write-Host 'Successfully downloaded lxml wheel' -ForegroundColor Green\n")
        f.write("} else {\n")
        f.write("    Write-Host 'Could not create temporary environment for lxml. Will try direct installation later.' -ForegroundColor Yellow\n")
        f.write("}\n\n")
        
        # Step 6: Create batch file for web2json
        f.write("Write-Host 'Step 5: Creating web2json launcher...' -ForegroundColor Cyan\n")
        f.write("$projectDir = \"" + current_dir.replace("\\", "\\\\") + "\"\n")
        f.write("$toolsDir = \"$env:USERPROFILE\\Tools\"\n")
        f.write("if (-not (Test-Path $toolsDir)) {\n")
        f.write("    New-Item -ItemType Directory -Path $toolsDir | Out-Null\n")
        f.write("}\n\n")
        
        # Create batch file that uses direct Poetry path when possible
        f.write("# Create the web2json.bat file\n")
        f.write("$batchContent = @\"\n")
        f.write("@echo off\n")
        f.write("cd \"" + current_dir.replace("\\", "\\\\") + "\"\n\n")
        f.write("REM Try direct Poetry path first, then fall back to PATH\n")
        f.write("set POETRY_PATH=%USERPROFILE%\\.local\\bin\\poetry.exe\n")
        f.write("if exist \"%POETRY_PATH%\" (\n")
        f.write("    \"%POETRY_PATH%\" run python -m web2json %*\n")
        f.write(") else (\n")
        f.write("    set POETRY_PATH=%USERPROFILE%\\AppData\\Roaming\\Python\\Scripts\\poetry.exe\n")
        f.write("    if exist \"%POETRY_PATH%\" (\n")
        f.write("        \"%POETRY_PATH%\" run python -m web2json %*\n")
        f.write("    ) else (\n")
        f.write("        poetry run python -m web2json %*\n")
        f.write("    )\n")
        f.write(")\n")
        f.write("\"@\n\n")
        f.write("$batchPath = \"$toolsDir\\web2json.bat\"\n")
        f.write("Set-Content -Path $batchPath -Value $batchContent -Encoding ASCII\n")
        f.write("Write-Host \"Created web2json launcher: $batchPath\" -ForegroundColor Green\n\n")
        
        # Step 7: Add Tools directory to PATH
        f.write("Write-Host 'Step 6: Updating PATH environment variable...' -ForegroundColor Cyan\n")
        f.write("$currentPath = [Environment]::GetEnvironmentVariable('Path', 'User')\n")
        f.write("if (-not $currentPath.Contains($toolsDir)) {\n")
        f.write("    [Environment]::SetEnvironmentVariable('Path', \"$currentPath;$toolsDir\", 'User')\n")
        f.write("    Write-Host \"Added $toolsDir to PATH\" -ForegroundColor Green\n")
        f.write("}\n\n")
        
        # Final message and next steps
        f.write("Write-Host \"`nPart 1 setup complete!\" -ForegroundColor Green\n")
        f.write("Write-Host \"`nIMPORTANT: You must restart your computer now.\" -ForegroundColor Yellow\n")
        f.write("Write-Host \"After restarting, run the part 2 script:\" -ForegroundColor Cyan\n")
        f.write("Write-Host \"   cd $projectDir\" -ForegroundColor White\n")
        f.write("Write-Host \"   .\\complete_setup-part2.ps1\" -ForegroundColor White\n\n")
        f.write("Write-Host \"Press any key to exit...\" -ForegroundColor Gray\n")
        f.write("$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')\n")
    
    # Create Part 2 script - Runs after system restart
    with open("complete_setup-part2.ps1", "w", encoding="utf-8") as f:
        # Script header
        f.write("# web2json setup script part 2 - Run after system restart\n\n")
        
        # Introduction
        f.write("Write-Host 'Completing web2json installation...' -ForegroundColor Cyan\n\n")
        
        # Verify Poetry is available
        f.write("# Verify Poetry installation\n")
        f.write("$poetryVersion = poetry --version 2>&1\n")
        f.write("if ($LASTEXITCODE -ne 0) {\n")
        f.write("    Write-Host 'Poetry not found in PATH. Checking for direct paths...' -ForegroundColor Yellow\n")
        f.write("    $poetryPath = \"$env:USERPROFILE\\.local\\bin\\poetry.exe\"\n")
        f.write("    if (-not (Test-Path $poetryPath)) {\n")
        f.write("        $poetryPath = \"$env:USERPROFILE\\AppData\\Roaming\\Python\\Scripts\\poetry.exe\"\n")
        f.write("    }\n")
        f.write("    if (Test-Path $poetryPath) {\n")
        f.write("        Write-Host \"Found Poetry at: $poetryPath\" -ForegroundColor Green\n")
        f.write("        # Use this path for commands\n")
        f.write("        $poetryCmd = \"& `\"$poetryPath`\"\"\n")
        f.write("    } else {\n")
        f.write("        Write-Host 'Poetry not found. Please ensure Poetry was installed successfully.' -ForegroundColor Red\n")
        f.write("        Write-Host 'Try manually running: pipx install poetry' -ForegroundColor Yellow\n")
        f.write("        exit 1\n")
        f.write("    }\n")
        f.write("} else {\n")
        f.write("    Write-Host \"Poetry detected: $poetryVersion\" -ForegroundColor Green\n")
        f.write("    $poetryCmd = \"poetry\"\n")
        f.write("}\n\n")
        
        # Install lxml separately if wheel file exists
        f.write("# Handle lxml installation separately\n")
        f.write("$lxmlWheel = Get-ChildItem -Path . -Filter \"lxml*.whl\" -File | Select-Object -First 1\n")
        f.write("# Initialize Poetry environment\n")
        f.write("Write-Host \"Creating Poetry virtual environment...\" -ForegroundColor Cyan\n")
        f.write("Invoke-Expression \"$poetryCmd env use python\"\n\n")
        
        # Get Poetry's virtual environment path
        f.write("# Get Poetry's virtual environment path\n")
        f.write("$envInfoOutput = Invoke-Expression \"$poetryCmd env info --path\"\n")
        f.write("$poetryEnvPath = $envInfoOutput\n")
        f.write("if ($poetryEnvPath) {\n")
        f.write("    Write-Host \"Poetry environment: $poetryEnvPath\" -ForegroundColor Cyan\n")
        f.write("    # If lxml wheel exists, install it directly\n")
        f.write("    if ($lxmlWheel) {\n")
        f.write("        Write-Host \"Installing lxml from wheel...\" -ForegroundColor Cyan\n")
        f.write("        & \"$poetryEnvPath\\Scripts\\pip\" install $lxmlWheel.FullName\n")
        f.write("        Write-Host \"lxml installed separately\" -ForegroundColor Green\n")
        f.write("    }\n")
        f.write("}\n\n")
        
        # Install dependencies with Poetry
        f.write("# Install dependencies with Poetry\n")
        f.write("Write-Host \"Installing web2json dependencies...\" -ForegroundColor Cyan\n")
        f.write("Invoke-Expression \"$poetryCmd install\"\n")
        f.write("if ($LASTEXITCODE -ne 0) {\n")
        f.write("    Write-Host \"Initial installation failed, trying alternate approach...\" -ForegroundColor Yellow\n")
        f.write("    # Try installing without dev dependencies\n")
        f.write("    Invoke-Expression \"$poetryCmd install --without dev\"\n")
        f.write("    if ($LASTEXITCODE -eq 0) {\n")
        f.write("        Write-Host \"Core dependencies installed successfully.\" -ForegroundColor Green\n")
        f.write("        Write-Host \"Note: Development dependencies were skipped.\" -ForegroundColor Yellow\n")
        f.write("    } else {\n")
        f.write("        Write-Host \"Installation failed. Please check error messages above.\" -ForegroundColor Red\n")
        f.write("        exit 1\n")
        f.write("    }\n")
        f.write("} else {\n")
        f.write("    Write-Host \"All dependencies installed successfully.\" -ForegroundColor Green\n")
        f.write("}\n\n")
        
        # Clean up temporary files
        f.write("# Clean up temporary files\n")
        f.write("if (Test-Path \".lxml_temp_env\") {\n")
        f.write("    Remove-Item -Recurse -Force .lxml_temp_env\n")
        f.write("}\n")
        f.write("if ($lxmlWheel) {\n")
        f.write("    Remove-Item $lxmlWheel.FullName\n")
        f.write("}\n\n")
        
        # Final success message
        f.write("Write-Host \"`nweb2json installation complete!\" -ForegroundColor Green\n")
        f.write("Write-Host \"`nYou can now use web2json from any command prompt:\" -ForegroundColor Cyan\n")
        f.write("Write-Host \"  web2json process -u https://example.com -o test_output\" -ForegroundColor White\n\n")
        f.write("Write-Host \"Press any key to exit...\" -ForegroundColor Gray\n")
        f.write("$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')\n")


def setup_windows():
    """Main setup function for Windows."""
    print("\n=== web2json Setup for Windows ===\n")
    
    # Check if PowerShell is available
    if not is_powershell_available():
        print("[ERROR] PowerShell is required for this installation method.")
        print("  Please ensure PowerShell is installed on your system.")
        return False
    
    # Check if Scoop is already installed
    if is_tool_in_path("scoop"):
        print("[OK] Scoop is already installed")
        
        # Even if Scoop is installed, we need to create the setup scripts
        create_powershell_scripts()
        
        print("\n[OK] Created PowerShell setup scripts")
        print("\nPlease follow these steps:")
        print("1. Open a new PowerShell window")
        print("2. Navigate to this directory:")
        print(f"   cd {os.path.abspath(os.path.dirname(__file__))}")
        print("3. Run the first setup script:")
        print("   .\\complete_setup-part1.ps1")
        print("4. After system restart, run the second setup script:")
        print("   .\\complete_setup-part2.ps1")
        
        return True
    
    # Install Scoop if not installed
    print("Scoop package manager is not installed.")
    return install_scoop()


if __name__ == "__main__":
    if os.name != 'nt':
        print("This script is only for Windows systems.")
        sys.exit(1)
    
    setup_windows()
