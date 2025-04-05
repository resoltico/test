"""
Module for transforming HTML documents into structured JSON.
"""

from typing import Dict, List, Optional, Set, Type, Any

import structlog
from bs4 import BeautifulSoup, Tag, NavigableString

from web2json.core.parser import HtmlParser
from web2json.models.config import Web2JsonConfig
from web2json.models.document import Document
from web2json.models.section import Section
from web2json.processors.base import ElementProcessor
from web2json.processors.text import TextProcessor
from web2json.processors.table import TableProcessor
from web2json.processors.list import ListProcessor
from web2json.processors.form import FormProcessor
from web2json.processors.media import MediaProcessor
from web2json.processors.semantic import SemanticProcessor


logger = structlog.get_logger(__name__)


class Transformer:
    """
    Orchestrates the transformation of HTML into structured JSON.
    
    This component combines parsing, hierarchy extraction, and specialized
    element processing to convert HTML into a semantically-structured document.
    """
    
    def __init__(
        self, 
        config: Web2JsonConfig,
        processors: Optional[List[ElementProcessor]] = None
    ) -> None:
        """
        Initialize the transformer with the given configuration and processors.
        
        Args:
            config: The application configuration.
            processors: Optional list of element processors to use.
        """
        self.config = config
        self.parser = HtmlParser(config.processing)
        
        # Create processors if not provided
        if processors is None:
            self.processors = [
                TextProcessor(config.processing),
                TableProcessor(config.processing),
                ListProcessor(config.processing),
                FormProcessor(config.processing),
                MediaProcessor(config.processing),
                SemanticProcessor(config.processing),
            ]
        else:
            self.processors = processors
        
        logger.debug("Initialized transformer", processor_count=len(self.processors))
    
    def transform(self, html: str, url: str) -> Document:
        """
        Transform HTML content into a structured Document.
        
        Args:
            html: The HTML content to transform.
            url: The URL of the document, used for resolving relative links.
            
        Returns:
            A Document object representing the transformed content.
        """
        logger.info("Starting document transformation", url=url)
        
        # Parse the HTML
        soup = self.parser.parse(html, url)
        
        # Extract document title and metadata
        title = self.parser.get_document_title(soup)
        metadata = self.parser.extract_metadata(soup)
        
        # Create a document with the title and URL
        document = Document.create_empty(url, title)
        document.metadata = metadata
        
        # Extract the hierarchical structure based on headings
        document.content = self._extract_sections(soup)
        
        logger.info(
            "Document transformation complete", 
            url=url, 
            section_count=len(document.content)
        )
        
        return document
    
    def _extract_sections(self, soup: BeautifulSoup) -> List[Section]:
        """
        Extract hierarchical sections from the document.
        
        Args:
            soup: The BeautifulSoup object containing the parsed HTML.
            
        Returns:
            A list of top-level sections.
        """
        # Find all heading elements in document order
        all_headings = soup.find_all(self.config.processing.heading_tags)
        if not all_headings:
            # If no headings, treat the entire document as a single section
            return self._extract_content_as_single_section(soup)
        
        # Build a section tree based on heading levels
        sections = []
        section_stack = [(0, None)]  # (level, section)
        
        # Process each heading in order
        for heading in all_headings:
            # Extract heading info
            level = int(heading.name[1])
            title = self._extract_element_content(heading)
            
            # Create a new section for this heading
            section = Section.create_from_heading(
                title=title,
                level=level,
                element_id=heading.get("id")
            )
            
            # Pop the stack until we find the appropriate parent level
            while section_stack and section_stack[-1][0] >= level:
                section_stack.pop()
            
            # Add this section to the parent
            parent_level, parent_section = section_stack[-1]
            if parent_section is None:
                # Top-level section
                sections.append(section)
            else:
                # Child section
                parent_section.add_child(section)
            
            # Add this section to the stack
            section_stack.append((level, section))
            
            # Extract content for this section
            self._extract_section_content(heading, section, soup, all_headings)
        
        return sections
    
    def _extract_element_content(self, element: Tag) -> str:
        """
        Extract the content of an element, preserving specified HTML tags.
        
        Args:
            element: The HTML element.
            
        Returns:
            The element content with preserved HTML tags.
        """
        if not element:
            return ""
        
        # Use the first processor to extract the content
        # This is a bit of a hack, but it avoids duplicating code
        if self.processors:
            return self.processors[0].get_text_content(element)
        else:
            return element.get_text()
    
    def _extract_section_content(
        self, 
        heading: Tag, 
        section: Section, 
        soup: BeautifulSoup,
        all_headings: List[Tag]
    ) -> None:
        """
        Extract content for a section.
        
        Args:
            heading: The heading element that defines the section.
            section: The section to add content to.
            soup: The BeautifulSoup object containing the parsed HTML.
            all_headings: List of all heading elements in the document.
        """
        # Find the next heading that would end this section
        next_heading = None
        for h in all_headings:
            if h == heading:
                continue
                
            # The next heading at the same or higher level ends this section
            if int(h.name[1]) <= section.level:
                # Check if it's after our heading in document order
                current = heading.next_element
                while current and current != h:
                    current = current.next_element
                
                if current == h:
                    next_heading = h
                    break
        
        # Collect content elements between this heading and the next one
        current = heading.next_element
        while current and current != next_heading:
            if isinstance(current, Tag):
                # Skip elements that don't belong in content
                if current.name not in self.config.processing.ignore_tags and not self._is_inside_ignored_tag(current):
                    # Skip headings that define subsections
                    if current.name in self.config.processing.heading_tags:
                        # Only skip if it's a lower level heading
                        if int(current.name[1]) > section.level:
                            pass  # Skip this heading (it defines a subsection)
                        else:
                            # This is a heading at the same or higher level
                            # It should end this section, but we've already found the next heading
                            pass
                    else:
                        # Process this element with the appropriate processor
                        self._process_element(current, section)
            
            current = current.next_element
    
    def _is_inside_ignored_tag(self, element: Tag) -> bool:
        """
        Check if an element is inside an ignored tag.
        
        Args:
            element: The HTML element to check.
            
        Returns:
            True if the element is inside an ignored tag, False otherwise.
        """
        parent = element.parent
        while parent:
            if parent.name in self.config.processing.ignore_tags:
                return True
            parent = parent.parent
        
        return False
    
    def _process_element(self, element: Tag, section: Section) -> None:
        """
        Process an element with the appropriate processor.
        
        Args:
            element: The HTML element to process.
            section: The section to add the processed content to.
        """
        # Skip empty elements and non-content elements
        if not element.name or element.name in self.config.processing.ignore_tags:
            return
        
        # Apply all processors to the element
        for processor in self.processors:
            processor.process(element, section)
    
    def _extract_content_as_single_section(self, soup: BeautifulSoup) -> List[Section]:
        """
        Extract the document content as a single section when no headings are found.
        
        Args:
            soup: The BeautifulSoup object containing the parsed HTML.
            
        Returns:
            A list containing a single section with all document content.
        """
        # Create a section with the document title
        title = self.parser.get_document_title(soup)
        section = Section.create_from_heading(title=title, level=1)
        
        # Add all content elements to the section
        body = soup.find("body")
        if body:
            for child in body.children:
                if isinstance(child, Tag) and child.name not in self.config.processing.ignore_tags:
                    self._process_element(child, section)
        
        return [section]
    
    @classmethod
    def create_default(cls, config: Optional[Web2JsonConfig] = None) -> "Transformer":
        """
        Create a transformer with default configuration and standard processors.
        
        Args:
            config: Optional custom configuration, uses defaults if not provided.
            
        Returns:
            A configured Transformer instance.
        """
        config = config or Web2JsonConfig.create_default()
        
        # Create default processors
        processors = [
            TextProcessor(config.processing),
            TableProcessor(config.processing),
            ListProcessor(config.processing),
            FormProcessor(config.processing),
            MediaProcessor(config.processing),
            SemanticProcessor(config.processing),
        ]
        
        return cls(config, processors)
