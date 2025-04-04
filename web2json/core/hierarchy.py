"""
Module for extracting hierarchical structure from HTML documents.
"""

from typing import Dict, List, Optional, Tuple, TypeAlias, cast

import structlog
from bs4 import BeautifulSoup, Tag

from web2json.models.config import ProcessingConfig
from web2json.models.document import Document
from web2json.models.section import Section


logger = structlog.get_logger(__name__)

# Type alias for BeautifulSoup for better readability
Soup: TypeAlias = BeautifulSoup


class HierarchyExtractor:
    """
    Extracts hierarchical structure from HTML documents using a stack-based approach.
    
    This component is responsible for transforming the flat heading structure
    of HTML (h1-h6) into a nested section hierarchy for JSON output.
    """
    
    def __init__(self, config: ProcessingConfig) -> None:
        """Initialize the extractor with the given configuration."""
        self.config = config
    
    def extract_hierarchy(self, soup: Soup, document: Document) -> Document:
        """
        Extract the hierarchical structure from the HTML document.
        
        Args:
            soup: The BeautifulSoup object containing the parsed HTML.
            document: The Document object to populate with the hierarchy.
            
        Returns:
            The populated Document object.
        """
        logger.info("Extracting document hierarchy")
        
        # Create a root section to hold content before the first heading
        root: List[Section | Dict] = []
        
        # Initialize the stack with the root
        stack: List[Tuple[int, List[Section | Dict]]] = [(0, root)]
        
        # Current section being processed
        current_section: Optional[Section] = None
        
        # Process all elements in the document body
        body = soup.find("body")
        if not body:
            logger.warning("No body tag found in document")
            document.content = root
            return document
        
        # Extract and process elements in order
        for element in body.find_all(True):
            # Skip elements that should be ignored
            if element.name in self.config.ignore_tags:
                continue
            
            # Process headings to create new sections
            if element.name in self.config.heading_tags:
                current_section = self._process_heading(element, stack)
            
            # Process content elements
            elif current_section is not None and element.name in self.config.content_tags:
                self._process_content(element, current_section)
        
        # Set the content on the document
        document.content = root
        return document
    
    def _process_heading(
        self, element: Tag, stack: List[Tuple[int, List[Section | Dict]]]
    ) -> Section:
        """
        Process a heading element and update the section hierarchy.
        
        Args:
            element: The heading element (h1-h6).
            stack: The stack of sections being built.
            
        Returns:
            The newly created Section object.
        """
        # Determine the heading level
        level = int(element.name[1])  # Extract number from h1, h2, etc.
        title = element.get_text().strip()
        element_id = element.get("id")
        
        logger.debug(
            "Processing heading", 
            level=level, 
            title=title, 
            id=element_id
        )
        
        # Pop the stack until we find the right parent level
        while stack and stack[-1][0] >= level:
            stack.pop()
        
        if not stack:
            # Ensure there's always at least the root level
            logger.warning("Stack became empty, resetting to root")
            root: List[Section | Dict] = []
            stack.append((0, root))
        
        # Create a new section for this heading
        section = Section.create_from_heading(
            title=title,
            level=level,
            element_id=element_id,
        )
        
        # Add to parent's children
        parent_level, parent_children = stack[-1]
        parent_children.append(section)
        
        # Add this section to the stack
        stack.append((level, section.children))
        
        return section
    
    def _process_content(self, element: Tag, section: Section) -> None:
        """
        Process a content element and add it to the current section.
        
        Args:
            element: The content element to process.
            section: The current section to add the content to.
        """
        # This is a simplified version - in a real implementation,
        # we would use specialized processors for different element types
        content_text = element.get_text().strip()
        if content_text:
            section.add_content(content_text)
            
            # Debug log truncated content for visibility
            truncated = (
                content_text[:50] + "..." 
                if len(content_text) > 50 else content_text
            )
            logger.debug(
                "Added content to section", 
                section=section.title, 
                content_preview=truncated
            )
