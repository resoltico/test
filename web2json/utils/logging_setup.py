"""
Setup for structured logging in the web2json application.
"""

import logging
import sys
import time
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


class Timer:
    """Context manager for timing code execution."""
    
    def __init__(self, name: str, logger: Optional[structlog.BoundLogger] = None):
        """
        Initialize the timer.
        
        Args:
            name: The name of the operation being timed.
            logger: Optional logger to log the timing information.
        """
        self.name = name
        self.logger = logger or structlog.get_logger()
        self.start_time = 0.0
        self.end_time = 0.0
    
    def __enter__(self) -> "Timer":
        """Start the timer when entering the context."""
        self.start_time = time.time()
        self.logger.debug(f"Starting: {self.name}")
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        """
        End the timer when exiting the context and log the duration.
        
        Args:
            exc_type: Exception type if an exception was raised.
            exc_val: Exception value if an exception was raised.
            exc_tb: Exception traceback if an exception was raised.
        """
        self.end_time = time.time()
        duration = self.end_time - self.start_time
        
        if exc_type:
            # Log as error if there was an exception
            self.logger.error(
                f"Failed: {self.name}",
                duration=f"{duration:.3f}s",
                error=str(exc_val),
            )
        else:
            # Log as info for successful completion
            self.logger.info(
                f"Completed: {self.name}",
                duration=f"{duration:.3f}s",
            )
    
    @property
    def duration(self) -> float:
        """
        Get the duration of the operation in seconds.
        
        Returns:
            The duration in seconds, or 0 if the timer hasn't completed.
        """
        if self.end_time > 0:
            return self.end_time - self.start_time
        elif self.start_time > 0:
            return time.time() - self.start_time
        return 0.0
