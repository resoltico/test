"""
Utility functions package for web2json.
"""
from web2json.utils.url import validate_url, normalize_url, extract_domain
from web2json.utils.filesystem import (
    generate_filename, 
    sanitize_filename,
    ensure_directory
)
from web2json.utils.errors import (
    Web2JsonError, 
    FetchError,
    ParseError,
    Result
)

__all__ = [
    'validate_url',
    'normalize_url',
    'extract_domain',
    'generate_filename',
    'sanitize_filename',
    'ensure_directory',
    'Web2JsonError',
    'FetchError',
    'ParseError',
    'Result'
]