"""
Export module for web2json.

This module provides functionality for exporting documents to files.
"""
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Union

from web2json.models.document import Document
from web2json.utils.errors import ExportError


class CustomJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder for handling dates and special objects."""
    
    def default(self, obj: Any) -> Any:
        """Convert objects to JSON serializable types."""
        if isinstance(obj, datetime):
            return obj.isoformat()
        
        # For other types, just use the parent's implementation
        try:
            return super().default(obj)
        except TypeError:
            # If that fails, convert to string
            return str(obj)


def export_document(
    document: Union[Document, Dict[str, Any]],
    filepath: Union[str, Path],
    indent: int = 2,
    encoding: str = "utf-8",
) -> Path:
    """Export a document to a JSON file.
    
    Args:
        document: Document to export
        filepath: Path to save file to
        indent: JSON indentation level
        encoding: File encoding
        
    Returns:
        Path to saved file
        
    Raises:
        ExportError: If export fails
    """
    logger = logging.getLogger(__name__)
    
    try:
        # Convert filepath to Path object
        path = Path(filepath)
        
        # Ensure directory exists
        path.parent.mkdir(parents=True, exist_ok=True)
        
        # If document is a Document object, convert to dict
        if isinstance(document, Document):
            # Use model_dump() from Pydantic to convert to dict
            data = document.model_dump(mode='json')
        else:
            data = document
        
        # Serialize to JSON
        json_string = json.dumps(
            data,
            indent=indent,
            ensure_ascii=False,
            cls=CustomJSONEncoder
        )
        
        # Write to file
        path.write_text(json_string, encoding=encoding)
        
        logger.info(f"Document saved to {path}")
        return path
        
    except Exception as e:
        logger.error(f"Failed to save document: {str(e)}")
        raise ExportError(f"Failed to save document: {str(e)}")
