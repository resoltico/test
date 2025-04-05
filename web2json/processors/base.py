"""
Base class for element processors and common utilities.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Set, Union

import structlog
from bs4 import BeautifulSoup, Tag, NavigableString

from web2json.models.config import ProcessingConfig
from web2json.models.document import Document
from web2json.models.section import Section


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
    def process(self, element: Tag, section: Section) -> None:
        """
        Process the specified element and add the result to the section.
        
        Args:
            element: The HTML element to process.
            section: The section to add the processed content to.
        """
        pass
    
    def get_text_content(self, element: Tag) -> str:
        """
        Extract text content from an element, preserving specified HTML tags.
        
        Args:
            element: The HTML element.
            
        Returns:
            The text content with preserved HTML tags.
        """
        # If we want to preserve HTML tags
        if self.config.preserve_html_tags:
            html_content = ""
            
            for child in element.children:
                if isinstance(child, NavigableString):
                    # For text nodes, add them directly
                    html_content += str(child)
                elif isinstance(child, Tag):
                    # For tag nodes, if the tag should be preserved, add it with its content
                    if child.name in self.config.preserve_tags:
                        html_content += str(child)
                    else:
                        # Otherwise, recursively process its content
                        html_content += self.get_text_content(child)
            
            return html_content
        else:
            # If we don't want to preserve HTML tags, just get the text
            return element.get_text()
    
    def is_heading(self, element: Tag) -> bool:
        """
        Check if an element is a heading.
        
        Args:
            element: The HTML element.
            
        Returns:
            True if the element is a heading, False otherwise.
        """
        return element.name in self.config.heading_tags
    
    def get_heading_level(self, element: Tag) -> int:
        """
        Get the level of a heading element.
        
        Args:
            element: The heading element.
            
        Returns:
            The heading level (1-6).
        """
        if not self.is_heading(element):
            return 0
        
        # Extract the level from the tag name (h1 -> 1, h2 -> 2, etc.)
        return int(element.name[1])
    
    def get_element_id(self, element: Tag) -> Optional[str]:
        """
        Get the ID attribute of an element.
        
        Args:
            element: The HTML element.
            
        Returns:
            The ID attribute if present, None otherwise.
        """
        return element.get("id")
    
    def get_attributes(self, element: Tag) -> Dict[str, str]:
        """
        Get the attributes of an element.
        
        Args:
            element: The HTML element.
            
        Returns:
            A dictionary of attribute names and values.
        """
        attributes = {}
        for name, value in element.attrs.items():
            if isinstance(value, list):
                attributes[name] = " ".join(value)
            else:
                attributes[name] = str(value)
        
        return attributes
