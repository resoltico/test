"""
JSON serialization utilities for web2json.

This module provides functions for serializing and deserializing web2json
data models to and from JSON.
"""
import json
import logging
import traceback
from pathlib import Path
from typing import Any, Dict, Optional, TextIO, Union

from ..data.models import Document, ContentItem, ListItem
from ..exceptions import ExportError
from .converters import unstructure_dict, structure_document_from_dict

logger = logging.getLogger(__name__)


class CustomJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle web2json objects."""
    
    def default(self, obj):
        """Convert objects to JSON serializable types."""
        if isinstance(obj, (Document, ContentItem, ListItem)):
            # For our custom classes, use the unstructure_dict function
            return unstructure_dict(obj)
        
        # For other types, just use the parent's implementation
        try:
            return super().default(obj)
        except TypeError:
            # If that fails, convert to string
            return str(obj)


def serialize_to_json(obj: Any, indent: int = 2) -> str:
    """
    Serialize an object to a JSON string.
    
    Args:
        obj: Object to serialize
        indent: JSON indentation level
        
    Returns:
        JSON string
    """
    try:
        # First convert the object to a dictionary using cattrs
        data = unstructure_dict(obj)
        
        # Then serialize to JSON using our custom encoder
        return json.dumps(
            data,
            indent=indent,
            ensure_ascii=False,
            cls=CustomJSONEncoder
        )
    except Exception as e:
        error_msg = f"Error serializing to JSON: {str(e)}"
        logger.error(error_msg)
        traceback.print_exc()
        raise ExportError(error_msg)


def deserialize_from_json(json_str: str) -> Document:
    """
    Deserialize a JSON string to a Document object.
    
    Args:
        json_str: JSON string to deserialize
        
    Returns:
        Document object
        
    Raises:
        ExportError: If deserialization fails
    """
    try:
        # First parse the JSON string to a dictionary
        data = json.loads(json_str)
        
        # Then convert the dictionary to a Document object using structure_document_from_dict
        return structure_document_from_dict(data)
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON format: {str(e)}")
        raise ExportError(f"Invalid JSON format: {str(e)}")
    except Exception as e:
        logger.error(f"Error deserializing from JSON: {str(e)}")
        traceback.print_exc()
        raise ExportError(f"Failed to deserialize from JSON: {str(e)}")


def save_to_file(obj: Any, filepath: Union[str, Path], indent: int = 2, encoding: str = 'utf-8') -> bool:
    """
    Save an object to a JSON file.
    
    Args:
        obj: Object to save
        filepath: Path to save to
        indent: JSON indentation level
        encoding: File encoding
        
    Returns:
        True if successful
        
    Raises:
        ExportError: If saving fails
    """
    try:
        # Convert filepath to Path object
        path = Path(filepath)
        
        # Ensure directory exists
        path.parent.mkdir(parents=True, exist_ok=True)
        
        # If we're saving a Document, first unstructure it to dict
        if isinstance(obj, Document):
            data = unstructure_dict(obj)
        else:
            data = obj
            
        # Serialize to JSON
        json_str = json.dumps(
            data,
            indent=indent,
            ensure_ascii=False,
            cls=CustomJSONEncoder
        )
        
        # Write to file
        with open(path, 'w', encoding=encoding) as f:
            f.write(json_str)
            
        logger.info(f"Document saved to {path}")
        return True
    except Exception as e:
        error_msg = f"Failed to save to file: {str(e)}"
        logger.error(error_msg)
        traceback.print_exc()
        raise ExportError(error_msg)


def load_from_file(filepath: Union[str, Path], encoding: str = 'utf-8') -> Optional[Document]:
    """
    Load a Document from a JSON file.
    
    Args:
        filepath: Path to load from
        encoding: File encoding
        
    Returns:
        Document object or None if loading fails
        
    Raises:
        ExportError: If loading fails
    """
    try:
        # Convert filepath to Path object
        path = Path(filepath)
        
        # Check if file exists
        if not path.exists():
            logger.error(f"File does not exist: {path}")
            return None
        
        # Read from file
        with open(path, 'r', encoding=encoding) as f:
            data = json.load(f)
        
        # Structure the dictionary into a Document
        return structure_document_from_dict(data)
    except Exception as e:
        logger.error(f"Error loading from file: {str(e)}")
        traceback.print_exc()
        return None


def validate_document(document: Document) -> bool:
    """
    Validate document structure.
    
    Args:
        document: Document to validate
        
    Returns:
        True if document is valid
        
    Raises:
        ValueError: If document is invalid
    """
    # Check required fields
    if not document.title:
        raise ValueError("Document title cannot be empty")
    
    # Check metadata
    if not document.metadata.url:
        raise ValueError("Document URL cannot be empty")
    
    if not document.metadata.fetched_at:
        raise ValueError("Document fetched_at cannot be empty")
    
    return True