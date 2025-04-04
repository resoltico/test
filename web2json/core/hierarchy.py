"""
Module for extracting hierarchical structure from HTML documents.
"""

from typing import Dict, List, Optional, Tuple, TypeAlias, cast, Set
import uuid
import re

import structlog
from bs4 import BeautifulSoup, Tag, NavigableString

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
        """
        Initialize the extractor with the given configuration.
        
        Args:
            config: The processing configuration.
        """
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
            # Create a default section with the document title
            default_section = Section.create_from_heading(
                title=document.title,
                level=1,
                element_id=None
            )
            document.content = [default_section]
            
            # Collect all content elements
            content_elements = body.find_all(self.config.content_tags)
            default_section.raw_content_elements = content_elements
            
            return document
        
        # Process all headings to build the section hierarchy
        document.content = self._build_section_hierarchy(headings)
        
        # Collect content for each section
        document = self.collect_content_for_sections(soup, document)
        
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
            title = self._extract_clean_text(heading)
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
        
        This method identifies which elements belong to each section by analyzing
        the document's structure and heading hierarchy.
        
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
        heading_to_section: Dict[Tag, Section] = {}
        
        def _map_sections(sections: List[Section]) -> None:
            for section in sections:
                # Find the heading element for this section by matching title and level
                headings = soup.find_all(
                    lambda tag: tag.name in self.config.heading_tags and 
                               self._extract_clean_text(tag) == section.title and
                               int(tag.name[1]) == section.level
                )
                
                # If multiple matches, try to find one with the matching ID
                if len(headings) > 1 and section.id:
                    for heading in headings:
                        if heading.get("id") == section.id:
                            heading_to_section[heading] = section
                            break
                    else:
                        # No exact ID match, use the first one
                        heading_to_section[headings[0]] = section
                elif headings:
                    heading_to_section[headings[0]] = section
                
                # Process children recursively
                if section.children:
                    _map_sections(section.children)
        
        # Create the mapping
        _map_sections(document.content)
        
        # Now identify content elements that belong to each section
        section_id_map: Dict[str, Section] = {}
        section_content_map: Dict[str, List[Tag]] = {}
        
        # Create a unique ID for each section
        for heading, section in heading_to_section.items():
            # Use a UUID as a temporary key
            section_id = str(uuid.uuid4())
            section_id_map[section_id] = section
            section_content_map[section_id] = []
        
        # Get all elements in document order
        all_elements = []
        for element in body.find_all(True):
            if (element.name in self.config.heading_tags or 
                element.name in self.config.content_tags or
                element.name in self.config.semantic_tags):
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
        current = element.previous_sibling
        preceding_headings = []
        
        # Look backwards through siblings
        while current:
            if isinstance(current, Tag) and current.name in self.config.heading_tags:
                level = int(current.name[1])
                title = self._extract_clean_text(current)
                preceding_headings.append((level, title, current))
                break
            current = current.previous_sibling
        
        # If no preceding sibling heading, look for parent or ancestor headings
        if not preceding_headings:
            parent = element.parent
            while parent:
                # Check previous siblings of the parent
                prev = parent.previous_sibling
                while prev and not preceding_headings:
                    if isinstance(prev, Tag) and prev.name in self.config.heading_tags:
                        level = int(prev.name[1])
                        title = self._extract_clean_text(prev)
                        preceding_headings.append((level, title, prev))
                        break
                    prev = prev.previous_sibling
                
                # If still no heading found, move up to the parent's parent
                if not preceding_headings:
                    parent = parent.parent
                else:
                    break
        
        # If we found preceding headings, use them
        if preceding_headings:
            # Get the nearest heading
            level, title, heading = preceding_headings[0]
            
            # Try to find an exact match
            for section in all_sections:
                if section.title == title and section.level == level:
                    return section
                    
            # If no exact match, find the closest section by level
            valid_sections = [s for s in all_sections if s.level <= level]
            if valid_sections:
                # Sort by level (descending) to get the closest level
                valid_sections.sort(key=lambda s: -s.level)
                return valid_sections[0]
        
        # If no heading found, use the first section
        return all_sections[0] if all_sections else None
    
    def _extract_clean_text(self, element: Tag) -> str:
        """
        Extract clean text from an element, removing extra whitespace.
        
        Args:
            element: The HTML element.
            
        Returns:
            The clean text.
        """
        # Get the text content
        text = element.get_text()
        
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text
