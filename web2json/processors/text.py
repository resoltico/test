"""
Processor for text content elements.
"""

import re
from typing import Dict, List, Optional, Set, Union, Any

import structlog
from bs4 import BeautifulSoup, NavigableString, Tag

from web2json.models.document import Document
from web2json.processors.base import ElementProcessor


logger = structlog.get_logger(__name__)


class TextProcessor(ElementProcessor):
    """
    Processor for text-based HTML elements.
    
    Handles paragraphs, lists, blockquotes, and other text containers,
    preserving inline formatting and structure.
    """
    
    def process(self, soup: BeautifulSoup, document: Document) -> Document:
        """
        Process text elements in the document.
        
        This processor handles common text elements like paragraphs, lists,
        and blockquotes, preserving their structure and inline formatting.
        
        Args:
            soup: The BeautifulSoup object containing the parsed HTML.
            document: The Document object to enhance with processed elements.
            
        Returns:
            The enhanced Document object.
        """
        logger.info("Processing text elements")
        
        # Process each section's raw content elements for text content
        self._process_sections(document.content)
        
        return document
    
    def _process_sections(self, sections: List) -> None:
        """
        Process all sections recursively.
        
        Args:
            sections: List of sections to process.
        """
        for section in sections:
            # Process text content elements in this section
            self._process_section_content(section)
            
            # Process child sections recursively
            if section.children:
                self._process_sections(section.children)
    
    def _process_section_content(self, section) -> None:
        """
        Process content elements for a single section.
        
        Args:
            section: The section to process.
        """
        for element in section.raw_content_elements:
            # Skip elements that should be handled by other processors
            if self._should_skip_element(element):
                continue
                
            # Process different types of text elements
            content_obj = None
            
            if element.name == "p":
                content_obj = self._process_paragraph(element)
            elif element.name in ["ul", "ol"]:
                content_obj = self._process_list(element)
            elif element.name == "dl":
                content_obj = self._process_definition_list(element)
            elif element.name == "blockquote":
                content_obj = self._process_blockquote(element)
            elif element.name == "pre":
                content_obj = self._process_preformatted(element)
                
            # Add the processed content to the section
            if content_obj:
                section.add_content(content_obj)
                
    def _should_skip_element(self, element: Tag) -> bool:
        """
        Determine if an element should be skipped (processed by another processor).
        
        Args:
            element: The element to check.
            
        Returns:
            True if the element should be skipped, False otherwise.
        """
        # Skip elements inside certain containers
        skip_containers = {"table", "form", "figure"}
        
        parent = element.parent
        while parent:
            if parent.name in skip_containers:
                return True
            parent = parent.parent
            
        return False
    
    def _process_paragraph(self, element: Tag) -> Dict[str, Any]:
        """
        Process a paragraph element.
        
        Args:
            element: The paragraph element.
            
        Returns:
            A dictionary representation of the paragraph.
        """
        return {
            "type": "paragraph",
            "text": self._extract_text(element)
        }
    
    def _process_list(self, element: Tag) -> Dict[str, Any]:
        """
        Process a list element (ul or ol).
        
        Args:
            element: The list element.
            
        Returns:
            A dictionary representation of the list.
        """
        list_type = "unordered_list" if element.name == "ul" else "ordered_list"
        items = []
        
        for li in element.find_all("li", recursive=False):
            items.append(self._extract_text(li))
        
        return {
            "type": list_type,
            "items": items
        }
    
    def _process_definition_list(self, element: Tag) -> Dict[str, Any]:
        """
        Process a definition list element.
        
        Args:
            element: The dl element.
            
        Returns:
            A dictionary representation of the definition list.
        """
        items = []
        current_term = None
        
        for child in element.children:
            if not isinstance(child, Tag):
                continue
                
            if child.name == "dt":
                current_term = self._extract_text(child)
            elif child.name == "dd" and current_term:
                items.append({
                    "term": current_term,
                    "definition": self._extract_text(child)
                })
                current_term = None
        
        return {
            "type": "definition_list",
            "items": items
        }
    
    def _process_blockquote(self, element: Tag) -> Dict[str, Any]:
        """
        Process a blockquote element.
        
        Args:
            element: The blockquote element.
            
        Returns:
            A dictionary representation of the blockquote.
        """
        result = {
            "type": "blockquote",
            "text": self._extract_text(element)
        }
        
        # Check for citation
        cite_url = element.get("cite")
        if cite_url:
            result["cite_url"] = cite_url
        
        # Look for cite element or footer for attribution
        cite_element = element.find("cite")
        if cite_element:
            result["citation"] = self._extract_text(cite_element)
        else:
            footer = element.find("footer")
            if footer:
                result["citation"] = self._extract_text(footer)
        
        return result
    
    def _process_preformatted(self, element: Tag) -> Dict[str, Any]:
        """
        Process a preformatted text element.
        
        Args:
            element: The pre element.
            
        Returns:
            A dictionary representation of the preformatted text.
        """
        # Check if this is a code block
        code = element.find("code")
        if code:
            # Try to determine the language
            language = None
            classes = code.get("class", [])
            for cls in classes:
                if cls.startswith("language-"):
                    language = cls[9:]  # Remove "language-" prefix
                    break
            
            result = {
                "type": "code_block",
                "code": code.get_text()
            }
            
            if language:
                result["language"] = language
                
            return result
        else:
            # Regular preformatted text
            return {
                "type": "preformatted",
                "text": element.get_text()
            }
    
    def _extract_text(self, element: Tag) -> str:
        """
        Extract clean text from an element.
        
        Args:
            element: The HTML element.
            
        Returns:
            The extracted text content.
        """
        # Simple extraction for now
        text = element.get_text()
        
        # Clean up whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text
