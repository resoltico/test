"""
web2json - A tool to transform web pages into structured JSON.

This package provides functionality to fetch web pages, analyze their
structure, and transform them into a structured JSON format that preserves
the semantic hierarchy of the original HTML.
"""

from importlib.metadata import version, PackageNotFoundError

try:
    __version__ = version("web2json")
except PackageNotFoundError:
    __version__ = "0.3.0"

# Import core components for easier access
from web2json.core.transformer import Transformer
from web2json.core.fetcher import WebFetcher
from web2json.core.parser import HtmlParser
from web2json.core.serializer import JsonSerializer
from web2json.models.document import Document
from web2json.models.section import Section
from web2json.models.config import Web2JsonConfig

__all__ = [
    "Transformer",
    "WebFetcher",
    "HtmlParser",
    "JsonSerializer",
    "Document",
    "Section",
    "Web2JsonConfig",
    "__version__",
]
