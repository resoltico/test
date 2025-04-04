"""
Base class for element processors and common utilities.
"""

import re
from abc import ABC, abstractmethod
from typing import List, Optional, TypeAlias, Dict, Any, Union, Set, Tuple

import structlog
from bs4 import BeautifulSoup, Tag, NavigableString

from web2json.models.config import ProcessingConfig
from web2json.models.document import Document
from web2json.models.section import Section


# Type alias for BeautifulSoup for better readability
Soup: TypeAlias = BeautifulSoup
ContentItem: TypeAlias = Dict[str, Any]
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

    def process_sections(self, sections: List[Section]) -> None:
        """
        Process all sections recursively.
        
        Args:
            sections: List of sections to process.
        """
        for section in sections:
            # Process content for this section
            self.process_section_content(section)
            
            # Process child sections recursively
            if section.children:
                self.process_sections(section.children)

    def process_section_content(self, section: Section) -> None:
        """
        Process content for a single section.
        
        Args:
            section: The section to process.
        """
        # This method should be overridden by specific processors
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
        
        # Find the nearest heading
        current_element = element
        while current_element:
            if current_element.name in ["h1", "h2", "h3", "h4", "h5", "h6"]:
                heading_level = int(current_element.name[1])
                heading_text = current_element.get_text().strip()
                
                # Try to find a matching section
                for section in all_sections:
                    if section.title == heading_text and section.level == heading_level:
                        return section
                
                # If no exact match, find sections with a lower level
                valid_sections = [s for s in all_sections if s.level < heading_level]
                if valid_sections:
                    # Sort by level (descending) to get the closest parent
                    valid_sections.sort(key=lambda s: -s.level)
                    return valid_sections[0]
            
            # Move to the previous sibling or parent
            prev = current_element.previous_sibling
            while prev and (not isinstance(prev, Tag) or prev.name not in ["h1", "h2", "h3", "h4", "h5", "h6"]):
                prev = prev.previous_sibling
            
            if prev:
                current_element = prev
            else:
                current_element = current_element.parent
        
        # If no section found, use the first one
        return all_sections[0] if all_sections else None

    def create_content_object(
        self, 
        element_type: str, 
        content: Any = None,
        additional_fields: Optional[Dict[str, Any]] = None,
        element_id: Optional[str] = None
    ) -> ContentItem:
        """
        Create a standardized content object.
        
        Args:
            element_type: The type of content.
            content: The content value.
            additional_fields: Additional fields to include.
            element_id: Optional ID for the content object.
            
        Returns:
            A dictionary representing the content object.
        """
        result: ContentItem = {"type": element_type}
        
        # Add element ID if present
        if element_id:
            result["id"] = element_id
        
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
    
    def extract_text_content(self, element: Tag, preserve_formatting: bool = False) -> str:
        """
        Extract text content from an element, with optional formatting.
        
        Args:
            element: The HTML element.
            preserve_formatting: Whether to preserve basic formatting.
            
        Returns:
            The extracted text content.
        """
        if preserve_formatting and self.config.preserve_html_formatting:
            # Get basic formatted text (preserving some whitespace)
            text = ""
            for child in element.children:
                if isinstance(child, NavigableString):
                    text += str(child)
                elif isinstance(child, Tag):
                    if child.name in ['br']:
                        text += "\n"
                    elif child.name in ['p', 'div', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                        text += "\n" + child.get_text() + "\n"
                    else:
                        text += child.get_text()
            
            # Normalize whitespace but preserve newlines
            text = re.sub(r'[ \t]+', ' ', text)  # Collapse spaces and tabs
            text = re.sub(r'\n{3,}', '\n\n', text)  # Collapse multiple newlines
            return text.strip()
        else:
            # Simple text extraction
            text = element.get_text(" ", strip=True)
            # Normalize whitespace
            return " ".join(text.split())
    
    def extract_element_attributes(self, element: Tag, whitelist: Optional[Set[str]] = None) -> Dict[str, Any]:
        """
        Extract attributes from an element, optionally filtered by a whitelist.
        
        Args:
            element: The HTML element.
            whitelist: Optional set of attribute names to include.
            
        Returns:
            A dictionary of attributes.
        """
        attributes = {}
        
        for name, value in element.attrs.items():
            if whitelist and name not in whitelist:
                continue
                
            if isinstance(value, list):
                # Handle list-type attributes like class
                attributes[name] = " ".join(str(v) for v in value)
            elif value is True:
                # Handle boolean attributes
                attributes[name] = True
            elif value is not None:
                # Handle regular attributes
                attributes[name] = str(value)
                
        return attributes
    
    def process_inline_elements(self, element: Tag) -> str:
        """
        Process inline elements to a text representation.
        
        Args:
            element: The HTML element containing inline elements.
            
        Returns:
            A string representation of the element with inline elements.
        """
        # Default implementation just returns the text
        return self.extract_text_content(element)
