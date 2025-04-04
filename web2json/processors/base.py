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

    @staticmethod
    def find_parent_section(document: Document, element: Tag) -> Optional[Section]:
        """
        Find the appropriate parent section for an element based on 
        heading hierarchy and document position.
        
        Args:
            document: The Document object.
            element: The HTML element to find a parent for.
            
        Returns:
            The parent Section object, or None if no suitable parent was found.
        """
        # Get all headings that precede this element
        preceding_headings = []
        current = element.previous_element
        while current:
            if current.name and current.name in ["h1", "h2", "h3", "h4", "h5", "h6"]:
                level = int(current.name[1])
                title = current.get_text().strip()
                preceding_headings.append((level, title))
            current = current.previous_element
        
        # Reverse the list to get them in document order
        preceding_headings.reverse()
        
        if not preceding_headings:
            # If no headings found, use the first top-level section
            if document.content:
                return document.content[0]
            return None
        
        # Get the closest heading level and title
        last_level, last_title = preceding_headings[-1]
        
        # Traverse the document's section hierarchy to find the matching section
        return ElementProcessor._find_section_by_heading(document.content, last_level, last_title)
    
    @staticmethod
    def _find_section_by_heading(
        sections: List[Section], level: int, title: str
    ) -> Optional[Section]:
        """
        Find a section by its heading level and title.
        
        This recursively traverses the section hierarchy to find the best match.
        
        Args:
            sections: The list of sections to search in.
            level: The heading level to match.
            title: The title to match.
            
        Returns:
            The matching Section object, or None if not found.
        """
        # Try to find an exact match first
        for section in sections:
            if section.level == level and section.title == title:
                return section
        
        # Find the nearest parent section
        parent_level = 0
        parent_section = None
        
        for section in sections:
            if section.level < level and section.level > parent_level:
                parent_level = section.level
                parent_section = section
                
                # Recursively search in children of this potential parent
                child_section = ElementProcessor._find_section_by_heading(
                    section.children, level, title
                )
                
                if child_section:
                    return child_section
        
        # If we found a parent section but no exact match, return the parent
        if parent_section:
            return parent_section
            
        # If no appropriate parent found, return the first section
        return sections[0] if sections else None
    
    @staticmethod
    def create_content_object(
        element: Tag, 
        element_type: str, 
        content_value: Any = None,
        include_text: bool = True,
        include_attrs: bool = True
    ) -> Dict[str, Any]:
        """
        Create a standardized content object from an HTML element.
        
        Args:
            element: The HTML element to process.
            element_type: The type of content to create.
            content_value: Optional explicit content value.
            include_text: Whether to include text content.
            include_attrs: Whether to include element attributes.
            
        Returns:
            A dictionary representing the element content.
        """
        result = {"type": element_type}
        
        # Add element ID if present
        if element.get("id") and include_attrs:
            result["id"] = element["id"]
        
        # Add text content if specified
        if include_text:
            text_content = element.get_text().strip()
            if text_content:
                if element_type in ["text", "paragraph", "code", "blockquote"]:
                    result["text"] = text_content
                else:
                    if content_value is None:
                        content_value = text_content
        
        # Add provided content value if any
        if content_value is not None:
            if isinstance(content_value, dict):
                result.update(content_value)
            elif isinstance(content_value, list):
                result["content"] = content_value
            else:
                result["content"] = content_value
        
        # Add attributes if desired
        if include_attrs and element.attrs:
            attrs = {}
            for key, value in element.attrs.items():
                if key not in ["id", "class", "style"]:
                    attrs[key] = value
            
            if attrs:
                result["attributes"] = attrs
        
        return result
