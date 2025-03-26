"""
File system utilities for web2json.

This module provides utilities for file system operations.
"""
import os
import logging
import unicodedata
from pathlib import Path
from datetime import datetime
from typing import Optional, Tuple, Union
from urllib.parse import urlparse

from web2json.utils.errors import PathError

# Default values
MAX_FILENAME_LENGTH = 255
MAX_PATH_LENGTH = 50
DEFAULT_OUTPUT_FOLDER = Path("fetched_jsons")


def expand_path(path: Union[str, Path]) -> Path:
    """Expand and normalize path.
    
    Args:
        path: Path to expand
        
    Returns:
        Expanded path
        
    Raises:
        PathError: If path expansion fails
    """
    try:
        if not path:
            raise ValueError("Path cannot be empty")
        
        path_str = str(path)
        expanded = os.path.expanduser(path_str)
        expanded = os.path.expandvars(expanded)
        return Path(os.path.normpath(expanded))
    except Exception as e:
        raise PathError(f"Failed to expand path '{path}': {str(e)}")


def is_safe_path(base_dir: Union[str, Path], path: Union[str, Path]) -> bool:
    """Check if path is within base directory.
    
    Args:
        base_dir: Base directory
        path: Path to check
        
    Returns:
        True if path is within base directory
    """
    try:
        if not path or not base_dir:
            return False
        
        base_abs = os.path.abspath(str(base_dir))
        path_abs = os.path.abspath(str(path))
        common = os.path.commonpath([base_abs, path_abs])
        return common == base_abs
    except Exception:
        return False


def sanitize_filename(filename: str) -> str:
    """Sanitize filename for safe OS processing.
    
    Args:
        filename: Filename to sanitize
        
    Returns:
        Sanitized filename
    """
    # Handle empty filenames
    if not filename:
        return ""
    
    # Normalize path separators and handle Unicode
    name = os.path.normpath(filename)
    name = unicodedata.normalize('NFKD', name).encode('ASCII', 'ignore').decode('ASCII')
    
    # Handle the special case for ..hiddenfile
    if os.path.basename(name).startswith('..'):
        base = os.path.basename(name)[2:]  # Remove the leading ..
    else:
        # Split into path components and process each
        parts = [part for part in name.split(os.path.sep) if part and not part.startswith('.')]
        if not parts:
            return ""
        base = '_'.join(parts)
    
    # Split into base name and extension
    if '.' in base:
        name_base, ext = os.path.splitext(base)
    else:
        name_base, ext = base, ''
    
    # Replace dots with underscores in the base name
    name_base = name_base.replace('.', '_')
    
    # Handle special characters in the base name
    sanitized = ""
    prev_replaced = False
    
    for c in name_base:
        if c.isalnum():
            sanitized += c
            prev_replaced = False
        elif not prev_replaced:
            sanitized += '_'
            prev_replaced = True
    
    # Remove trailing underscore if present
    sanitized = sanitized.rstrip('_')
    
    # Return with extension if it exists
    return sanitized + ext if ext else sanitized


def validate_output_path(dir_path: Union[str, Path], filename: str) -> Path:
    """Validate and prepare output path.
    
    Args:
        dir_path: Directory path
        filename: Filename
        
    Returns:
        Full validated path
        
    Raises:
        ValueError: If path is invalid
        PathError: If path creation fails
    """
    try:
        path_obj = Path(dir_path) / filename
        
        if len(str(path_obj)) > MAX_FILENAME_LENGTH:
            logging.error(f"Path exceeds maximum length of {MAX_FILENAME_LENGTH}")
            raise ValueError(f"Path exceeds maximum length of {MAX_FILENAME_LENGTH}")
        
        if not path_obj.parent.exists():
            try:
                path_obj.parent.mkdir(parents=True, exist_ok=True)
            except Exception as e:
                logging.error(f"Failed to create directory: {str(e)}")
                raise PathError(f"Failed to create directory: {str(e)}")
        elif not os.access(path_obj.parent, os.W_OK):
            logging.error(f"No write permission for directory: {path_obj.parent}")
            raise PathError(f"No write permission for directory: {path_obj.parent}")
        
        return path_obj
    
    except ValueError as e:
        raise e
    except Exception as e:
        logging.error(f"Path validation error: {str(e)}")
        raise PathError(f"Path validation error: {str(e)}")


def generate_filename(url: str, output_dir: Union[str, Path]) -> Tuple[Path, str]:
    """Generate safe filename from URL.
    
    Args:
        url: Source URL
        output_dir: Output directory
        
    Returns:
        Tuple of (directory path, filename)
        
    Raises:
        PathError: If filename generation fails
    """
    if not url or not output_dir:
        raise PathError("URL and output directory cannot be empty")
    
    try:
        # Convert output_dir to Path and expand
        output_path = expand_path(output_dir)
        
        # Parse URL for domain and path
        parsed = urlparse(url)
        domain = parsed.netloc.replace(".", "_")
        path = parsed.path.replace("/", "_").strip("_")[:MAX_PATH_LENGTH]
        
        # Add timestamp for uniqueness
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Create base filename
        filename = f"{domain}_{path}_{timestamp}"
        
        # Ensure filename length is valid
        max_base_length = MAX_FILENAME_LENGTH - 5  # Allow for .json extension
        if len(filename) > max_base_length:
            filename = filename[:max_base_length]
        
        # Add .json extension
        filename = f"{filename}.json"
        
        return output_path, filename
    
    except Exception as e:
        raise PathError(f"Failed to generate filename: {str(e)}")


def ensure_directory(directory: Union[str, Path]) -> Path:
    """Ensure directory exists, creating it if necessary.
    
    Args:
        directory: Directory path
        
    Returns:
        Path object for the directory
        
    Raises:
        PathError: If directory creation fails
    """
    path = Path(directory)
    try:
        path.mkdir(parents=True, exist_ok=True)
        return path
    except Exception as e:
        raise PathError(f"Failed to create directory {directory}: {str(e)}")
