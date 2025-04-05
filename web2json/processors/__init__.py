"""
Element processors for the web2json application.

This package contains specialized processors for different types of HTML elements
that transform them into structured JSON representations.
"""

from web2json.processors.base import ElementProcessor
from web2json.processors.text import TextProcessor
from web2json.processors.table import TableProcessor
from web2json.processors.list import ListProcessor
from web2json.processors.form import FormProcessor
from web2json.processors.media import MediaProcessor
from web2json.processors.semantic import SemanticProcessor

__all__ = [
    "ElementProcessor",
    "TextProcessor",
    "TableProcessor",
    "ListProcessor",
    "FormProcessor",
    "MediaProcessor",
    "SemanticProcessor",
]
