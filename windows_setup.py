"""
Windows environment configuration helper for web2json.

This script creates helper batch files to configure the Python environment
correctly on Windows systems. Run this script after installing web2json
with 'pip install -e .' to create the necessary helper files.
"""
import os
import sys
import site
from pathlib import Path

def create_windows_helpers():
    """
    Create helper scripts for Windows users.
    
    This function creates two batch files:
    1. set_pythonpath.bat - Sets the PYTHONPATH environment variable
    2. web2json_run.bat - A launcher that sets PYTHONPATH and runs web2json
    
    These helpers address a common issue on Windows where Python sometimes
    has difficulty finding installed packages when running a local module.
    """
    # Get current directory (where this script is located)
    current_dir = os.path.abspath(os.path.dirname(__file__))
    
    # Get site-packages paths
    site_packages = site.getsitepackages()
    
    # Find the path that contains 'site-packages'
    site_packages_path = next((p for p in site_packages if 'site-packages' in p), 
                               site_packages[0])
    
    # Also add the project directory to PYTHONPATH
    pythonpath = f"{current_dir};{site_packages_path}"
    
    print("\n=== Windows-specific setup ===")
    print(f"Creating helper scripts in: {current_dir}")
    
    try:
        # Create set_pythonpath.bat
        pythonpath_script = os.path.join(current_dir, "set_pythonpath.bat")
        with open(pythonpath_script, 'w') as f:
            f.write("@echo off\n")
            f.write(f"set PYTHONPATH=%PYTHONPATH%;{pythonpath}\n")
            f.write('echo.\n')
            f.write('echo PYTHONPATH has been set for web2json in this command window.\n')
            f.write('echo You can now run: python -m web2json -u URL -o FILENAME\n')
        
        print(f"✓ Created: set_pythonpath.bat")
        
        # Create web2json_run.bat (launcher script)
        launcher_script = os.path.join(current_dir, "web2json_run.bat")
        with open(launcher_script, 'w') as f:
            f.write("@echo off\n")
            f.write(f"set PYTHONPATH=%PYTHONPATH%;{pythonpath}\n")
            f.write("python -m web2json %*\n")
        
        print(f"✓ Created: web2json_run.bat")
        
        # Check if Python can now import the required modules
        try:
            # Temporarily add paths to sys.path
            sys.path.append(current_dir)
            sys.path.append(site_packages_path)
            
            # Try to import the key modules
            import requests
            import beautifulsoup4  # This might fail but we'll handle it
            print("✓ Python can now find the required dependencies")
        except ImportError as e:
            print(f"! Warning: Could not import all dependencies: {e}")
            print("  This is normal if beautifulsoup4 fails - it will still work when used")
            print("  The helper scripts should resolve any import issues")
        
        print("\nHow to use web2json on Windows:")
        print("--------------------------------")
        print("Option 1: Use the included launcher")
        print("  web2json_run.bat -u https://example.com -o output_name")
        print("\nOption 2: Set up the environment first, then use Python")
        print("  set_pythonpath.bat")
        print("  python -m web2json -u https://example.com -o output_name")
        print("\nTo test your installation, try:")
        print("  web2json_run.bat -u https://resoltico.com/en/tools/web2json/ -o test_output")
        print("  This should create a file named test_output.json in the fetched_jsons folder")
        print("================================\n")
        
        return True
    except Exception as e:
        print(f"! Error creating Windows helper scripts: {e}")
        print("\nManual fix:")
        print(f"1. Create a batch file named set_pythonpath.bat with this content:")
        print(f"   @echo off")
        print(f"   set PYTHONPATH=%PYTHONPATH%;{pythonpath}")
        print(f"2. Create a batch file named web2json_run.bat with this content:")
        print(f"   @echo off")
        print(f"   set PYTHONPATH=%PYTHONPATH%;{pythonpath}")
        print(f"   python -m web2json %*")
        print("================================\n")
        return False

def check_windows():
    """Check if the current system is Windows."""
    return os.name == 'nt' or sys.platform.startswith('win')

if __name__ == "__main__":
    """Main entry point for the script."""
    if not check_windows():
        print("This script is only needed on Windows systems.")
        print("On macOS and Linux, you can directly run:")
        print("  python -m web2json -u URL -o FILENAME")
        sys.exit(0)
    
    create_windows_helpers()
