"""
Processor for list elements (ul, ol, dl).
"""

from typing import Dict, List, Optional, Any, cast

import structlog
from bs4 import BeautifulSoup, Tag

from web2json.models.document import Document
from web2json.models.section import Section
from web2json.processors.base import ElementProcessor, ContentItem


logger = structlog.get_logger(__name__)


class ListProcessor(ElementProcessor):
    """
    Processor for HTML list elements.
    
    Handles ordered lists, unordered lists, and definition lists.
    """
    
    def process(self, soup: BeautifulSoup, document: Document) -> Document:
        """
        Process list elements in the document.
        
        Args:
            soup: The BeautifulSoup object containing the parsed HTML.
            document: The Document object to enhance with processed elements.
            
        Returns:
            The enhanced Document object.
        """
        logger.info("Processing list elements")
        
        # Process each section's raw content elements for list content
        self.process_sections(document.content)
        
        return document
    
    def process_section_content(self, section: Section) -> None:
        """
        Process list elements for a single section.
        
        Args:
            section: The section to process.
        """
        for element in section.raw_content_elements:
            # Skip nested lists (they will be processed with their parent)
            if element.name in ["ul", "ol", "dl"] and not element.find_parent(["ul", "ol", "dl"]):
                content_obj = None
                
                if element.name in ["ul", "ol"]:
                    content_obj = self._process_list(element)
                elif element.name == "dl":
                    content_obj = self._process_definition_list(element)
                
                # Add the processed content to the section
                if content_obj:
                    section.add_content(content_obj)
                    
    def _process_list(self, element: Tag) -> ContentItem:
        """
        Process an ordered or unordered list.
        
        Args:
            element: The list element (ul or ol).
            
        Returns:
            A dictionary representation of the list.
        """
        list_type = "unordered_list" if element.name == "ul" else "ordered_list"
        items = []
        
        # Process each list item
        for li in element.find_all("li", recursive=False):
            # Check for nested lists
            nested_lists = li.find_all(["ul", "ol"], recursive=False)
            
            # Process content of the list item
            item_content = self.extract_text_content(li, preserve_formatting=True)
            
            # Remove text of nested lists from the item content
            for nested_list in nested_lists:
                nested_text = nested_list.get_text()
                if nested_text in item_content:
                    item_content = item_content.replace(nested_text, "").strip()
            
            if nested_lists:
                # Create an item with nested lists
                item_obj = {
                    "text": item_content,
                    "children": [self._process_list(nested) for nested in nested_lists]
                }
                items.append(item_obj)
            else:
                # Simple item
                items.append(item_content)
        
        # Create a list content object
        return self.create_content_object(
            element_type=list_type,
            content={"items": items},
            element_id=element.get("id")
        )
    
    def _process_definition_list(self, element: Tag) -> ContentItem:
        """
        Process a definition list.
        
        Args:
            element: The dl element.
            
        Returns:
            A dictionary representation of the definition list.
        """
        items = []
        current_term = None
        current_terms = []
        
        # Process each child element (dt or dd)
        for child in element.children:
            if not isinstance(child, Tag):
                continue
                
            if child.name == "dt":
                # Start a new term
                term_text = self.extract_text_content(child)
                if current_term is not None and current_terms:
                    # Add the previous term(s) with empty definition
                    for term in current_terms:
                        items.append({"term": term, "definition": ""})
                    current_terms = []
                
                current_term = term_text
                current_terms.append(term_text)
            elif child.name == "dd" and current_terms:
                # Add definition for the current term(s)
                definition = self.extract_text_content(child, preserve_formatting=True)
                
                for term in current_terms:
                    items.append({"term": term, "definition": definition})
                
                current_terms = []
                current_term = None
        
        # Add any remaining terms with empty definitions
        for term in current_terms:
            items.append({"term": term, "definition": ""})
        
        # Create a definition list content object
        return self.create_content_object(
            element_type="definition_list",
            content={"items": items},
            element_id=element.get("id")
        )
