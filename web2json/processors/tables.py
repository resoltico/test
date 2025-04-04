"""
Processor for HTML tables.
"""

from typing import Dict, List, Any, Optional, Union, cast

import structlog
from bs4 import BeautifulSoup, Tag

from web2json.models.document import Document
from web2json.models.section import Section
from web2json.processors.base import ElementProcessor


logger = structlog.get_logger(__name__)


class TableProcessor(ElementProcessor):
    """
    Processor for HTML table elements.
    
    Extracts structured data from tables and transforms them into
    a JSON representation.
    """
    
    def process(self, soup: BeautifulSoup, document: Document) -> Document:
        """
        Process table elements in the document.
        
        Args:
            soup: The BeautifulSoup object containing the parsed HTML.
            document: The Document object to enhance with processed elements.
            
        Returns:
            The enhanced Document object.
        """
        logger.info("Processing table elements")
        
        # Process each section's content for tables
        self.process_sections(document.content)
        
        return document
    
    def process_section_content(self, section: Section) -> None:
        """
        Process tables for a single section.
        
        Args:
            section: The section to process.
        """
        processed_content = []
        
        # Find all tables in this section's raw content
        for element in section.raw_content_elements:
            if element.name == "table":
                # Skip tables that are nested within other tables
                if not element.find_parent("table"):
                    table_dict = self._process_table(element)
                    processed_content.append(table_dict)
        
        # Update the section's content
        for content_item in processed_content:
            section.add_content(content_item)
    
    def _process_table(self, table: Tag) -> Dict[str, Any]:
        """
        Process a single table element.
        
        Args:
            table: The table element to process.
            
        Returns:
            A dictionary representation of the table.
        """
        # Create a table object
        result = {
            "type": "table",
            "headers": [],
            "rows": []
        }
        
        # Extract table ID if present
        if table.get("id"):
            result["id"] = table["id"]
        
        # Extract caption if present
        caption = table.find("caption")
        if caption:
            result["caption"] = self.parser.get_element_text_content(caption)
        
        # Process table header rows
        thead = table.find("thead")
        if thead:
            headers = self._process_header_rows(thead.find_all("tr"))
            if headers:
                result["headers"] = headers
        
        # If no thead, check if first row contains th elements
        if not result["headers"]:
            first_row = table.find("tr")
            if first_row and first_row.find("th"):
                headers = self._process_header_rows([first_row])
                if headers:
                    result["headers"] = headers
        
        # Process table body rows
        tbody = table.find("tbody") or table
        
        # Get rows that are not in thead or tfoot
        rows = []
        for tr in tbody.find_all("tr", recursive=False):
            # Skip rows that are already processed as headers
            parent = tr.parent
            if parent and parent.name == "thead":
                continue
                
            # Process this row
            row_data = self._process_row(tr)
            if row_data:
                rows.append(row_data)
        
        result["rows"] = rows
        
        # Process table footer rows
        tfoot = table.find("tfoot")
        if tfoot:
            footer_rows = []
            for tr in tfoot.find_all("tr"):
                row_data = self._process_row(tr)
                if row_data:
                    footer_rows.append(row_data)
            
            if footer_rows:
                result["footer"] = footer_rows
        
        return result
    
    def _process_header_rows(self, rows: List[Tag]) -> List[List[Dict[str, Any]]]:
        """
        Process header rows from a table.
        
        Args:
            rows: List of tr elements from the thead.
            
        Returns:
            A list of header rows, each containing cell data.
        """
        header_rows = []
        
        for tr in rows:
            row = []
            for cell in tr.find_all(["th", "td"]):
                cell_data = {
                    "text": self.parser.get_element_text_content(cell)
                }
                
                # Handle colspan and rowspan
                if cell.get("colspan"):
                    try:
                        cell_data["colspan"] = int(cell["colspan"])
                    except (ValueError, TypeError):
                        pass
                        
                if cell.get("rowspan"):
                    try:
                        cell_data["rowspan"] = int(cell["rowspan"])
                    except (ValueError, TypeError):
                        pass
                
                row.append(cell_data)
            
            if row:
                header_rows.append(row)
        
        return header_rows
    
    def _process_row(self, row: Tag) -> List[Dict[str, Any]]:
        """
        Process a table row.
        
        Args:
            row: The tr element.
            
        Returns:
            A list of cell data for the row.
        """
        cells = []
        
        for cell in row.find_all(["td", "th"]):
            cell_data = {
                "text": self.parser.get_element_text_content(cell)
            }
            
            # Handle colspan and rowspan
            if cell.get("colspan"):
                try:
                    cell_data["colspan"] = int(cell["colspan"])
                except (ValueError, TypeError):
                    pass
                    
            if cell.get("rowspan"):
                try:
                    cell_data["rowspan"] = int(cell["rowspan"])
                except (ValueError, TypeError):
                    pass
            
            cells.append(cell_data)
        
        return cells
