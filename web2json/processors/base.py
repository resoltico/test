"""
Base class for element processors and common utilities.
"""

from abc import ABC, abstractmethod
from typing import List, Optional, TypeAlias, Dict, Any

import structlog
from bs4 import BeautifulSoup, Tag

from web2json.models.config import ProcessingConfig
from web2json.models.document import Document
from web2json.models.section import Section


# Type alias for BeautifulSoup for better readability
Soup: TypeAlias = BeautifulSoup
logger = structlog.get_logger(__name__)


class ElementProcessor(ABC):
    """
    Abstract base class for processors that handle specific HTML elements.
    
    Element processors are specialized components that process specific
    types of HTML elements (tables, forms, media, etc.) and transform
    them into structured JSON representations.
    """
    
    def __init__(self, config: ProcessingConfig) -> None:
        """
        Initialize the processor with the given configuration.
        
        Args:
            config: The processing configuration.
        """
        self.config = config
    
    @abstractmethod
    def process(self, soup: Soup, document: Document) -> Document:
        """
        Process the specified elements in the document.
        
        Args:
            soup: The BeautifulSoup object containing the parsed HTML.
            document: The Document object to enhance with processed elements.
            
        Returns:
            The enhanced Document object.
        """
        pass

    def find_section_for_element(self, document: Document, element: Tag) -> Optional[Section]:
        """
        Find the appropriate section for an element based on document structure.
        
        Args:
            document: The Document object.
            element: The HTML element to find a section for.
            
        Returns:
            The appropriate Section object, or None if not found.
        """
        # Get all sections in a flattened list
        all_sections: List[Section] = []
        
        def _collect_sections(sections: List[Section]) -> None:
            for section in sections:
                all_sections.append(section)
                if section.children:
                    _collect_sections(section.children)
        
        _collect_sections(document.content)
        
        # If the element is already assigned to a section's raw_content_elements,
        # return that section
        for section in all_sections:
            if hasattr(section, 'raw_content_elements') and element in section.raw_content_elements:
                return section
        
        # Find the nearest heading if element isn't directly assigned
        current = element.previous_element
        while current:
            if isinstance(current, Tag) and current.name in ["h1", "h2", "h3", "h4", "h5", "h6"]:
                heading_level = int(current.name[1])
                heading_text = current.get_text().strip()
                
                # Try to find a matching section
                for section in all_sections:
                    if section.title == heading_text and section.level == heading_level:
                        return section
                        
                # If no exact match, find the closest parent section
                valid_sections = [s for s in all_sections if s.level < heading_level]
                if valid_sections:
                    # Get the section with the highest level that's still lower than the heading
                    closest_section = max(valid_sections, key=lambda s: s.level)
                    return closest_section
                    
                break
                
            current = current.previous_element
        
        # If no appropriate section found, use the first one
        return all_sections[0] if all_sections else None

    def create_content_object(
        self, 
        element: Tag, 
        element_type: str, 
        content: Any = None,
        additional_fields: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a standardized content object from an HTML element.
        
        Args:
            element: The HTML element to process.
            element_type: The type of content.
            content: The content value.
            additional_fields: Additional fields to include.
            
        Returns:
            A dictionary representing the content object.
        """
        result = {"type": element_type}
        
        # Add element ID if present
        if element.get("id"):
            result["id"] = element["id"]
        
        # Add content
        if content is not None:
            if isinstance(content, dict):
                # Merge content dictionary with result
                result.update(content)
            elif isinstance(content, list):
                result["content"] = content
            else:
                # For simple types like strings
                if element_type in ["text", "paragraph", "code", "blockquote"]:
                    result["text"] = content
                else:
                    result["content"] = content
        
        # Add additional fields
        if additional_fields:
            result.update(additional_fields)
            
        return result
