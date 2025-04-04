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
        
        # Find the body element
        body = soup.find("body")
        if not body:
            logger.warning("No body tag found in document")
            return document
        
        # Find all heading elements in document order
        headings = body.find_all(self.config.heading_tags)
        if not headings:
            logger.warning("No headings found in document")
            return document
        
        # Process all headings to build the section hierarchy
        document.content = self._build_section_hierarchy(headings)
        
        return document
    
    def _build_section_hierarchy(self, headings: List[Tag]) -> List[Section]:
        """
        Build a nested section hierarchy from a list of heading elements.
        
        This uses a stack-based approach to properly nest sections based on heading levels.
        
        Args:
            headings: List of heading elements from the document.
            
        Returns:
            A list of top-level Section objects with properly nested children.
        """
        # Create a root section level 0 (container for top-level sections)
        root: List[Section] = []
        
        # Initialize the stack with the root
        # Each stack entry is a tuple of (level, list of sections)
        stack: List[Tuple[int, List[Section]]] = [(0, root)]
        
        # Process each heading to create sections
        for heading in headings:
            # Get the heading level (h1 = 1, h2 = 2, etc.)
            level = int(heading.name[1])
            title = heading.get_text().strip()
            element_id = heading.get("id")
            
            logger.debug(
                "Processing heading", 
                level=level, 
                title=title, 
                id=element_id
            )
            
            # Pop the stack until we find the appropriate parent level
            while stack and stack[-1][0] >= level:
                stack.pop()
            
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
        
        return root
    
    def extract_content_for_sections(self, soup: Soup, document: Document) -> Document:
        """
        Extract and assign content to sections based on document structure.
        
        This processes elements between headings and assigns them to the appropriate sections.
        
        Args:
            soup: The BeautifulSoup object containing the parsed HTML.
            document: The Document object with section hierarchy.
            
        Returns:
            The Document object with content assigned to sections.
        """
        body = soup.find("body")
        if not body or not document.content:
            return document
        
        # Find all headings and content elements in document order
        all_elements = []
        
        for element in body.find_all(True):
            if element.name in self.config.heading_tags or element.name in self.config.content_tags:
                if element.name not in self.config.ignore_tags:
                    all_elements.append(element)
        
        # Find all sections in a flattened list
        all_sections = self._flatten_sections(document.content)
        
        # Map headings to sections
        heading_to_section = {}
        for section in all_sections:
            # Find the heading element that created this section
            for element in all_elements:
                if (element.name in self.config.heading_tags and 
                    element.get_text().strip() == section.title and
                    int(element.name[1]) == section.level):
                    heading_to_section[element] = section
                    break
        
        # Now group elements between headings
        current_section = None
        current_heading = None
        
        for element in all_elements:
            if element.name in self.config.heading_tags:
                if element in heading_to_section:
                    current_section = heading_to_section[element]
                    current_heading = element
            elif current_section and element.name in self.config.content_tags:
                # We don't process content elements directly here
                # This is handled by specialized processors
                pass
        
        return document
    
    def _flatten_sections(self, sections: List[Section]) -> List[Section]:
        """
        Flatten a nested section hierarchy into a single list.
        
        Args:
            sections: List of sections that may have nested children.
            
        Returns:
            A flattened list of all sections.
        """
        result = []
        
        for section in sections:
            result.append(section)
            if section.children:
                result.extend(self._flatten_sections(section.children))
        
        return result
