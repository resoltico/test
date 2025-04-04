"""
Element processors for the web2json application.

This package contains specialized processors for different types of HTML elements
that transform them into structured JSON representations.
"""

from web2json.processors.base import ElementProcessor
from web2json.processors.text import TextProcessor
from web2json.processors.tables import TableProcessor
from web2json.processors.lists import ListProcessor

__all__ = [
    "ElementProcessor",
    "TextProcessor",
    "TableProcessor",
    "ListProcessor",
]
