"""
Transform package for web2json.

This package provides functions for transforming document formats.
"""
from web2json.transform.hierarchical_converter import (
    convert_to_hierarchical,
    preserve_html_formatting
)

__all__ = [
    'convert_to_hierarchical',
    'preserve_html_formatting'
]
