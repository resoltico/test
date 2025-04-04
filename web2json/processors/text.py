"""
Processor for text content elements.
"""

import re
from typing import Dict, List, Optional, Set, Union, Any

import structlog
from bs4 import BeautifulSoup, NavigableString, Tag

from web2json.models.document import Document
from web2json.models.section import Section
from web2json.processors.base import ElementProcessor, ContentItem


logger = structlog.get_logger(__name__)


class TextProcessor(ElementProcessor):
    """
    Processor for text-based HTML elements.
    
    Handles paragraphs, blockquotes, and other text containers,
    preserving inline formatting and structure.
    """
    
    def process(self, soup: BeautifulSoup, document: Document) -> Document:
        """
        Process text elements in the document.
        
        This processor handles common text elements like paragraphs and blockquotes,
        preserving their structure and inline formatting.
        
        Args:
            soup: The BeautifulSoup object containing the parsed HTML.
            document: The Document object to enhance with processed elements.
            
        Returns:
            The enhanced Document object.
        """
        logger.info("Processing text elements")
        
        # Process each section's raw content elements for text content
        self.process_sections(document.content)
        
        return document
    
    def process_section_content(self, section: Section) -> None:
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
            elif element.name == "blockquote":
                content_obj = self._process_blockquote(element)
            elif element.name == "pre":
                content_obj = self._process_preformatted(element)
            elif element.name == "code":
                content_obj = self._process_code(element)
            elif element.name == "time":
                content_obj = self._process_time(element)
                
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
        # Skip elements that are handled by other processors
        skip_elements = {
            "ul", "ol", "dl", "table", "form", "figure", "img", 
            "video", "audio", "iframe", "canvas", "svg", "math",
            "nav", "header", "footer", "section", "article", "aside"
        }
        
        if element.name in skip_elements:
            return True
            
        # Skip elements inside certain containers
        skip_containers = {"table", "form", "figure", "nav", "ul", "ol", "dl"}
        
        parent = element.parent
        while parent and parent.name != "body":
            if parent.name in skip_containers:
                return True
            parent = parent.parent
            
        return False
    
    def _process_paragraph(self, element: Tag) -> ContentItem:
        """
        Process a paragraph element.
        
        Args:
            element: The paragraph element.
            
        Returns:
            A dictionary representation of the paragraph.
        """
        text = self.extract_text_content(element, preserve_formatting=True)
        
        # Create a paragraph content object
        return self.create_content_object(
            element_type="paragraph",
            content=text,
            element_id=element.get("id")
        )
    
    def _process_blockquote(self, element: Tag) -> ContentItem:
        """
        Process a blockquote element.
        
        Args:
            element: The blockquote element.
            
        Returns:
            A dictionary representation of the blockquote.
        """
        # Extract the main content
        content = self.extract_text_content(element, preserve_formatting=True)
        
        # Create a blockquote content object
        result = self.create_content_object(
            element_type="quote",
            content=content,
            element_id=element.get("id")
        )
        
        # Check for citation
        cite_url = element.get("cite")
        if cite_url:
            result["cite"] = cite_url
        
        # Look for cite element or footer for attribution
        cite_element = element.find("cite")
        if cite_element:
            result["source"] = self.extract_text_content(cite_element)
        else:
            footer = element.find("footer")
            if footer:
                result["source"] = self.extract_text_content(footer)
        
        return result
    
    def _process_preformatted(self, element: Tag) -> ContentItem:
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
            return self._process_code_block(code, element)
        else:
            # Regular preformatted text
            text = element.get_text()
            
            # Preserve original formatting but normalize line endings
            text = re.sub(r'\r\n', '\n', text)
            text = re.sub(r'\r', '\n', text)
            
            return self.create_content_object(
                element_type="preformatted",
                content=text,
                element_id=element.get("id")
            )
    
    def _process_code_block(self, code: Tag, parent: Optional[Tag] = None) -> ContentItem:
        """
        Process a code block element.
        
        Args:
            code: The code element.
            parent: Optional parent element (pre).
            
        Returns:
            A dictionary representation of the code block.
        """
        # Get the code content
        code_text = code.get_text()
        
        # Preserve original formatting but normalize line endings
        code_text = re.sub(r'\r\n', '\n', code_text)
        code_text = re.sub(r'\r', '\n', code_text)
        
        # Try to determine the language
        language = None
        classes = code.get("class", [])
        
        for cls in classes:
            if cls.startswith("language-") or cls.startswith("lang-"):
                language = cls.split("-", 1)[1]
                break
        
        # Create the code block content object
        result = self.create_content_object(
            element_type="code_block",
            content=code_text,
            element_id=code.get("id") or (parent.get("id") if parent else None)
        )
        
        if language:
            result["language"] = language
            
        return result
    
    def _process_code(self, element: Tag) -> Optional[ContentItem]:
        """
        Process a code element.
        
        Args:
            element: The code element.
            
        Returns:
            A dictionary representation of the code, or None if inside pre.
        """
        # Skip if inside a pre element (handled by _process_preformatted)
        if element.find_parent("pre"):
            return None
            
        # Inline code element
        code_text = element.get_text()
        
        return self.create_content_object(
            element_type="code",
            content=code_text,
            element_id=element.get("id")
        )
    
    def _process_time(self, element: Tag) -> ContentItem:
        """
        Process a time element.
        
        Args:
            element: The time element.
            
        Returns:
            A dictionary representation of the time.
        """
        # Extract text content
        text = self.extract_text_content(element)
        
        # Create the time content object
        result = self.create_content_object(
            element_type="time",
            content=text,
            element_id=element.get("id")
        )
        
        # Add datetime attribute if present
        if element.get("datetime"):
            result["datetime"] = element["datetime"]
            
        return result
