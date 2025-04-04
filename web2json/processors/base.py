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
from web2json.core.parser import HtmlParser


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
    
    def __init__(self, config: ProcessingConfig, parser: HtmlParser) -> None:
        """
        Initialize the processor with the given configuration.
        
        Args:
            config: The processing configuration.
            parser: The HTML parser to use.
        """
        self.config = config
        self.parser = parser
    
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
    
    def preserve_html(self, element: Tag) -> str:
        """
        Preserve the HTML content of an element, including tags.
        
        Args:
            element: The HTML element.
            
        Returns:
            A string representation of the element with HTML tags preserved.
        """
        # Get the inner HTML
        return self.parser.get_inner_html(element)
    
    def create_paragraph(self, content: str, element_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a paragraph content item.
        
        Args:
            content: The paragraph content.
            element_id: Optional ID for the element.
            
        Returns:
            A paragraph content item.
        """
        result = {
            "type": "paragraph",
            "text": content
        }
        
        if element_id:
            result["id"] = element_id
            
        return result
    
    def create_content_item(
        self, 
        element_type: str, 
        content: Any = None,
        additional_props: Optional[Dict[str, Any]] = None,
        element_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a generic content item.
        
        Args:
            element_type: The type of the content item.
            content: The content of the item.
            additional_props: Additional properties to include.
            element_id: Optional ID for the element.
            
        Returns:
            A content item dictionary.
        """
        result = {"type": element_type}
        
        if content is not None:
            if isinstance(content, dict):
                result.update(content)
            elif isinstance(content, list):
                result["content"] = content
            else:
                result["text"] = content
        
        if additional_props:
            result.update(additional_props)
            
        if element_id:
            result["id"] = element_id
            
        return result
    
    def process_inline_elements(self, text: str) -> str:
        """
        Process inline HTML elements in text.
        
        Args:
            text: The text containing inline HTML elements.
            
        Returns:
            The processed text with inline HTML preserved.
        """
        # In our case, we want to preserve inline HTML, so return as is
        return text
