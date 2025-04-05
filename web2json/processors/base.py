"""
Base class for element processors and common utilities.
"""

from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any, Union

import structlog
from bs4 import BeautifulSoup, Tag

from web2json.models.config import ProcessingConfig
from web2json.models.document import Document
from web2json.models.section import Section
from web2json.core.parser import HtmlParser


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
    def process(self, soup: BeautifulSoup, document: Document) -> Document:
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
        # Get the outer HTML
        return str(element)
    
    def extract_text(self, element: Tag) -> str:
        """
        Extract the text content of an element.
        
        Args:
            element: The HTML element.
            
        Returns:
            The text content.
        """
        return self.parser.get_element_text_content(element)
