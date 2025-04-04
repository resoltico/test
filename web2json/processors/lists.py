"""
Processor for list elements (ul, ol, dl).
"""

from typing import Dict, List, Any, Optional

import structlog
from bs4 import BeautifulSoup, Tag

from web2json.models.document import Document
from web2json.models.section import Section
from web2json.processors.base import ElementProcessor


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
        processed_content = []
        
        for element in section.raw_content_elements:
            # Skip nested lists (they will be processed with their parent)
            if element.name in ["ul", "ol", "dl"] and not element.find_parent(["ul", "ol", "dl"]):
                if element.name == "ul":
                    content = self._process_unordered_list(element)
                    if content:
                        processed_content.append(content)
                elif element.name == "ol":
                    content = self._process_ordered_list(element)
                    if content:
                        processed_content.append(content)
                elif element.name == "dl":
                    content = self._process_definition_list(element)
                    if content:
                        processed_content.append(content)
        
        # Update the section's content
        for content_item in processed_content:
            section.add_content(content_item)
    
    def _process_unordered_list(self, element: Tag) -> Dict[str, Any]:
        """
        Process an unordered list.
        
        Args:
            element: The ul element.
            
        Returns:
            A dictionary representing the unordered list.
        """
        items = self._process_list_items(element)
        
        return self.create_content_item(
            element_type="unordered_list",
            content={"items": items},
            element_id=element.get("id")
        )
    
    def _process_ordered_list(self, element: Tag) -> Dict[str, Any]:
        """
        Process an ordered list.
        
        Args:
            element: The ol element.
            
        Returns:
            A dictionary representing the ordered list.
        """
        items = self._process_list_items(element)
        
        result = self.create_content_item(
            element_type="ordered_list",
            content={"items": items},
            element_id=element.get("id")
        )
        
        # Add additional attributes
        for attr in ["start", "reversed", "type"]:
            if element.has_attr(attr):
                if attr == "reversed" and element[attr] is True:
                    result[attr] = True
                else:
                    result[attr] = element[attr]
        
        return result
    
    def _process_list_items(self, element: Tag) -> List[Any]:
        """
        Process list items from a ul or ol element.
        
        Args:
            element: The list element.
            
        Returns:
            A list of items.
        """
        items = []
        
        for li in element.find_all("li", recursive=False):
            # Check for nested lists
            nested_lists = li.find_all(["ul", "ol"], recursive=False)
            
            if nested_lists:
                # Item with nested lists
                item_content = self.parser.get_element_text_content(li)
                
                # Clean the item content by removing text from nested lists
                for nested in nested_lists:
                    nested_text = nested.get_text()
                    if nested_text in item_content:
                        item_content = item_content.replace(nested_text, "").strip()
                
                # Process nested lists
                children = []
                for nested in nested_lists:
                    if nested.name == "ul":
                        children.append(self._process_unordered_list(nested))
                    else:  # ol
                        children.append(self._process_ordered_list(nested))
                
                # Create item with children
                if children:
                    items.append({
                        "text": item_content,
                        "children": children
                    })
                else:
                    items.append(item_content)
            else:
                # Simple item
                items.append(self.parser.get_element_text_content(li))
        
        return items
    
    def _process_definition_list(self, element: Tag) -> Dict[str, Any]:
        """
        Process a definition list.
        
        Args:
            element: The dl element.
            
        Returns:
            A dictionary representing the definition list.
        """
        items = []
        current_terms = []
        
        # Process all children
        for child in element.children:
            if not isinstance(child, Tag):
                continue
                
            if child.name == "dt":
                # A term
                term_text = self.parser.get_element_text_content(child)
                current_terms.append(term_text)
            elif child.name == "dd" and current_terms:
                # A definition for the current term(s)
                definition = self.parser.get_element_text_content(child)
                
                # Add an entry for each term
                for term in current_terms:
                    items.append({
                        "term": term,
                        "definition": definition
                    })
                
                # Reset terms
                current_terms = []
        
        # Handle any remaining terms with empty definitions
        for term in current_terms:
            items.append({
                "term": term,
                "definition": ""
            })
        
        return self.create_content_item(
            element_type="definition_list",
            content={"items": items},
            element_id=element.get("id")
        )
