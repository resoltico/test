"""
Processor for inline HTML elements.
"""

from typing import Dict, List, Optional, Any, Union

import structlog
from bs4 import BeautifulSoup, Tag, NavigableString

from web2json.models.document import Document
from web2json.models.section import Section
from web2json.processors.base import ElementProcessor


logger = structlog.get_logger(__name__)


class InlineProcessor(ElementProcessor):
    """
    Processor for handling inline HTML elements.
    
    Preserves inline formatting like bold, italic, links, etc. in the output.
    """
    
    def process(self, soup: BeautifulSoup, document: Document) -> Document:
        """
        Process inline elements in the document.
        
        Args:
            soup: The BeautifulSoup object containing the parsed HTML.
            document: The Document object to enhance with processed elements.
            
        Returns:
            The enhanced Document object.
        """
        logger.info("Processing inline elements")
        
        # This processor doesn't modify the document directly
        # It's used by other processors to handle inline elements
        
        return document
    
    def process_inline_content(self, element: Tag) -> str:
        """
        Process an element's content, preserving inline HTML.
        
        Args:
            element: The HTML element to process.
            
        Returns:
            A string with preserved inline HTML formatting.
        """
        # Get the inner HTML
        return self.parser.get_inner_html(element)
    
    def extract_inline_elements(self, element: Tag) -> List[Dict[str, Any]]:
        """
        Extract a list of inline elements from a container.
        
        Args:
            element: The container element.
            
        Returns:
            A list of dictionaries representing inline elements.
        """
        result = []
        
        for child in element.children:
            if isinstance(child, NavigableString):
                # Text node
                text = str(child).strip()
                if text:
                    result.append({"type": "text", "text": text})
            elif isinstance(child, Tag):
                # Process based on tag type
                if child.name in self.config.inline_tags:
                    result.append(self._process_inline_element(child))
                else:
                    # Treat as text content
                    text = self.parser.get_element_text_content(child)
                    if text:
                        result.append({"type": "text", "text": text})
        
        return result
    
    def _process_inline_element(self, element: Tag) -> Dict[str, Any]:
        """
        Process a single inline element.
        
        Args:
            element: The inline HTML element.
            
        Returns:
            A dictionary representing the inline element.
        """
        if element.name in ["b", "strong"]:
            return self._process_strong(element)
        elif element.name in ["i", "em"]:
            return self._process_emphasis(element)
        elif element.name == "a":
            return self._process_link(element)
        elif element.name == "code":
            return self._process_code(element)
        elif element.name == "mark":
            return self._process_mark(element)
        elif element.name in ["sub", "sup"]:
            return self._process_script(element)
        elif element.name == "time":
            return self._process_time(element)
        else:
            # Generic inline element
            return self._process_generic_inline(element)
    
    def _process_strong(self, element: Tag) -> Dict[str, Any]:
        """Process a strong/bold element."""
        return {
            "type": "strong",
            "text": self.parser.get_element_text_content(element)
        }
    
    def _process_emphasis(self, element: Tag) -> Dict[str, Any]:
        """Process an emphasis/italic element."""
        return {
            "type": "emphasis",
            "text": self.parser.get_element_text_content(element)
        }
    
    def _process_link(self, element: Tag) -> Dict[str, Any]:
        """Process a link element."""
        result = {
            "type": "link",
            "text": self.parser.get_element_text_content(element)
        }
        
        # Add href if present
        if element.get("href"):
            result["href"] = element["href"]
            
        # Add title if present
        if element.get("title"):
            result["title"] = element["title"]
            
        return result
    
    def _process_code(self, element: Tag) -> Dict[str, Any]:
        """Process a code element."""
        return {
            "type": "code",
            "text": self.parser.get_element_text_content(element)
        }
    
    def _process_mark(self, element: Tag) -> Dict[str, Any]:
        """Process a mark element."""
        return {
            "type": "mark",
            "text": self.parser.get_element_text_content(element)
        }
    
    def _process_script(self, element: Tag) -> Dict[str, Any]:
        """Process a subscript or superscript element."""
        return {
            "type": element.name,
            "text": self.parser.get_element_text_content(element)
        }
    
    def _process_time(self, element: Tag) -> Dict[str, Any]:
        """Process a time element."""
        result = {
            "type": "time",
            "text": self.parser.get_element_text_content(element)
        }
        
        # Add datetime if present
        if element.get("datetime"):
            result["datetime"] = element["datetime"]
            
        return result
    
    def _process_generic_inline(self, element: Tag) -> Dict[str, Any]:
        """Process a generic inline element."""
        return {
            "type": element.name,
            "text": self.parser.get_element_text_content(element)
        }
