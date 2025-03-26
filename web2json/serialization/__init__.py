"""
Serialization package for web2json.

This package provides utilities for serializing and deserializing web2json
data models to and from JSON.
"""
from .json import (
    serialize_to_json,
    deserialize_from_json,
    save_to_file,
    load_from_file,
    validate_document
)
from .converters import (
    converter,
    unstructure_dict,
    structure_document_from_dict,
    structure_metadata_from_dict
)

__all__ = [
    'serialize_to_json',
    'deserialize_from_json',
    'save_to_file',
    'load_from_file',
    'validate_document',
    'converter',
    'unstructure_dict',
    'structure_document_from_dict',
    'structure_metadata_from_dict'
]