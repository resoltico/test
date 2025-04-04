"""
Processor for HTML tables.
"""

from typing import Dict, List, Optional, TypeAlias, cast

import structlog
from bs4 import BeautifulSoup, Tag

from web2json.models.document import Document
from web2json.models.section import Section
from web2json.processors.base import ElementProcessor


logger = structlog.get_logger(__name__)

# Type alias for better readability
TableData: TypeAlias = Dict[str, List[List[str]]]


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
            # Extract the table data
            table_dict = self._process_table(table)
            
            # Find the appropriate section to add this table to
            section = self._find_parent_section(document, table)
            
            if section:
                # Add the table to the section's content
                section.add_content(table_dict)
                logger.debug(
                    "Added table to section", 
                    section=section.title, 
                    table_id=table.get("id")
                )
        
        return document
    
    def _process_table(self, table: Tag) -> Dict:
        """
        Process a single table element.
        
        Args:
            table: The table element to process.
            
        Returns:
            A dictionary representation of the table.
        """
        result: Dict = {
            "type": "table",
            "headers": [],
            "rows": []
        }
        
        # Extract table ID and caption
        if table.get("id"):
            result["id"] = table["id"]
        
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
            if header_rows:
                # Handle both single and multiple header rows
                headers = []
                for row in header_rows:
                    header_cells = []
                    for cell in row.find_all(["th", "td"]):
                        # Handle colspan and rowspan
                        cell_data = {
                            "text": cell.get_text().strip()
                        }
                        if cell.get("colspan"):
                            cell_data["colspan"] = int(cell["colspan"])
                        if cell.get("rowspan"):
                            cell_data["rowspan"] = int(cell["rowspan"])
                        header_cells.append(cell_data)
                    headers.append(header_cells)
                result["headers"] = headers
        
        # Extract body rows
        tbody = table.find("tbody") or table
        rows = []
        for tr in tbody.find_all("tr"):
            # Skip rows that are inside a thead or tfoot
            if tr.parent.name in ["thead", "tfoot"]:
                continue
                
            row = []
            for cell in tr.find_all(["td", "th"]):
                # Handle colspan and rowspan
                cell_data = {
                    "text": cell.get_text().strip()
                }
                if cell.get("colspan"):
                    cell_data["colspan"] = int(cell["colspan"])
                if cell.get("rowspan"):
                    cell_data["rowspan"] = int(cell["rowspan"])
                row.append(cell_data)
            rows.append(row)
        result["rows"] = rows
        
        # Extract footer if present
        tfoot = table.find("tfoot")
        if tfoot:
            footer_rows = []
            for tr in tfoot.find_all("tr"):
                row = []
                for cell in tr.find_all(["td", "th"]):
                    cell_data = {
                        "text": cell.get_text().strip()
                    }
                    if cell.get("colspan"):
                        cell_data["colspan"] = int(cell["colspan"])
                    if cell.get("rowspan"):
                        cell_data["rowspan"] = int(cell["rowspan"])
                    row.append(cell_data)
                footer_rows.append(row)
            result["footer"] = footer_rows
        
        return result
    
    def _find_parent_section(self, document: Document, element: Tag) -> Optional[Section]:
        """
        Find the appropriate parent section for an element.
        
        This uses a heuristic approach to determine which section the element
        belongs to based on its position in the document.
        
        Args:
            document: The Document object.
            element: The HTML element to find a parent for.
            
        Returns:
            The parent Section object, or None if no suitable parent was found.
        """
        # This is a simplified implementation that needs to be improved
        # in a real application to accurately place elements in the right sections
        
        # Get all headings that precede this element
        preceding_headings = []
        current = element.previous_element
        while current:
            if current.name and current.name in ["h1", "h2", "h3", "h4", "h5", "h6"]:
                preceding_headings.append((current.name, current.get_text().strip()))
            current = current.previous_element
        
        # Reverse the list to get them in document order
        preceding_headings.reverse()
        
        if not preceding_headings:
            # If no headings found, use the first top-level section
            for item in document.content:
                if isinstance(item, Section):
                    return item
            return None
        
        # Find the matching section based on the nearest heading
        last_heading = preceding_headings[-1]
        return self._find_section_by_title(document.content, last_heading[1])
    
    def _find_section_by_title(
        self, content: List, title: str
    ) -> Optional[Section]:
        """
        Find a section by its title.
        
        Args:
            content: The content list to search in.
            title: The title to match.
            
        Returns:
            The matching Section object, or None if not found.
        """
        for item in content:
            if isinstance(item, Section):
                if item.title == title:
                    return item
                
                # Recursively search in children
                result = self._find_section_by_title(item.children, title)
                if result:
                    return result
        
        # If no exact match found, return the first section as a fallback
        for item in content:
            if isinstance(item, Section):
                return item
        
        return None
