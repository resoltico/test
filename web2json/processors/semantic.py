"""
Processor for semantic HTML5 elements.
"""

from typing import Dict, List, Optional, Any

import structlog
from bs4 import BeautifulSoup, Tag

from web2json.models.document import Document
from web2json.processors.base import ElementProcessor


logger = structlog.get_logger(__name__)


class SemanticProcessor(ElementProcessor):
    """
    Processor for semantic HTML5 elements.
    
    Handles elements like article, aside, nav, details, etc., that provide
    semantic structure to HTML documents.
    """
    
    # Semantic elements to process
    SEMANTIC_ELEMENTS = {
        "article", "aside", "details", "summary", "nav", 
        "main", "address", "header", "footer", "search",
        "time", "mark", "dialog", "output", "progress", "meter"
    }
    
    def process(self, soup: BeautifulSoup, document: Document) -> Document:
        """
        Process semantic elements in the document.
        
        Args:
            soup: The BeautifulSoup object containing the parsed HTML.
            document: The Document object to enhance with processed elements.
            
        Returns:
            The enhanced Document object.
        """
        logger.info("Processing semantic elements")
        
        # Process each type of semantic element
        for element_type in self.SEMANTIC_ELEMENTS:
            elements = [
                elem for elem in soup.find_all(element_type)
                if not self._is_nested_semantic(elem)
            ]
            
            if not elements:
                continue
                
            logger.debug(f"Found {element_type} elements", count=len(elements))
            
            for element in elements:
                # Find parent section for this element
                parent_section = self.find_parent_section(document, element)
                
                if parent_section:
                    # Process the element based on its type
                    processed = self._process_element(element)
                    
                    if processed:
                        parent_section.add_content(processed)
                        
                        logger.debug(
                            f"Added {element_type} to section", 
                            section=parent_section.title, 
                            element_id=element.get("id", "")
                        )
        
        return document
    
    def _is_nested_semantic(self, element: Tag) -> bool:
        """
        Check if a semantic element is nested inside another semantic element.
        
        Args:
            element: The semantic element to check.
            
        Returns:
            True if the element is nested inside another semantic element, False otherwise.
        """
        parent = element.parent
        while parent:
            if parent.name in self.SEMANTIC_ELEMENTS:
                return True
            parent = parent.parent
            
        return False
    
    def _process_element(self, element: Tag) -> Optional[Dict[str, Any]]:
        """
        Process a semantic element based on its type.
        
        Args:
            element: The semantic element to process.
            
        Returns:
            A dictionary representation of the element, or None if it couldn't be processed.
        """
        element_type = element.name
        
        # Dispatch to specific processing methods based on element type
        if element_type == "article":
            return self._process_article(element)
        elif element_type == "aside":
            return self._process_aside(element)
        elif element_type == "details":
            return self._process_details(element)
        elif element_type == "summary":
            # Skip summary as it's processed as part of details
            return None
        elif element_type == "nav":
            return self._process_nav(element)
        elif element_type == "address":
            return self._process_address(element)
        elif element_type in ["header", "footer"]:
            return self._process_header_footer(element)
        elif element_type == "time":
            return self._process_time(element)
        elif element_type == "mark":
            return self._process_mark(element)
        elif element_type in ["progress", "meter"]:
            return self._process_measurement(element)
        elif element_type == "dialog":
            return self._process_dialog(element)
        elif element_type == "search":
            return self._process_search(element)
        elif element_type == "output":
            return self._process_output(element)
        else:
            # Generic handler for other semantic elements
            return self._process_generic_semantic(element)
    
    def _process_article(self, element: Tag) -> Dict[str, Any]:
        """
        Process an article element.
        
        Args:
            element: The article element.
            
        Returns:
            A dictionary representation of the article.
        """
        result = {
            "type": "article",
            "content": []
        }
        
        # Extract ID
        if element.has_attr("id"):
            result["id"] = element["id"]
        
        # Extract heading if present
        heading = element.find(["h1", "h2", "h3", "h4", "h5", "h6"])
        if heading:
            result["title"] = heading.get_text().strip()
        
        # Extract content
        content = element.get_text().strip()
        
        # Remove heading text if present
        if heading:
            heading_text = heading.get_text().strip()
            if heading_text in content:
                content = content.replace(heading_text, "", 1).strip()
        
        if content:
            result["content"].append({"type": "text", "text": content})
        
        return result
    
    def _process_aside(self, element: Tag) -> Dict[str, Any]:
        """
        Process an aside element.
        
        Args:
            element: The aside element.
            
        Returns:
            A dictionary representation of the aside.
        """
        result = {
            "type": "aside",
            "content": []
        }
        
        # Extract ID
        if element.has_attr("id"):
            result["id"] = element["id"]
        
        # Extract heading if present
        heading = element.find(["h1", "h2", "h3", "h4", "h5", "h6"])
        if heading:
            result["title"] = heading.get_text().strip()
        
        # Extract content
        content = element.get_text().strip()
        
        # Remove heading text if present
        if heading:
            heading_text = heading.get_text().strip()
            if heading_text in content:
                content = content.replace(heading_text, "", 1).strip()
        
        if content:
            result["content"].append({"type": "text", "text": content})
        
        return result
    
    def _process_details(self, element: Tag) -> Dict[str, Any]:
        """
        Process a details element.
        
        Args:
            element: The details element.
            
        Returns:
            A dictionary representation of the details.
        """
        result = {
            "type": "details",
            "content": []
        }
        
        # Extract ID
        if element.has_attr("id"):
            result["id"] = element["id"]
        
        # Extract open state
        if element.has_attr("open"):
            result["open"] = True
        
        # Extract summary
        summary = element.find("summary")
        if summary:
            result["summary"] = summary.get_text().strip()
        
        # Extract content (excluding the summary)
        content = element.get_text().strip()
        
        if summary:
            summary_text = summary.get_text().strip()
            if summary_text in content:
                content = content.replace(summary_text, "", 1).strip()
        
        if content:
            result["content"].append({"type": "text", "text": content})
        
        return result
    
    def _process_nav(self, element: Tag) -> Dict[str, Any]:
        """
        Process a nav element.
        
        Args:
            element: The nav element.
            
        Returns:
            A dictionary representation of the navigation.
        """
        result = {
            "type": "navigation",
            "links": []
        }
        
        # Extract ID
        if element.has_attr("id"):
            result["id"] = element["id"]
        
        # Extract links
        links = []
        for a in element.find_all("a"):
            link = {
                "text": a.get_text().strip(),
                "href": a.get("href", "#")
            }
            
            # Extract title attribute
            if a.has_attr("title"):
                link["title"] = a["title"]
            
            links.append(link)
        
        result["links"] = links
        
        return result
    
    def _process_address(self, element: Tag) -> Dict[str, Any]:
        """
        Process an address element.
        
        Args:
            element: The address element.
            
        Returns:
            A dictionary representation of the address.
        """
        result = {
            "type": "address",
            "text": element.get_text().strip()
        }
        
        # Extract ID
        if element.has_attr("id"):
            result["id"] = element["id"]
        
        # Extract any links (emails, websites)
        links = []
        for a in element.find_all("a"):
            link = {
                "text": a.get_text().strip(),
                "href": a.get("href", "#")
            }
            links.append(link)
        
        if links:
            result["links"] = links
        
        return result
    
    def _process_header_footer(self, element: Tag) -> Dict[str, Any]:
        """
        Process a header or footer element.
        
        Args:
            element: The header or footer element.
            
        Returns:
            A dictionary representation of the header/footer.
        """
        result = {
            "type": element.name,
            "content": []
        }
        
        # Extract ID
        if element.has_attr("id"):
            result["id"] = element["id"]
        
        # Extract content
        content = element.get_text().strip()
        if content:
            result["content"].append({"type": "text", "text": content})
        
        return result
    
    def _process_time(self, element: Tag) -> Dict[str, Any]:
        """
        Process a time element.
        
        Args:
            element: The time element.
            
        Returns:
            A dictionary representation of the time.
        """
        result = {
            "type": "time",
            "text": element.get_text().strip()
        }
        
        # Extract datetime attribute
        if element.has_attr("datetime"):
            result["datetime"] = element["datetime"]
        
        return result
    
    def _process_mark(self, element: Tag) -> Dict[str, Any]:
        """
        Process a mark element.
        
        Args:
            element: The mark element.
            
        Returns:
            A dictionary representation of the marked text.
        """
        return {
            "type": "marked_text",
            "text": element.get_text().strip()
        }
    
    def _process_measurement(self, element: Tag) -> Dict[str, Any]:
        """
        Process a progress or meter element.
        
        Args:
            element: The progress or meter element.
            
        Returns:
            A dictionary representation of the measurement.
        """
        result = {
            "type": element.name,
            "text": element.get_text().strip()
        }
        
        # Extract common attributes
        for attr in ["value", "max", "min"]:
            if element.has_attr(attr):
                result[attr] = element[attr]
        
        # Extract meter-specific attributes
        if element.name == "meter":
            for attr in ["low", "high", "optimum"]:
                if element.has_attr(attr):
                    result[attr] = element[attr]
        
        return result
    
    def _process_dialog(self, element: Tag) -> Dict[str, Any]:
        """
        Process a dialog element.
        
        Args:
            element: The dialog element.
            
        Returns:
            A dictionary representation of the dialog.
        """
        result = {
            "type": "dialog",
            "content": []
        }
        
        # Extract ID
        if element.has_attr("id"):
            result["id"] = element["id"]
        
        # Extract open state
        if element.has_attr("open"):
            result["open"] = True
        
        # Extract content
        content = element.get_text().strip()
        if content:
            result["content"].append({"type": "text", "text": content})
        
        return result
    
    def _process_search(self, element: Tag) -> Dict[str, Any]:
        """
        Process a search element.
        
        Args:
            element: The search element.
            
        Returns:
            A dictionary representation of the search.
        """
        result = {
            "type": "search",
            "content": []
        }
        
        # Extract ID
        if element.has_attr("id"):
            result["id"] = element["id"]
        
        # Check for search input
        search_input = element.find("input", {"type": "search"})
        if search_input:
            input_data = {
                "type": "search_input"
            }
            
            # Extract input attributes
            for attr in ["name", "placeholder", "value"]:
                if search_input.has_attr(attr):
                    input_data[attr] = search_input[attr]
            
            result["input"] = input_data
        
        # Check for search button
        search_button = element.find("button")
        if search_button:
            result["button_text"] = search_button.get_text().strip()
        
        return result
    
    def _process_output(self, element: Tag) -> Dict[str, Any]:
        """
        Process an output element.
        
        Args:
            element: The output element.
            
        Returns:
            A dictionary representation of the output.
        """
        result = {
            "type": "output",
            "text": element.get_text().strip()
        }
        
        # Extract attributes
        for attr in ["for", "form", "name"]:
            if element.has_attr(attr):
                # Convert list attribute to array
                if attr == "for" and " " in element[attr]:
                    result[attr] = element[attr].split()
                else:
                    result[attr] = element[attr]
        
        return result
    
    def _process_generic_semantic(self, element: Tag) -> Dict[str, Any]:
        """
        Process a generic semantic element.
        
        Args:
            element: The semantic element.
            
        Returns:
            A dictionary representation of the element.
        """
        result = {
            "type": element.name,
            "content": []
        }
        
        # Extract ID
        if element.has_attr("id"):
            result["id"] = element["id"]
        
        # Extract attributes (excluding standard ones)
        attrs = {}
        for attr, value in element.attrs.items():
            if attr not in ["id", "class", "style"]:
                attrs[attr] = value
        
        if attrs:
            result["attributes"] = attrs
        
        # Extract text content
        content = element.get_text().strip()
        if content:
            result["content"].append({"type": "text", "text": content})
        
        return result
