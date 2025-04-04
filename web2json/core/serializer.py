"""
Module for serializing documents to JSON files.
"""

import json
import os
import re
from pathlib import Path
from typing import Any, Dict, Optional
from urllib.parse import urlparse

import structlog

from web2json.models.config import OutputConfig
from web2json.models.document import Document


logger = structlog.get_logger(__name__)


class JsonSerializer:
    """
    Serializes Document objects to JSON files.
    """
    
    def __init__(self, config: OutputConfig) -> None:
        """
        Initialize the serializer with the given configuration.
        
        Args:
            config: The output configuration.
        """
        self.config = config
    
    def serialize(self, document: Document) -> str:
        """
        Serialize a Document object to a JSON string.
        
        Args:
            document: The Document object to serialize.
            
        Returns:
            The JSON string representation of the document.
        """
        logger.debug("Serializing document to JSON")
        
        # Convert the document to a dictionary
        doc_dict = document.to_dict()
        
        # Optionally include URL
        if self.config.include_url and not "url" in doc_dict:
            doc_dict["url"] = document.url
        
        # Convert to JSON with proper formatting
        json_str = json.dumps(
            doc_dict,
            indent=self.config.indent,
            ensure_ascii=self.config.ensure_ascii,
        )
        
        return json_str
    
    def save_to_file(self, document: Document, output_path: Optional[str] = None) -> str:
        """
        Save a document to a JSON file.
        
        Args:
            document: The Document object to save.
            output_path: Optional specific path to save to. If not provided,
                         a path will be generated based on the document URL.
            
        Returns:
            The path to the saved file.
        """
        # Generate a filename if not provided
        if not output_path:
            output_path = self._generate_filename(document)
        
        # Ensure the directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Serialize and save
        json_str = self.serialize(document)
        
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(json_str)
        
        logger.info("Document saved", path=output_path)
        return output_path
    
    def _generate_filename(self, document: Document) -> str:
        """
        Generate a filename for the document based on its URL.
        
        Args:
            document: The Document object.
            
        Returns:
            A file path for the JSON output.
        """
        # Parse the URL to extract domain and path
        parsed_url = urlparse(document.url)
        domain = parsed_url.netloc
        
        # Clean up the path to be filesystem-friendly
        path = parsed_url.path.strip("/")
        path = re.sub(r"[^\w\-]", "_", path)
        path = re.sub(r"_{2,}", "_", path)
        
        # Limit path length
        if len(path) > 50:
            path = path[:50]
        
        # Use the template to format the filename
        if path:
            filename = self.config.filename_template.format(
                domain=domain,
                path=path,
                title=re.sub(r"[^\w\-]", "_", document.title[:30])
            )
        else:
            filename = self.config.filename_template.format(
                domain=domain,
                path="home",
                title=re.sub(r"[^\w\-]", "_", document.title[:30])
            )
        
        # Ensure filename ends with .json
        if not filename.endswith(".json"):
            filename += ".json"
        
        # Combine with output directory
        output_dir = Path(self.config.output_directory)
        return str(output_dir / filename)
