"""
Module for extracting hierarchical structure from HTML documents.
"""

from typing import Dict, List, Optional, Tuple, TypeAlias, cast, Set
import uuid

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
        # Each stack entry is a tuple of (level, section)
        # The root level is 0 (lower than any real heading)
        stack: List[Tuple[int, Optional[Section]]] = [(0, None)]
        
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
            
            # Create a new section for this heading
            section = Section.create_from_heading(
                title=title,
                level=level,
                element_id=element_id,
            )
            
            # Pop the stack until we find the appropriate parent level
            # (the highest level that is lower than the current level)
            while stack and stack[-1][0] >= level:
                stack.pop()
            
            # Get the parent section
            parent_level, parent_section = stack[-1]
            
            # Add this section to the parent
            if parent_section is None:
                # This is a top-level section, add it to the root
                root.append(section)
            else:
                # This is a child section, add it to the parent's children
                parent_section.add_child(section)
            
            # Add this section to the stack
            stack.append((level, section))
        
        return root
    
    def collect_content_for_sections(self, soup: Soup, document: Document) -> Document:
        """
        Collect and assign content to sections based on document structure.
        
        This method does not directly process content elements but identifies which
        elements belong to each section, to be processed by specific processors later.
        
        Args:
            soup: The BeautifulSoup object containing the parsed HTML.
            document: The Document object with section hierarchy.
            
        Returns:
            The Document object with content mappings prepared.
        """
        body = soup.find("body")
        if not body or not document.content:
            return document
        
        # Create a mapping of headings to sections
        heading_to_section = {}
        
        def _map_sections(sections: List[Section]) -> None:
            for section in sections:
                # Find the heading element for this section
                heading = soup.find(lambda tag: tag.name in self.config.heading_tags and 
                                             tag.get_text().strip() == section.title and
                                             int(tag.name[1]) == section.level)
                if heading:
                    heading_to_section[heading] = section
                
                # Process children recursively
                if section.children:
                    _map_sections(section.children)
        
        # Create the mapping
        _map_sections(document.content)
        
        # Now identify content elements that belong to each section
        # Using an internal ID for each section since Section objects aren't hashable
        section_id_map = {}
        section_content_map = {}
        
        # Create a unique ID for each section
        for heading, section in heading_to_section.items():
            # Use a UUID as a temporary key
            section_id = str(uuid.uuid4())
            section_id_map[section_id] = section
            section_content_map[section_id] = []
        
        # Get all headings and content elements in document order
        all_elements = []
        
        for element in body.find_all(True):
            if element.name in self.config.heading_tags or element.name in self.config.content_tags:
                if element.name not in self.config.ignore_tags:
                    all_elements.append(element)
        
        # Assign content elements to sections
        current_section_id = None
        
        for element in all_elements:
            if element.name in self.config.heading_tags and element in heading_to_section:
                section = heading_to_section[element]
                # Find the ID for this section
                for section_id, mapped_section in section_id_map.items():
                    if mapped_section is section:
                        current_section_id = section_id
                        break
            elif current_section_id is not None and element.name in self.config.content_tags:
                # Add this element to the current section's content
                section_content_map[current_section_id].append(element)
        
        # Store the content mapping for use by processors
        for section_id, content_elements in section_content_map.items():
            section = section_id_map[section_id]
            section.raw_content_elements = content_elements
        
        return document
    
    def find_section_for_element(self, document: Document, element: Tag) -> Optional[Section]:
        """
        Find the appropriate section for a given HTML element.
        
        Args:
            document: The Document object with section hierarchy.
            element: The HTML element to find a section for.
            
        Returns:
            The appropriate Section object, or None if not found.
        """
        # Get all sections in a flattened list
        all_sections: List[Section] = []
        
        def _collect_sections(sections: List[Section]) -> None:
            for section in sections:
                all_sections.append(section)
                if section.children:
                    _collect_sections(section.children)
        
        _collect_sections(document.content)
        
        # Find the preceding heading
        current = element.previous_element
        preceding_headings = []
        
        while current:
            if isinstance(current, Tag) and current.name in self.config.heading_tags:
                level = int(current.name[1])
                title = current.get_text().strip()
                preceding_headings.append((level, title, current))
            current = current.previous_element
        
        # Reverse to get headings in document order
        preceding_headings.reverse()
        
        if not preceding_headings:
            # If no headings found, use the first section
            return all_sections[0] if all_sections else None
        
        # Get the nearest heading
        _, _, nearest_heading = preceding_headings[-1]
        
        # Find the section corresponding to this heading
        for section in all_sections:
            # Try to match by heading text and level
            if (section.title == nearest_heading.get_text().strip() and 
                section.level == int(nearest_heading.name[1])):
                return section
        
        # If no exact match found, use the closest parent heading
        stack = []
        for level, title, _ in preceding_headings:
            while stack and stack[-1][0] >= level:
                stack.pop()
            stack.append((level, title))
        
        if stack:
            # Find the section matching the closest parent heading
            parent_level, parent_title = stack[-1]
            for section in all_sections:
                if section.title == parent_title and section.level == parent_level:
                    return section
        
        # Fall back to the first section
        return all_sections[0] if all_sections else None
