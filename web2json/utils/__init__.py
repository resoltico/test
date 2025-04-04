"""
Utility functions and classes for the web2json application.
"""

from web2json.utils.html_utils import (
    clean_html_text,
    extract_element_text,
    extract_url_from_element,
    get_document_title,
    get_element_id,
    get_heading_level,
    get_nearest_heading,
    is_visible_element,
)
from web2json.utils.json_utils import (
    JsonPathFinder,
    clean_json_keys,
    clean_key,
    compare_json_structures,
    is_valid_json,
    minify_json,
    pretty_json,
    sort_json_keys,
)
from web2json.utils.logging_setup import Timer, get_logger, setup_logging

__all__ = [
    # HTML utilities
    "clean_html_text",
    "extract_element_text",
    "extract_url_from_element",
    "get_document_title",
    "get_element_id",
    "get_heading_level",
    "get_nearest_heading",
    "is_visible_element",
    
    # JSON utilities
    "JsonPathFinder",
    "clean_json_keys",
    "clean_key",
    "compare_json_structures",
    "is_valid_json",
    "minify_json",
    "pretty_json",
    "sort_json_keys",
    
    # Logging utilities
    "Timer",
    "get_logger",
    "setup_logging",
]
