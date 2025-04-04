"""
Processor for semantic HTML5 elements.
"""

from typing import Dict, List, Optional, TypeAlias

import structlog
from bs4 import BeautifulSoup, Tag

from web2json.models.document import Document
from web2json.models.section import Section
from web2json.processors.base import ElementProcessor


logger = structlog.get_logger(__name__)

# Type alias for content items
ContentItem: TypeAlias = Dict[str, object]


class SemanticProcessor(ElementProcessor):
    """
    Processor for semantic HTML5 elements.
    
    Handles elements like article, aside, nav, details, etc. that provide
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
            elements = soup.find_all(element_type)
            
            if not elements:
                continue
                
            logger.debug(f"Found {element_type} elements", count=len(elements))
            
            for element in elements:
                # Process the element
                processed = self._process_element(element)
                
                if processed:
                    # Find the appropriate section to add this element to
                    section = self._find_parent_section(document, element)
                    
                    if section:
                        # Add the element to the section's content
                        section.add_content(processed)
                        logger.debug(
                            f"Added {element_type} to section", 
                            section=section.title, 
                            element_id=element.get("id", "")
                        )
        
        return document
    
    def _process_element(self, element: Tag) -> Optional[ContentItem]:
        """
        Process a semantic element.
        
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
        elif element_type in ["details", "summary"]:
            return self._process_details(element)
        elif element_type == "nav":
            return self._process_nav(element)
        elif element_type == "address":
            return self._process_address(element)
        elif element_type in ["header", "footer"]:
            return self._process_header_footer(element)
        elif element_type == "time":
            return self._process_time(element)
        elif element_type in ["progress", "meter"]:
            return self._process_measurement(element)
        elif element_type == "dialog":
            return self._process_dialog(element)
        elif element_type == "search":
            return self._process_search(element)
        elif element_type == "mark":
            return self._process_mark(element)
        elif element_type == "output":
            return self._process_output(element)
        else:
            # Generic handler for other semantic elements
            return self._process_generic_semantic(element)
    
    def _process_article(self, element: Tag) -> ContentItem:
        """
        Process an article element.
        
        Args:
            element: The article element.
            
        Returns:
            A dictionary representation of the article.
        """
        result: ContentItem = {
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
        text_content = element.get_text().strip()
        if text_content:
            # If there's a heading, remove its text from the content
            if heading:
                text_content = text_content.replace(heading.get_text().strip(), "", 1).strip()
            
            if text_content:
                result["content"].append({"type": "text", "text": text_content})
        
        return result
    
    def _process_aside(self, element: Tag) -> ContentItem:
        """
        Process an aside element.
        
        Args:
            element: The aside element.
            
        Returns:
            A dictionary representation of the aside.
        """
        result: ContentItem = {
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
        text_content = element.get_text().strip()
        if text_content:
            # If there's a heading, remove its text from the content
            if heading:
                text_content = text_content.replace(heading.get_text().strip(), "", 1).strip()
            
            if text_content:
                result["content"].append({"type": "text", "text": text_content})
        
        return result
    
    def _process_details(self, element: Tag) -> Optional[ContentItem]:
        """
        Process a details/summary element.
        
        Args:
            element: The details or summary element.
            
        Returns:
            A dictionary representation of the details, or None if it's a summary (handled with details).
        """
        # If this is a summary element that's inside a details element,
        # we'll process it as part of the details element
        if element.name == "summary" and element.find_parent("details"):
            return None
        
        # Only process details elements
        if element.name != "details":
            return None
        
        result: ContentItem = {
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
        content_text = element.get_text().strip()
        if summary:
            # Remove the summary text from the content
            content_text = content_text.replace(summary.get_text().strip(), "", 1).strip()
        
        if content_text:
            result["content"].append({"type": "text", "text": content_text})
        
        return result
    
    def _process_nav(self, element: Tag) -> ContentItem:
        """
        Process a nav element.
        
        Args:
            element: The nav element.
            
        Returns:
            A dictionary representation of the navigation.
        """
        result: ContentItem = {
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
    
    def _process_address(self, element: Tag) -> ContentItem:
        """
        Process an address element.
        
        Args:
            element: The address element.
            
        Returns:
            A dictionary representation of the address.
        """
        result: ContentItem = {
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
    
    def _process_header_footer(self, element: Tag) -> ContentItem:
        """
        Process a header or footer element.
        
        Args:
            element: The header or footer element.
            
        Returns:
            A dictionary representation of the header/footer.
        """
        result: ContentItem = {
            "type": element.name,
            "content": []
        }
        
        # Extract ID
        if element.has_attr("id"):
            result["id"] = element["id"]
        
        # Extract content
        text_content = element.get_text().strip()
        if text_content:
            result["content"].append({"type": "text", "text": text_content})
        
        return result
    
    def _process_time(self, element: Tag) -> ContentItem:
        """
        Process a time element.
        
        Args:
            element: The time element.
            
        Returns:
            A dictionary representation of the time.
        """
        result: ContentItem = {
            "type": "time",
            "text": element.get_text().strip()
        }
        
        # Extract datetime attribute
        if element.has_attr("datetime"):
            result["datetime"] = element["datetime"]
        
        return result
    
    def _process_measurement(self, element: Tag) -> ContentItem:
        """
        Process a progress or meter element.
        
        Args:
            element: The progress or meter element.
            
        Returns:
            A dictionary representation of the measurement.
        """
        result: ContentItem = {
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
    
    def _process_dialog(self, element: Tag) -> ContentItem:
        """
        Process a dialog element.
        
        Args:
            element: The dialog element.
            
        Returns:
            A dictionary representation of the dialog.
        """
        result: ContentItem = {
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
        text_content = element.get_text().strip()
        if text_content:
            result["content"].append({"type": "text", "text": text_content})
        
        return result
    
    def _process_search(self, element: Tag) -> ContentItem:
        """
        Process a search element.
        
        Args:
            element: The search element.
            
        Returns:
            A dictionary representation of the search.
        """
        result: ContentItem = {
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
    
    def _process_mark(self, element: Tag) -> ContentItem:
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
    
    def _process_output(self, element: Tag) -> ContentItem:
        """
        Process an output element.
        
        Args:
            element: The output element.
            
        Returns:
            A dictionary representation of the output.
        """
        result: ContentItem = {
            "type": "output",
            "text": element.get_text().strip()
        }
        
        # Extract attributes
        for attr in ["for", "form", "name"]:
            if element.has_attr(attr):
                result[attr] = element[attr]
        
        return result
    
    def _process_generic_semantic(self, element: Tag) -> ContentItem:
        """
        Process a generic semantic element.
        
        Args:
            element: The semantic element.
            
        Returns:
            A dictionary representation of the element.
        """
        result: ContentItem = {
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
        text_content = element.get_text().strip()
        if text_content:
            result["text"] = text_content
        
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
