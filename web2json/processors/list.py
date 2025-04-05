"""
List processor for handling ordered, unordered, and definition lists.
"""

from typing import Dict, List, Any, Optional

import structlog
from bs4 import Tag

from web2json.models.section import Section
from web2json.processors.base import ElementProcessor


logger = structlog.get_logger(__name__)


class ListProcessor(ElementProcessor):
    """
    Processor for HTML list elements.
    
    This processor extracts structured data from ordered, unordered,
    and definition lists.
    """
    
    def process(self, element: Tag, section: Section) -> None:
        """
        Process a list element and add the result to the section.
        
        Args:
            element: The list element to process.
            section: The section to add the processed content to.
        """
        if element.name not in ["ul", "ol", "dl"]:
            return
        
        if element.name == "ul":
            self._process_unordered_list(element, section)
        elif element.name == "ol":
            self._process_ordered_list(element, section)
        elif element.name == "dl":
            self._process_definition_list(element, section)
    
    def _process_unordered_list(self, element: Tag, section: Section) -> None:
        """
        Process an unordered list element.
        
        Args:
            element: The unordered list element.
            section: The section to add the processed content to.
        """
        items = []
        
        for li in element.find_all("li", recursive=False):
            item_text = self.get_text_content(li)
            if item_text.strip():
                items.append(item_text)
        
        if items:
            list_data = {
                "type": "unordered-list",
                "items": items
            }
            
            section.add_content(list_data)
    
    def _process_ordered_list(self, element: Tag, section: Section) -> None:
        """
        Process an ordered list element.
        
        Args:
            element: The ordered list element.
            section: The section to add the processed content to.
        """
        items = []
        
        for li in element.find_all("li", recursive=False):
            item_text = self.get_text_content(li)
            if item_text.strip():
                items.append(item_text)
        
        if items:
            list_data = {
                "type": "ordered-list",
                "items": items
            }
            
            # Add start attribute if present
            start = element.get("start")
            if start:
                try:
                    list_data["start"] = int(start)
                except ValueError:
                    pass
            
            section.add_content(list_data)
    
    def _process_definition_list(self, element: Tag, section: Section) -> None:
        """
        Process a definition list element.
        
        Args:
            element: The definition list element.
            section: The section to add the processed content to.
        """
        terms = []
        
        # Process dt-dd pairs
        dt = element.find("dt")
        while dt:
            term = {
                "term": self.get_text_content(dt).strip(),
                "definitions": []
            }
            
            # Find all following dd elements
            dd = dt.find_next_sibling()
            while dd and dd.name == "dd":
                definition = self.get_text_content(dd).strip()
                if definition:
                    term["definitions"].append(definition)
                dd = dd.find_next_sibling()
            
            if term["term"] and term["definitions"]:
                terms.append(term)
            
            # Move to the next dt
            dt = dd if dd and dd.name == "dt" else None
            if not dt:
                # Try to find the next dt
                next_dt = element.find("dt", recursive=False)
                dt = next_dt if next_dt and next_dt not in element.find_all("dt", recursive=False)[:len(terms)] else None
        
        if terms:
            list_data = {
                "type": "definition-list",
                "terms": terms
            }
            
            section.add_content(list_data)
