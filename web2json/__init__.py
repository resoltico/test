"""
web2json - Enhanced web page to structured JSON converter
Copyright (c) 2024 Ervins Strauhmanis
Licensed under the MIT License
"""

from .core import (
    validate_url,
    fetch_page,
    parse_content,
    get_element_text,
    save_json,
    load_json
)
from .utils import (
    expand_path,
    is_safe_path,
    sanitize_filename,
    validate_output_path,
    generate_filename,
    setup_logging
)
from .data import ContentSchema, MetadataSchema
from .config import VERSION

__version__ = VERSION
__author__ = "Ervins Strauhmanis"
__license__ = "MIT"

__all__ = [
    'validate_url',
    'fetch_page',
    'parse_content',
    'get_element_text',
    'save_json',
    'load_json',
    'expand_path',
    'is_safe_path',
    'sanitize_filename',
    'validate_output_path',
    'generate_filename',
    'setup_logging',
    'ContentSchema',
    'MetadataSchema'
]