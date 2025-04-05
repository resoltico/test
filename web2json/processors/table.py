"""
Table processor for handling HTML tables.
"""

from typing import Dict, List, Any, Optional

import structlog
from bs4 import Tag

from web2json.models.section import Section
from web2json.processors.base import ElementProcessor


logger = structlog.get_logger(__name__)


class TableProcessor(ElementProcessor):
    """
    Processor for HTML tables.
    
    This processor extracts structured data from table elements,
    including headers, rows, and captions.
    """
    
    def process(self, element: Tag, section: Section) -> None:
        """
        Process a table element and add the result to the section.
        
        Args:
            element: The table element to process.
            section: The section to add the processed content to.
        """
        if element.name != "table":
            return
        
        # Create a table structure
        table_data = {
            "type": "table",
            "headers": [],
            "rows": []
        }
        
        # Extract caption
        caption = element.find("caption")
        if caption:
            table_data["caption"] = caption.get_text().strip()
        
        # Extract headers
        thead = element.find("thead")
        if thead:
            headers = []
            for tr in thead.find_all("tr"):
                row = []
                for th in tr.find_all(["th", "td"]):
                    cell = {"text": th.get_text().strip()}
                    
                    # Add colspan and rowspan if present
                    colspan = th.get("colspan")
                    if colspan:
                        cell["colspan"] = int(colspan)
                    
                    rowspan = th.get("rowspan")
                    if rowspan:
                        cell["rowspan"] = int(rowspan)
                    
                    row.append(cell)
                
                headers.append(row)
            
            table_data["headers"] = headers
        
        # Extract rows from tbody or table directly
        tbody = element.find("tbody") or element
        rows = []
        
        for tr in tbody.find_all("tr", recursive=False) if tbody.name == "tbody" else tbody.find_all("tr"):
            # Skip rows in thead
            if thead and thead.find("tr") == tr:
                continue
            
            # Skip rows in tfoot
            tfoot = element.find("tfoot")
            if tfoot and tfoot.find("tr") == tr:
                continue
            
            row = []
            for td in tr.find_all(["td", "th"]):
                cell = {"text": td.get_text().strip()}
                
                # Add colspan and rowspan if present
                colspan = td.get("colspan")
                if colspan:
                    cell["colspan"] = int(colspan)
                
                rowspan = td.get("rowspan")
                if rowspan:
                    cell["rowspan"] = int(rowspan)
                
                row.append(cell)
            
            rows.append(row)
        
        table_data["rows"] = rows
        
        # Extract footer
        tfoot = element.find("tfoot")
        if tfoot:
            footer = []
            for tr in tfoot.find_all("tr"):
                row = []
                for td in tr.find_all(["td", "th"]):
                    cell = {"text": td.get_text().strip()}
                    
                    # Add colspan and rowspan if present
                    colspan = td.get("colspan")
                    if colspan:
                        cell["colspan"] = int(colspan)
                    
                    rowspan = td.get("rowspan")
                    if rowspan:
                        cell["rowspan"] = int(rowspan)
                    
                    row.append(cell)
                
                footer.append(row)
            
            table_data["footer"] = footer
        
        # Add the table to the section content
        section.add_content(table_data)
