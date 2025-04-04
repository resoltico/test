"""
Models for the web2json application.

This package contains data classes and models that represent the
structure of documents and configuration for the application.
"""

from web2json.models.config import FetchConfig, OutputConfig, ProcessingConfig, Web2JsonConfig
from web2json.models.document import Document
from web2json.models.section import Section

__all__ = [
    "Document",
    "Section",
    "Web2JsonConfig",
    "ProcessingConfig",
    "FetchConfig",
    "OutputConfig",
]
