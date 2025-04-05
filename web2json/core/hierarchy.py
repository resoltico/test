"""
Module for extracting hierarchical structure from HTML documents.
"""

import re
from typing import Dict, List, Optional, Tuple, cast, Set, Any

import structlog
from bs4 import BeautifulSoup, Tag, NavigableString

from web2json.models.config import ProcessingConfig
from web2json.models.document import Document
from web2json.models.section import Section
from web2json.core.parser import HtmlParser


logger = structlog.get_logger(__name__)


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
    
    def extract_hierarchy(self, soup: BeautifulSoup, document: Document) -> Document:
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
        
        # Build the section hierarchy based on headings
        sections = self._build_section_hierarchy(body)
        
        # Attach content to sections
        self._collect_content_for_sections(body, sections)
        
        # Set the document content to the extracted sections
        document.content = sections
        
        return document
    
    def _build_section_hierarchy(self, container: Tag) -> List[Section]:
        """
        Build a nested section hierarchy from the container.
        
        Args:
            container: Container element (usually the body or main).
            
        Returns:
            A list of top-level Section objects with properly nested children.
        """
        # Find all heading elements in document order
        headings = container.find_all(self.config.heading_tags)
        if not headings:
            return []
        
        # Create a root section level 0 (container for top-level sections)
        root: List[Section] = []
        
        # Initialize the stack with the root level
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
            
            # Store the heading element itself in raw_content_elements
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
    
    def _collect_content_for_sections(self, container: Tag, sections: List[Section]) -> None:
        """
        Collect content for all sections in the hierarchy.
        
        Args:
            container: Container element (usually the body or main).
            sections: List of sections to collect content for.
        """
        # First, define all section boundaries
        self._define_section_boundaries(container, sections)
        
        # Then, collect content within those boundaries
        for section in sections:
            self._collect_content_between_boundaries(container, section)
            # Recursively process children
            self._collect_content_for_sections(container, section.children)
    
    def _define_section_boundaries(self, container: Tag, sections: List[Section]) -> None:
        """
        Define the boundaries of each section.
        
        Args:
            container: Container element.
            sections: List of sections to define boundaries for.
        """
        # Get all heading elements in document order
        headings = container.find_all(self.config.heading_tags)
        heading_elements = {h: idx for idx, h in enumerate(headings)}
        
        for section in sections:
            # Get the current heading element
            current_heading = section.raw_content_elements[0] if section.raw_content_elements else None
            if not current_heading or current_heading.name not in self.config.heading_tags:
                continue
                
            current_idx = heading_elements.get(current_heading)
            if current_idx is None:
                continue
                
            # Find next heading at same or higher level
            next_heading = None
            next_idx = len(headings)
            
            for i in range(current_idx + 1, len(headings)):
                h = headings[i]
                level = int(h.name[1])
                if level <= section.level:
                    next_heading = h
                    next_idx = i
                    break
            
            # Store the range of elements between headings
            section.raw_tags = ['start']
            
            # Find all elements between current_heading and next_heading
            current = current_heading.next_element
            
            while current and (next_heading is None or current != next_heading):
                if isinstance(current, Tag) and current.name:
                    section.raw_tags.append(current.name)
                current = current.next_element
            
            section.raw_tags.append('end')
            
            # Also process children
            self._define_section_boundaries(container, section.children)
    
    def _collect_content_between_boundaries(self, container: Tag, section: Section) -> None:
        """
        Collect content elements between section boundaries.
        
        Args:
            container: Container element.
            section: The section to collect content for.
        """
        # Get the heading element that defines this section
        heading = section.raw_content_elements[0] if section.raw_content_elements else None
        if not heading or heading.name not in self.config.heading_tags:
            return
        
        # Find the next heading element that would end this section
        next_heading = None
        for h in container.find_all(self.config.heading_tags):
            if h == heading:
                continue
            if int(h.name[1]) <= section.level:
                # This is a heading at the same or higher level, so it ends our section
                next_sibling = heading.find_next_sibling()
                while next_sibling and next_sibling != h:
                    next_sibling = next_sibling.find_next_sibling()
                if next_sibling == h:
                    next_heading = h
                    break
        
        # Collect all content elements between heading and next_heading
        elements = []
        current = heading.next_sibling
        
        while current and current != next_heading:
            if isinstance(current, Tag):
                # Skip headings that define child sections
                is_subsection_heading = (
                    current.name in self.config.heading_tags and 
                    int(current.name[1]) > section.level
                )
                
                if not is_subsection_heading:
                    elements.append(current)
            current = current.next_sibling
        
        # For paragraph-like content, preserve the HTML directly
        for element in elements:
            if element.name == 'p':
                # Preserve the paragraph HTML directly
                content = str(element)
                section.add_content(content)
            elif element.name in {'ul', 'ol', 'dl'}:
                # Preserve list HTML directly
                content = str(element)
                section.add_content(content)
            elif element.name == 'table':
                # For tables, create a structured representation
                self._process_table(element, section)
            elif element.name in self.config.content_tags:
                # For other content elements, preserve HTML directly
                content = str(element)
                section.add_content(content)
    
    def _process_table(self, table: Tag, section: Section) -> None:
        """
        Process a table element and add it to the section's content.
        
        Args:
            table: The table element.
            section: The section to add the processed table to.
        """
        # Create a table structure
        table_data = {
            "type": "table",
            "headers": [],
            "rows": []
        }
        
        # Extract caption
        caption = table.find('caption')
        if caption:
            table_data["caption"] = caption.get_text()
        
        # Extract headers
        thead = table.find('thead')
        if thead:
            headers = []
            for tr in thead.find_all('tr'):
                row = []
                for th in tr.find_all(['th', 'td']):
                    cell = {"text": th.get_text()}
                    if th.get('colspan'):
                        cell["colspan"] = int(th['colspan'])
                    if th.get('rowspan'):
                        cell["rowspan"] = int(th['rowspan'])
                    row.append(cell)
                headers.append(row)
            table_data["headers"] = headers
        
        # Extract rows
        tbody = table.find('tbody') or table
        rows = []
        for tr in tbody.find_all('tr'):
            # Skip rows in thead
            if thead and tr.parent == thead:
                continue
                
            row = []
            for td in tr.find_all(['td', 'th']):
                cell = {"text": td.get_text()}
                if td.get('colspan'):
                    cell["colspan"] = int(td['colspan'])
                if td.get('rowspan'):
                    cell["rowspan"] = int(td['rowspan'])
                row.append(cell)
            rows.append(row)
        table_data["rows"] = rows
        
        # Extract footer
        tfoot = table.find('tfoot')
        if tfoot:
            footer = []
            for tr in tfoot.find_all('tr'):
                row = []
                for td in tr.find_all(['td', 'th']):
                    cell = {"text": td.get_text()}
                    if td.get('colspan'):
                        cell["colspan"] = int(td['colspan'])
                    if td.get('rowspan'):
                        cell["rowspan"] = int(td['rowspan'])
                    row.append(cell)
                footer.append(row)
            table_data["footer"] = footer
        
        # Add the table to the section content
        section.add_content(table_data)
    
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
