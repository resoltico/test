"""
Setup for structured logging in the web2json application.
"""

import logging
import sys
from typing import Any, Optional

import structlog
from rich.console import Console
from rich.logging import RichHandler


def setup_logging(log_level: str = "INFO") -> None:
    """
    Set up structured logging with console output.
    
    Args:
        log_level: The logging level to use (DEBUG, INFO, WARNING, ERROR, CRITICAL).
    """
    # Convert string log level to numeric value
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    
    # Configure the root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)
    
    # Remove any existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Set up console output with rich formatting
    console = Console()
    console_handler = RichHandler(
        console=console,
        rich_tracebacks=True,
        tracebacks_show_locals=True,
        show_time=True,
        show_path=False,
    )
    console_handler.setLevel(numeric_level)
    root_logger.addHandler(console_handler)
    
    # Configure structlog
    structlog.configure(
        processors=[
            # Add timestamps in ISO format
            structlog.processors.TimeStamper(fmt="iso"),
            
            # Add logger name
            structlog.stdlib.add_logger_name,
            
            # Add log level
            structlog.stdlib.add_log_level,
            
            # Format exceptions
            structlog.processors.ExceptionPrettyPrinter(),
            
            # Format with console renderer for terminal output
            structlog.dev.ConsoleRenderer(
                exception_formatter=structlog.dev.plain_traceback,
                colors=True,
            ),
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
