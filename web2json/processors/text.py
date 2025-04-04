"""
Processor for text content elements.
"""

import re
from typing import Dict, List, Optional, Set, Union, Any

import structlog
from bs4 import BeautifulSoup, NavigableString, Tag

from web2json.models.document import Document
from web2json.models.section import Section
from web2json.processors.base import ElementProcessor


logger = structlog.get_logger(__name__)


class TextProcessor(ElementProcessor):
    """
    Processor for text-based HTML elements.
    
    Handles paragraphs, lists, blockquotes, and other text containers,
    preserving inline formatting and structure.
    """
    
    # Tags that we'll process as paragraph-like elements
    PARAGRAPH_TAGS = {"p"}
    
    # List-like elements
    LIST_TAGS = {"ul", "ol"}
    
    # Definition list elements
    DL_TAGS = {"dl"}
    
    # Block elements
    BLOCK_TAGS = {"blockquote", "pre"}
    
    # Inline semantic elements
    INLINE_TAGS = {
        "a", "abbr", "b", "br", "cite", "code", "data", "dfn", 
        "em", "i", "kbd", "mark", "q", "s", "samp", "small", 
        "span", "strong", "sub", "sup", "time", "u", "var", "wbr"
    }
    
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
        
        # Process paragraphs
        self._process_elements(soup, document, self.PARAGRAPH_TAGS, self._process_paragraph)
        
        # Process lists
        self._process_elements(soup, document, self.LIST_TAGS, self._process_list)
        
        # Process definition lists
        self._process_elements(soup, document, self.DL_TAGS, self._process_definition_list)
        
        # Process blockquotes
        self._process_elements(soup, document, {"blockquote"}, self._process_blockquote)
        
        # Process preformatted text and code blocks
        self._process_elements(soup, document, {"pre"}, self._process_preformatted)
        
        return document
    
    def _process_elements(
        self, 
        soup: BeautifulSoup, 
        document: Document, 
        tags: Set[str],
        processor_func: callable
    ) -> None:
        """
        Process elements of the specified tags using the provided processor function.
        
        Args:
            soup: The BeautifulSoup object.
            document: The Document object.
            tags: Set of tag names to process.
            processor_func: Function to process each element.
        """
        # Find all elements of the specified tags
        for tag_name in tags:
            elements = soup.find_all(tag_name)
            
            for element in elements:
                # Skip elements in certain containers that will be processed separately
                if self._should_skip_element(element):
                    continue
                    
                # Find parent section for this element
                parent_section = self.find_parent_section(document, element)
                
                if parent_section:
                    # Process the element
                    content_obj = processor_func(element)
                    
                    if content_obj:
                        # Add to the parent section
                        parent_section.add_content(content_obj)
                        logger.debug(
                            f"Added {tag_name} to section", 
                            section=parent_section.title
                        )
    
    def _should_skip_element(self, element: Tag) -> bool:
        """
        Determine if an element should be skipped (processed as part of another element).
        
        Args:
            element: The element to check.
            
        Returns:
            True if the element should be skipped, False otherwise.
        """
        # Skip elements inside certain containers
        skip_containers = {"table", "figure", "form"}
        
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
        
        # Look for cite element
        cite_element = element.find("cite")
        if cite_element:
            result["citation"] = self._extract_text(cite_element)
        
        # Look for footer element (often used for attribution)
        footer = element.find("footer")
        if footer and "citation" not in result:
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
