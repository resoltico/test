"""
Processor for HTML tables.
"""

from typing import Dict, List, Optional, Any

import structlog
from bs4 import BeautifulSoup, Tag

from web2json.models.document import Document
from web2json.processors.base import ElementProcessor


logger = structlog.get_logger(__name__)


class TableProcessor(ElementProcessor):
    """
    Processor for HTML table elements.
    
    Extracts structured data from tables and transforms them into
    a JSON-friendly format.
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
        self._process_sections(document.content)
        
        return document
    
    def _process_sections(self, sections: List) -> None:
        """
        Process all sections recursively.
        
        Args:
            sections: List of sections to process.
        """
        for section in sections:
            # Process tables in this section
            self._process_section_tables(section)
            
            # Process child sections recursively
            if section.children:
                self._process_sections(section.children)
    
    def _process_section_tables(self, section) -> None:
        """
        Process tables for a single section.
        
        Args:
            section: The section to process.
        """
        tables = []
        
        # Find all tables in this section's raw content
        for element in section.raw_content_elements:
            if element.name == "table":
                # Skip tables that are nested within other tables
                if not element.find_parent("table"):
                    tables.append(element)
        
        # Process each table
        for table in tables:
            table_dict = self._process_table(table)
            section.add_content(table_dict)
            
            logger.debug(
                "Added table to section", 
                section_title=section.title,
                table_id=table.get("id")
            )
    
    def _process_table(self, table: Tag) -> Dict[str, Any]:
        """
        Process a single table element.
        
        Args:
            table: The table element to process.
            
        Returns:
            A dictionary representation of the table.
        """
        result = {
            "type": "table",
            "headers": [],
            "rows": []
        }
        
        # Extract table ID
        if table.get("id"):
            result["id"] = table["id"]
        
        # Extract caption
        caption = table.find("caption")
        if caption:
            result["caption"] = caption.get_text().strip()
        
        # Extract headers from thead
        thead = table.find("thead")
        if thead:
            header_rows = []
            for tr in thead.find_all("tr"):
                row = []
                for cell in tr.find_all(["th", "td"]):
                    cell_data = {"text": cell.get_text().strip()}
                    
                    # Handle colspan and rowspan
                    if cell.get("colspan"):
                        cell_data["colspan"] = int(cell["colspan"])
                    if cell.get("rowspan"):
                        cell_data["rowspan"] = int(cell["rowspan"])
                    
                    row.append(cell_data)
                
                if row:
                    header_rows.append(row)
            
            if header_rows:
                result["headers"] = header_rows
        
        # Extract body rows
        tbody = table.find("tbody") or table
        data_rows = []
        
        for tr in tbody.find_all("tr", recursive=False):
            # Skip rows that are in thead or tfoot
            if tr.parent and tr.parent.name in ["thead", "tfoot"]:
                continue
            
            row = []
            for cell in tr.find_all(["td", "th"]):
                cell_data = {"text": cell.get_text().strip()}
                
                # Handle colspan and rowspan
                if cell.get("colspan"):
                    cell_data["colspan"] = int(cell["colspan"])
                if cell.get("rowspan"):
                    cell_data["rowspan"] = int(cell["rowspan"])
                
                row.append(cell_data)
            
            if row:
                data_rows.append(row)
        
        result["rows"] = data_rows
        
        # Extract footer
        tfoot = table.find("tfoot")
        if tfoot:
            footer_rows = []
            for tr in tfoot.find_all("tr"):
                row = []
                for cell in tr.find_all(["td", "th"]):
                    cell_data = {"text": cell.get_text().strip()}
                    
                    # Handle colspan
                    if cell.get("colspan"):
                        cell_data["colspan"] = int(cell["colspan"])
                    
                    row.append(cell_data)
                
                if row:
                    footer_rows.append(row)
            
            if footer_rows:
                result["footer"] = footer_rows
        
        return result
