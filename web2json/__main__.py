"""
Main entry point for the web2json application.
"""

import sys
from typing import List, Optional

import structlog

from web2json.cli import run
from web2json.utils.logging_setup import setup_logging


logger = structlog.get_logger(__name__)


def main(args: Optional[List[str]] = None) -> int:
    """
    Main entry point for the web2json application.
    
    Args:
        args: Command-line arguments (defaults to sys.argv if not provided).
        
    Returns:
        Exit code (0 for success, non-zero for failure).
    """
    # Set up logging
    setup_logging()
    
    try:
        # Run the CLI application
        run()
        return 0
    except Exception as e:
        logger.exception("Unhandled exception", error=str(e))
        return 1


if __name__ == "__main__":
    sys.exit(main())
