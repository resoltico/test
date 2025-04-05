"""
Core functionality for the web2json application.

This package contains the core components for fetching, parsing,
transforming, and serializing web pages to JSON.
"""

from web2json.core.fetcher import WebFetcher
from web2json.core.parser import HtmlParser
from web2json.core.serializer import JsonSerializer
from web2json.core.transformer import Transformer

__all__ = [
    "WebFetcher",
    "HtmlParser",
    "Transformer",
    "JsonSerializer",
]
