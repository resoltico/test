"""
Entry point module for web2json package.
Allows running the package as a module: python -m web2json
"""
import sys
from .cli import main

if __name__ == "__main__":
    sys.exit(main())