"""
Module for extracting hierarchical structure from HTML documents.
"""

import re
import uuid
from typing import Dict, List, Optional, Tuple, TypeAlias, cast, Set, Any

import structlog
from bs4 import BeautifulSoup, Tag, NavigableString

from web2json.models.config import ProcessingConfig
from web2json.models.document import Document
from web2json.models.section import Section
from web2json.core.parser import HtmlParser


logger = structlog.get_logger(__name__)

# Type alias for BeautifulSoup for better readability
Soup: TypeAlias = BeautifulSoup


class HierarchyExtractor:
    """
    Extracts hierarchical structure from HTML documents.
    
    This component is responsible for transforming the flat heading structure
    of HTML (h1-h6) into a nested section hierarchy for JSON output.
    """
    
    def __init__(self, config: ProcessingConfig, parser: HtmlParser) -> None:
        """
        Initialize the extractor with the given configuration.
        
        Args:
            config: The processing configuration.
            parser: The HTML parser to use.
        """
        self.config = config
        self.parser = parser
    
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
        
        # Extract semantic structure
        document = self._process_semantic_sections(body, document)
        
        return document
    
    def _process_semantic_sections(self, body: Tag, document: Document) -> Document:
        """
        Process semantic sections in the document body.
        
        This identifies main structural elements like header, main, article, aside, etc.
        and creates appropriate sections for them.
        
        Args:
            body: The body tag of the document.
            document: The Document object to populate.
            
        Returns:
            The populated Document object.
        """
        # Start by looking for semantic sections
        sections = []
        
        # Find main content area if present
        main = body.find("main")
        
        # If main is found, process it first
        if main:
            main_sections = self._extract_sections_from_element(main)
            sections.extend(main_sections)
        else:
            # Process the whole body if no main element
            body_sections = self._extract_sections_from_element(body)
            sections.extend(body_sections)
        
        # Find other top-level semantic sections
        for tag_name in ["article", "section", "aside", "nav"]:
            for element in body.find_all(tag_name, recursive=False):
                # Skip if inside main (already processed)
                if main and main.find(element):
                    continue
                    
                section_type = tag_name
                element_id = element.get("id")
                
                # Find a heading element to use as title
                heading = element.find(self.config.heading_tags)
                if heading:
                    title = self._extract_text(heading)
                    level = int(heading.name[1])
                else:
                    # Use a default title based on the element type
                    title = section_type.capitalize()
                    level = 1  # Default to top level
                
                # Create a section for this element
                section = Section.create_from_heading(
                    title=title,
                    level=level,
                    element_id=element_id
                )
                section.set_type(section_type)
                
                # Extract subsections based on headings
                subsections = self._extract_sections_from_element(element)
                if subsections:
                    section.children = subsections
                
                # Collect content elements for this section
                self._collect_content_for_section(element, section)
                
                sections.append(section)
        
        # Set the document content to the extracted sections
        document.content = sections
        
        return document
    
    def _extract_sections_from_element(self, element: Tag) -> List[Section]:
        """
        Extract sections based on headings within an element.
        
        Args:
            element: The container element to extract sections from.
            
        Returns:
            A list of Section objects.
        """
        # Find all heading elements in document order
        headings = element.find_all(self.config.heading_tags)
        if not headings:
            return []
        
        # Build section hierarchy based on headings
        sections = self._build_section_hierarchy(headings)
        
        # Collect content for each section
        for section in sections:
            self._collect_content_between_headings(element, section)
        
        return sections
    
    def _build_section_hierarchy(self, headings: List[Tag]) -> List[Section]:
        """
        Build a nested section hierarchy from a list of heading elements.
        
        Args:
            headings: List of heading elements from the document.
            
        Returns:
            A list of top-level Section objects with properly nested children.
        """
        # Create a root section level 0 (container for top-level sections)
        root: List[Section] = []
        
        # Initialize the stack with the root level
        # Each stack entry is a tuple of (level, section)
        # The root level is 0 (lower than any real heading)
        stack: List[Tuple[int, Optional[Section]]] = [(0, None)]
        
        # Process each heading to create sections
        for heading in headings:
            # Get the heading level (h1 = 1, h2 = 2, etc.)
            level = int(heading.name[1])
            title = self._extract_text(heading)
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
            
            # Store reference to the heading element
            section.raw_content_elements = [heading]
            
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
    
    def _collect_content_between_headings(self, container: Tag, section: Section) -> None:
        """
        Collect content elements between headings for a section.
        
        Args:
            container: The container element.
            section: The section to collect content for.
        """
        # Get the current heading for this section
        current_heading = None
        for heading in section.raw_content_elements:
            if heading.name in self.config.heading_tags:
                current_heading = heading
                break
        
        if not current_heading:
            return
        
        # Find the next heading
        next_heading = None
        found_current = False
        
        for heading in container.find_all(self.config.heading_tags):
            if found_current:
                # Check if this heading is at the same or higher level
                # (indicating the end of the current section)
                heading_level = int(heading.name[1])
                if heading_level <= section.level:
                    next_heading = heading
                    break
            elif heading is current_heading:
                found_current = True
        
        # Collect all content elements between current_heading and next_heading
        content_elements = []
        current = current_heading.next_sibling
        
        while current and current != next_heading:
            if isinstance(current, Tag):
                if (current.name in self.config.content_tags or 
                    current.name in self.config.semantic_tags):
                    # Skip if this is a heading for a subsection
                    if (current.name in self.config.heading_tags and
                        int(current.name[1]) > section.level):
                        pass
                    else:
                        content_elements.append(current)
            current = current.next_sibling
        
        # Set the raw content elements for this section
        section.raw_content_elements.extend(content_elements)
        
        # Do the same for all child sections recursively
        for child in section.children:
            self._collect_content_between_headings(container, child)
    
    def _collect_content_for_section(self, element: Tag, section: Section) -> None:
        """
        Collect content elements directly from a semantic section element.
        
        Args:
            element: The semantic section element.
            section: The section to collect content for.
        """
        # Collect all content elements in the section
        content_elements = []
        
        for child in element.children:
            if isinstance(child, Tag):
                if (child.name in self.config.content_tags or 
                    child.name in self.config.semantic_tags):
                    # Skip headings (already processed in hierarchy)
                    if child.name in self.config.heading_tags:
                        continue
                    content_elements.append(child)
        
        # Set the raw content elements for this section
        section.raw_content_elements.extend(content_elements)
    
    def _extract_text(self, element: Tag) -> str:
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
