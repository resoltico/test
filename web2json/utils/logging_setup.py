"""
Setup for structured logging.
"""

import logging
import sys
import time
from typing import Any, Dict, Optional

import structlog
from rich.console import Console
from rich.logging import RichHandler


def setup_logging(
    log_level: str = "INFO",
    console_output: bool = True,
    log_file: Optional[str] = None,
    json_format: bool = False,
) -> None:
    """
    Set up structured logging with optional console and file outputs.
    
    Args:
        log_level: The logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL).
        console_output: Whether to output logs to the console.
        log_file: Optional path to a log file.
        json_format: Whether to use JSON format for the logs.
    """
    # Convert string log level to numeric value
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    
    # Configure the root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)
    
    # Remove any existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Define processors
    processors = [
        # Add timestamps in a standard format
        structlog.processors.TimeStamper(fmt="iso"),
        
        # Add the logger name
        structlog.stdlib.add_logger_name,
        
        # Add log level
        structlog.stdlib.add_log_level,
        
        # Perform %-style formatting
        structlog.stdlib.PositionalArgumentsFormatter(),
        
        # Format exceptions
        structlog.processors.ExceptionPrettyPrinter(),
    ]
    
    # Add filters and formatters based on configuration
    if json_format:
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(
            structlog.dev.ConsoleRenderer(
                colors=console_output,
                exception_formatter=structlog.dev.plain_traceback,
            )
        )
    
    # Configure structlog
    structlog.configure(
        processors=processors,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    
    # Set up console output if enabled
    if console_output:
        console = Console()
        console_handler = RichHandler(
            console=console,
            rich_tracebacks=True,
            tracebacks_show_locals=True,
            log_time_format="[%X]",
        )
        console_handler.setLevel(numeric_level)
        root_logger.addHandler(console_handler)
    
    # Set up file output if specified
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_formatter = logging.Formatter(
            "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
        )
        file_handler.setFormatter(file_formatter)
        file_handler.setLevel(numeric_level)
        root_logger.addHandler(file_handler)


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """
    Get a logger with the given name.
    
    Args:
        name: The logger name.
        
    Returns:
        A structlog logger.
    """
    return structlog.get_logger(name)


class Timer:
    """Context manager for timing code execution."""
    
    def __init__(self, name: str, logger: Optional[structlog.stdlib.BoundLogger] = None):
        """
        Initialize the timer.
        
        Args:
            name: The name of the operation being timed.
            logger: Optional logger to log the timing information.
        """
        self.name = name
        self.logger = logger or structlog.get_logger()
        self.start_time: float = 0.0
        self.end_time: float = 0.0
    
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
                duration=duration,
                error=str(exc_val),
            )
        else:
            # Log as info for successful completion
            self.logger.info(
                f"Completed: {self.name}",
                duration=duration,
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
