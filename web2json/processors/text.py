"""
Processor for text content elements.
"""

import re
from typing import Dict, List, Optional, Any, Union

import structlog
from bs4 import BeautifulSoup, Tag, NavigableString

from web2json.models.document import Document
from web2json.models.section import Section
from web2json.processors.base import ElementProcessor
from web2json.core.parser import HtmlParser


logger = structlog.get_logger(__name__)


class TextProcessor(ElementProcessor):
    """
    Processor for text-based HTML elements.
    
    Handles paragraphs, blockquotes, and other text content.
    """
    
    def process(self, soup: BeautifulSoup, document: Document) -> Document:
        """
        Process text elements in the document.
        
        Args:
            soup: The BeautifulSoup object containing the parsed HTML.
            document: The Document object to enhance with processed elements.
            
        Returns:
            The enhanced Document object.
        """
        logger.info("Processing text elements")
        
        # Process each section's raw content for text elements
        self.process_sections(document.content)
        
        return document
    
    def process_section_content(self, section: Section) -> None:
        """
        Process text elements for a single section.
        
        Args:
            section: The section to process.
        """
        processed_content = []
        
        for element in section.raw_content_elements:
            # Skip if it's a heading (already processed in the hierarchy)
            if element.name in self.config.heading_tags:
                continue
                
            # Process different types of text elements
            if element.name == "p":
                content = self._process_paragraph(element)
                if content:
                    processed_content.append(content)
            elif element.name == "blockquote":
                content = self._process_blockquote(element)
                if content:
                    processed_content.append(content)
            elif element.name == "pre":
                content = self._process_preformatted(element)
                if content:
                    processed_content.append(content)
            elif element.name == "time":
                content = self._process_time(element)
                if content:
                    processed_content.append(content)
            # Add more specialized element processors as needed
        
        # Update the section's content
        for content_item in processed_content:
            section.add_content(content_item)
            
    def _process_paragraph(self, element: Tag) -> Dict[str, Any]:
        """
        Process a paragraph element.
        
        Args:
            element: The paragraph element.
            
        Returns:
            A dictionary representing the paragraph.
        """
        # Extract the text content with HTML preserved
        content = self.parser.get_inner_html(element)
        
        # Create a paragraph object
        return self.create_paragraph(content, element.get("id"))
    
    def _process_blockquote(self, element: Tag) -> Dict[str, Any]:
        """
        Process a blockquote element.
        
        Args:
            element: The blockquote element.
            
        Returns:
            A dictionary representing the blockquote.
        """
        # Extract the blockquote content
        content = self.parser.get_inner_html(element)
        
        # Create a blockquote object
        result = self.create_content_item(
            element_type="quote",
            content=content,
            element_id=element.get("id")
        )
        
        # Add citation if present
        if element.get("cite"):
            result["cite"] = element["cite"]
        
        # Check for footer or citation element
        footer = element.find("footer")
        if footer:
            result["source"] = self.parser.get_element_text_content(footer)
        else:
            cite = element.find("cite")
            if cite:
                result["source"] = self.parser.get_element_text_content(cite)
        
        return result
    
    def _process_preformatted(self, element: Tag) -> Dict[str, Any]:
        """
        Process a preformatted text element.
        
        Args:
            element: The pre element.
            
        Returns:
            A dictionary representing the preformatted text.
        """
        # Check if this is a code block
        code = element.find("code")
        if code:
            # Process as code block
            return self._process_code_block(code, element)
        
        # Regular preformatted text
        content = element.get_text()
        
        # Preserve original whitespace
        return self.create_content_item(
            element_type="preformatted",
            content=content,
            element_id=element.get("id")
        )
    
    def _process_code_block(self, code: Tag, parent: Optional[Tag] = None) -> Dict[str, Any]:
        """
        Process a code block.
        
        Args:
            code: The code element.
            parent: The parent pre element, if any.
            
        Returns:
            A dictionary representing the code block.
        """
        # Get content
        content = code.get_text()
        
        # Determine language from class
        language = None
        classes = code.get("class", [])
        
        for cls in classes:
            if cls.startswith("language-") or cls.startswith("lang-"):
                language = cls.split("-", 1)[1]
                break
        
        # Create code block object
        result = self.create_content_item(
            element_type="code_block",
            content=content,
            element_id=code.get("id") or (parent.get("id") if parent else None)
        )
        
        if language:
            result["language"] = language
            
        return result
    
    def _process_time(self, element: Tag) -> Dict[str, Any]:
        """
        Process a time element.
        
        Args:
            element: The time element.
            
        Returns:
            A dictionary representing the time.
        """
        # Get content
        content = self.parser.get_element_text_content(element)
        
        # Create time object
        result = self.create_content_item(
            element_type="time",
            content=content,
            element_id=element.get("id")
        )
        
        # Add datetime attribute if present
        if element.get("datetime"):
            result["datetime"] = element["datetime"]
            
        return result
