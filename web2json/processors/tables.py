"""
Processor for HTML tables.
"""

from typing import Dict, List, Optional, TypeAlias, Any

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
        
        # Find all tables in the document
        tables = soup.find_all("table")
        if not tables:
            logger.debug("No tables found in document")
            return document
        
        logger.debug("Found tables", count=len(tables))
        
        # Process each table
        for table in tables:
            # Skip tables that are nested within other tables
            if table.find_parent("table"):
                continue
                
            # Find parent section for this table
            parent_section = self.find_parent_section(document, table)
            
            if parent_section:
                # Process the table and add to the parent section
                table_dict = self._process_table(table)
                parent_section.add_content(table_dict)
                
                logger.debug(
                    "Added table to section", 
                    section=parent_section.title, 
                    table_id=table.get("id")
                )
        
        return document
    
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
        table_id = table.get("id")
        if table_id:
            result["id"] = table_id
        
        # Extract caption
        caption = table.find("caption")
        if caption:
            result["caption"] = caption.get_text().strip()
        
        # Extract column groups if present
        colgroups = table.find_all("colgroup")
        if colgroups:
            col_attrs = []
            for colgroup in colgroups:
                cols = colgroup.find_all("col")
                for col in cols:
                    attrs = {k: v for k, v in col.attrs.items() if k != "class"}
                    if attrs:
                        col_attrs.append(attrs)
            
            if col_attrs:
                result["column_attributes"] = col_attrs
        
        # Extract headers
        thead = table.find("thead")
        if thead:
            header_rows = thead.find_all("tr")
            headers = []
            
            for row in header_rows:
                header_cells = []
                
                for cell in row.find_all(["th", "td"]):
                    cell_data = {
                        "text": cell.get_text().strip()
                    }
                    
                    # Handle colspan and rowspan
                    if cell.get("colspan"):
                        cell_data["colspan"] = int(cell["colspan"])
                    if cell.get("rowspan"):
                        cell_data["rowspan"] = int(cell["rowspan"])
                    
                    header_cells.append(cell_data)
                
                if header_cells:
                    headers.append(header_cells)
            
            if headers:
                result["headers"] = headers
        
        # Extract body rows
        tbody = table.find("tbody") or table
        rows = []
        
        for tr in tbody.find_all("tr"):
            # Skip rows that are in thead or tfoot
            if tr.parent.name in ["thead", "tfoot"]:
                continue
            
            row_cells = []
            
            for cell in tr.find_all(["td", "th"]):
                cell_data = {
                    "text": cell.get_text().strip()
                }
                
                # Handle colspan and rowspan
                if cell.get("colspan"):
                    cell_data["colspan"] = int(cell["colspan"])
                if cell.get("rowspan"):
                    cell_data["rowspan"] = int(cell["rowspan"])
                
                row_cells.append(cell_data)
            
            if row_cells:
                rows.append(row_cells)
        
        if rows:
            result["rows"] = rows
        
        # Extract footer
        tfoot = table.find("tfoot")
        if tfoot:
            footer_rows = []
            
            for tr in tfoot.find_all("tr"):
                row_cells = []
                
                for cell in tr.find_all(["td", "th"]):
                    cell_data = {
                        "text": cell.get_text().strip()
                    }
                    
                    # Handle colspan and rowspan
                    if cell.get("colspan"):
                        cell_data["colspan"] = int(cell["colspan"])
                    if cell.get("rowspan"):
                        cell_data["rowspan"] = int(cell["rowspan"])
                    
                    row_cells.append(cell_data)
                
                if row_cells:
                    footer_rows.append(row_cells)
            
            if footer_rows:
                result["footer"] = footer_rows
        
        return result
