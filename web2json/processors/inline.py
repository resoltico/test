"""
Processor for inline HTML elements.
"""

from typing import Dict, List, Optional, Set, Any, Union, Tuple

import structlog
from bs4 import BeautifulSoup, Tag, NavigableString

from web2json.models.document import Document
from web2json.models.section import Section
from web2json.processors.base import ElementProcessor, ContentItem


logger = structlog.get_logger(__name__)


class InlineProcessor(ElementProcessor):
    """
    Processor for inline HTML elements.
    
    This processor transforms inline HTML elements like <strong>, <em>,
    <a>, etc. to preserve their formatting in the output JSON.
    """
    
    # Inline elements that should be preserved
    INLINE_ELEMENTS = {
        # Text formatting
        "b", "strong", "i", "em", "u", "s", "mark", "small", "big", "sub", "sup",
        # Links and references
        "a", "abbr", "cite", "dfn", "q",
        # Technical elements
        "code", "kbd", "samp", "var", "time", "data",
        # Special elements
        "ruby", "rt", "bdo", "bdi", "wbr"
    }
    
    def process(self, soup: BeautifulSoup, document: Document) -> Document:
        """
        Process inline elements in the document.
        
        This processor enhances other processors by providing methods to
        handle inline elements, rather than processing them directly.
        
        Args:
            soup: The BeautifulSoup object containing the parsed HTML.
            document: The Document object.
            
        Returns:
            The enhanced Document object.
        """
        logger.info("Processing inline elements")
        
        # This processor doesn't directly modify the document
        # It provides helper methods for other processors
        
        return document
    
    def process_inline_text(self, element: Tag) -> str:
        """
        Process text with inline elements.
        
        Args:
            element: The HTML element containing text and inline elements.
            
        Returns:
            The processed text with inline elements preserved.
        """
        if not self.config.preserve_inline_formatting:
            # If inline formatting is disabled, just return the text
            return self.extract_text_content(element)
        
        # Extract text content preserving some formatting
        return self.extract_text_content(element, preserve_formatting=True)
    
    def extract_inline_elements(self, element: Tag) -> List[Dict[str, Any]]:
        """
        Extract inline elements from a container.
        
        Args:
            element: The HTML element containing inline elements.
            
        Returns:
            A list of dictionaries representing the inline elements.
        """
        result = []
        
        for child in element.children:
            if isinstance(child, NavigableString):
                # Text node
                text = str(child).strip()
                if text:
                    result.append({"type": "text", "text": text})
            elif isinstance(child, Tag) and child.name in self.INLINE_ELEMENTS:
                # Inline element
                inline_data = self._process_inline_element(child)
                if inline_data:
                    result.append(inline_data)
            elif isinstance(child, Tag):
                # Other element - get its text content
                text = child.get_text().strip()
                if text:
                    result.append({"type": "text", "text": text})
        
        return result
    
    def _process_inline_element(self, element: Tag) -> Optional[Dict[str, Any]]:
        """
        Process a single inline element.
        
        Args:
            element: The inline HTML element.
            
        Returns:
            A dictionary representing the inline element, or None if invalid.
        """
        # Get the element's text content
        text = element.get_text().strip()
        
        if not text:
            return None
            
        element_type = element.name
        
        # Create a basic inline element object
        result = {
            "type": element_type,
            "text": text
        }
        
        # Handle specific inline elements
        if element_type == "a":
            # Link
            if element.get("href"):
                result["href"] = element["href"]
            if element.get("title"):
                result["title"] = element["title"]
            if element.get("target"):
                result["target"] = element["target"]
                
        elif element_type in ["abbr", "dfn"]:
            # Abbreviation or definition
            if element.get("title"):
                result["title"] = element["title"]
                
        elif element_type == "time":
            # Time element
            if element.get("datetime"):
                result["datetime"] = element["datetime"]
                
        elif element_type == "data":
            # Data element
            if element.get("value"):
                result["value"] = element["value"]
                
        elif element_type == "ruby":
            # Ruby annotation
            rt = element.find("rt")
            if rt:
                result["rt"] = rt.get_text().strip()
                
        elif element_type == "bdo":
            # Bidirectional override
            if element.get("dir"):
                result["dir"] = element["dir"]
        
        # Add element ID if present
        if element.get("id"):
            result["id"] = element["id"]
            
        return result
    
    def process_links(self, element: Tag) -> List[Dict[str, Any]]:
        """
        Extract links from a container.
        
        Args:
            element: The HTML element containing links.
            
        Returns:
            A list of dictionaries representing the links.
        """
        links = []
        
        for a in element.find_all("a"):
            if a.get("href"):
                link = {
                    "text": a.get_text().strip(),
                    "href": a["href"]
                }
                
                if a.get("title"):
                    link["title"] = a["title"]
                    
                if a.get("target"):
                    link["target"] = a["target"]
                
                links.append(link)
        
        return links
