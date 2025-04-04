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
        "header", "footer", "search", "address", "blockquote",
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
        
        # Process semantic elements in each section
        self._process_sections(document.content)
        
        return document
    
    def _process_sections(self, sections: List) -> None:
        """
        Process all sections recursively.
        
        Args:
            sections: List of sections to process.
        """
        for section in sections:
            # Process semantic elements in this section
            self._process_section_semantics(section)
            
            # Process child sections recursively
            if section.children:
                self._process_sections(section.children)
    
    def _process_section_semantics(self, section) -> None:
        """
        Process semantic elements for a single section.
        
        Args:
            section: The section to process.
        """
        # Process each type of semantic element
        for element in section.raw_content_elements:
            if element.name in self.SEMANTIC_ELEMENTS:
                # Skip if inside other semantic elements
                if self._is_nested_semantic(element):
                    continue
                    
                # Process the element based on its type
                content_obj = self._process_element(element)
                
                if content_obj:
                    section.add_content(content_obj)
                    
                    logger.debug(
                        f"Added {element.name} to section", 
                        section_title=section.title,
                        element_id=element.get("id", "")
                    )
    
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
        elif element_type == "nav":
            return self._process_nav(element)
        elif element_type == "header" or element_type == "footer":
            return self._process_generic_semantic(element)
        elif element_type == "blockquote":
            return self._process_blockquote(element)
        elif element_type == "address":
            return self._process_address(element)
        elif element_type == "time":
            return self._process_time(element)
        elif element_type == "mark":
            return self._process_mark(element)
        elif element_type in ["progress", "meter"]:
            return self._process_measurement(element)
        elif element_type == "search":
            return self._process_search(element)
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
        
        # Extract article ID
        if element.has_attr("id"):
            result["id"] = element["id"]
        
        # Extract heading if present
        heading = element.find(["h1", "h2", "h3", "h4", "h5", "h6"])
        if heading:
            result["title"] = heading.get_text().strip()
        
        # Extract text content
        text = element.get_text().strip()
        
        # Remove heading text if present
        if heading:
            heading_text = heading.get_text().strip()
            if heading_text in text:
                text = text.replace(heading_text, "", 1).strip()
        
        if text:
            result["content"].append({"type": "text", "text": text})
        
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
        
        # Extract aside ID
        if element.has_attr("id"):
            result["id"] = element["id"]
        
        # Extract heading if present
        heading = element.find(["h1", "h2", "h3", "h4", "h5", "h6"])
        if heading:
            result["title"] = heading.get_text().strip()
        
        # Extract text content
        text = element.get_text().strip()
        
        # Remove heading text if present
        if heading:
            heading_text = heading.get_text().strip()
            if heading_text in text:
                text = text.replace(heading_text, "", 1).strip()
        
        if text:
            result["content"].append({"type": "text", "text": text})
        
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
        
        # Extract element ID
        if element.has_attr("id"):
            result["id"] = element["id"]
        
        # Extract open state
        if element.has_attr("open"):
            result["open"] = True
        
        # Extract summary
        summary = element.find("summary")
        if summary:
            result["summary"] = summary.get_text().strip()
        
        # Extract content
        text = element.get_text().strip()
        
        # Remove summary text if present
        if summary:
            summary_text = summary.get_text().strip()
            if summary_text in text:
                text = text.replace(summary_text, "", 1).strip()
        
        if text:
            result["content"].append({"type": "text", "text": text})
        
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
        
        # Extract element ID
        if element.has_attr("id"):
            result["id"] = element["id"]
        
        # Extract links
        for a in element.find_all("a"):
            if a.has_attr("href"):
                link = {
                    "text": a.get_text().strip(),
                    "href": a["href"]
                }
                
                if a.has_attr("title"):
                    link["title"] = a["title"]
                
                result["links"].append(link)
        
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
        
        # Extract element ID
        if element.has_attr("id"):
            result["id"] = element["id"]
        
        # Extract any links (emails, websites)
        links = []
        for a in element.find_all("a"):
            if a.has_attr("href"):
                link = {
                    "text": a.get_text().strip(),
                    "href": a["href"]
                }
                links.append(link)
        
        if links:
            result["links"] = links
        
        return result
    
    def _process_blockquote(self, element: Tag) -> Dict[str, Any]:
        """
        Process a blockquote element.
        
        Args:
            element: The blockquote element.
            
        Returns:
            A dictionary representation of the blockquote.
        """
        result = {
            "type": "quote",
            "content": element.get_text().strip()
        }
        
        # Extract citation URL
        if element.has_attr("cite"):
            result["cite"] = element["cite"]
        
        # Look for citation in footer or cite element
        cite_element = element.find("cite")
        if cite_element:
            result["source"] = cite_element.get_text().strip()
        else:
            footer = element.find("footer")
            if footer:
                result["source"] = footer.get_text().strip()
        
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
            "content": element.get_text().strip()
        }
        
        # Check for search input
        search_input = element.find("input", {"type": "search"})
        if search_input:
            if search_input.has_attr("placeholder"):
                result["placeholder"] = search_input["placeholder"]
        
        # Check for search button
        search_button = element.find("button")
        if search_button:
            result["button"] = search_button.get_text().strip()
        
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
        
        # Extract element ID
        if element.has_attr("id"):
            result["id"] = element["id"]
        
        # Extract text content
        text = element.get_text().strip()
        if text:
            result["content"].append({"type": "text", "text": text})
        
        return result
