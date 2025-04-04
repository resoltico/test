"""
Processor for semantic HTML5 elements.
"""

from typing import Dict, List, Optional, Any, Union, cast

import structlog
from bs4 import BeautifulSoup, Tag

from web2json.models.document import Document
from web2json.models.section import Section
from web2json.processors.base import ElementProcessor, ContentItem


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
        self.process_sections(document.content)
        
        return document
    
    def process_section_content(self, section: Section) -> None:
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
    
    def _process_element(self, element: Tag) -> Optional[ContentItem]:
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
    
    def _process_article(self, element: Tag) -> ContentItem:
        """
        Process an article element.
        
        Args:
            element: The article element.
            
        Returns:
            A dictionary representation of the article.
        """
        # Extract heading if present
        heading = element.find(["h1", "h2", "h3", "h4", "h5", "h6"])
        title = heading.get_text().strip() if heading else None
        
        # Extract text content
        content = []
        
        # Extract paragraphs
        for p in element.find_all("p", recursive=False):
            content.append({"type": "paragraph", "text": self.extract_text_content(p)})
        
        # If no paragraphs found, use the whole text
        if not content:
            text = self.extract_text_content(element, preserve_formatting=True)
            
            # Remove heading text if present
            if heading and title:
                text = text.replace(title, "", 1).strip()
                
            if text:
                content.append({"type": "text", "text": text})
        
        # Return article content object
        result = self.create_content_object(
            element_type="article",
            content={"content": content},
            element_id=element.get("id")
        )
        
        if title:
            result["title"] = title
        
        return result
    
    def _process_aside(self, element: Tag) -> ContentItem:
        """
        Process an aside element.
        
        Args:
            element: The aside element.
            
        Returns:
            A dictionary representation of the aside.
        """
        # Extract heading if present
        heading = element.find(["h1", "h2", "h3", "h4", "h5", "h6"])
        title = heading.get_text().strip() if heading else None
        
        # Extract text content
        content = []
        
        # Extract paragraphs
        for p in element.find_all("p", recursive=False):
            content.append({"type": "paragraph", "text": self.extract_text_content(p)})
        
        # If no paragraphs found, use the whole text
        if not content:
            text = self.extract_text_content(element, preserve_formatting=True)
            
            # Remove heading text if present
            if heading and title:
                text = text.replace(title, "", 1).strip()
                
            if text:
                content.append({"type": "text", "text": text})
        
        # Return aside content object
        result = self.create_content_object(
            element_type="aside",
            content={"content": content},
            element_id=element.get("id")
        )
        
        if title:
            result["title"] = title
        
        return result
    
    def _process_details(self, element: Tag) -> ContentItem:
        """
        Process a details element.
        
        Args:
            element: The details element.
            
        Returns:
            A dictionary representation of the details.
        """
        # Extract summary
        summary_elem = element.find("summary")
        summary = summary_elem.get_text().strip() if summary_elem else None
        
        # Extract content
        content = []
        
        # Extract all content after the summary
        if summary_elem:
            # Get all content after the summary
            next_elem = summary_elem.next_sibling
            while next_elem:
                if hasattr(next_elem, "name") and next_elem.name:
                    if next_elem.name == "p":
                        content.append({"type": "paragraph", "text": self.extract_text_content(next_elem)})
                    else:
                        text = self.extract_text_content(next_elem)
                        if text:
                            content.append({"type": "text", "text": text})
                next_elem = next_elem.next_sibling
        
        # If no content found, use the whole text minus summary
        if not content:
            text = self.extract_text_content(element, preserve_formatting=True)
            
            # Remove summary text if present
            if summary_elem and summary:
                text = text.replace(summary, "", 1).strip()
                
            if text:
                content.append({"type": "text", "text": text})
        
        # Return details content object
        result = self.create_content_object(
            element_type="details",
            content={"content": content},
            element_id=element.get("id")
        )
        
        if summary:
            result["summary"] = summary
        
        if element.has_attr("open"):
            result["open"] = True
        
        return result
    
    def _process_nav(self, element: Tag) -> ContentItem:
        """
        Process a nav element.
        
        Args:
            element: The nav element.
            
        Returns:
            A dictionary representation of the navigation.
        """
        links = []
        
        # Extract links
        for a in element.find_all("a"):
            if a.has_attr("href"):
                link = {
                    "text": a.get_text().strip(),
                    "href": a["href"]
                }
                
                if a.has_attr("title"):
                    link["title"] = a["title"]
                
                links.append(link)
        
        # Return navigation content object
        return self.create_content_object(
            element_type="navigation",
            content={"links": links},
            element_id=element.get("id")
        )
    
    def _process_blockquote(self, element: Tag) -> ContentItem:
        """
        Process a blockquote element.
        
        Args:
            element: The blockquote element.
            
        Returns:
            A dictionary representation of the blockquote.
        """
        # Extract the main content
        content = self.extract_text_content(element, preserve_formatting=True)
        
        # Create a result object
        result = self.create_content_object(
            element_type="quote",
            content=content,
            element_id=element.get("id")
        )
        
        # Extract citation URL
        if element.has_attr("cite"):
            result["cite"] = element["cite"]
        
        # Look for source in footer or cite element
        footer = element.find("footer")
        if footer:
            result["source"] = self.extract_text_content(footer)
        else:
            cite = element.find("cite")
            if cite:
                result["source"] = self.extract_text_content(cite)
        
        return result
    
    def _process_address(self, element: Tag) -> ContentItem:
        """
        Process an address element.
        
        Args:
            element: The address element.
            
        Returns:
            A dictionary representation of the address.
        """
        # Extract text content
        text = self.extract_text_content(element, preserve_formatting=True)
        
        # Create result object
        result = self.create_content_object(
            element_type="address",
            content=text,
            element_id=element.get("id")
        )
        
        # Extract links
        links = []
        for a in element.find_all("a"):
            if a.has_attr("href"):
                link = {
                    "text": a.get_text().strip(),
                    "href": a["href"]
                }
                
                if a.has_attr("title"):
                    link["title"] = a["title"]
                
                links.append(link)
        
        if links:
            result["links"] = links
        
        return result
    
    def _process_time(self, element: Tag) -> ContentItem:
        """
        Process a time element.
        
        Args:
            element: The time element.
            
        Returns:
            A dictionary representation of the time.
        """
        # Extract text content
        text = self.extract_text_content(element)
        
        # Create result object
        result = self.create_content_object(
            element_type="time",
            content=text,
            element_id=element.get("id")
        )
        
        # Add datetime attribute if present
        if element.has_attr("datetime"):
            result["datetime"] = element["datetime"]
        
        return result
    
    def _process_mark(self, element: Tag) -> ContentItem:
        """
        Process a mark element.
        
        Args:
            element: The mark element.
            
        Returns:
            A dictionary representation of the marked text.
        """
        # Extract text content
        text = self.extract_text_content(element)
        
        # Create result object
        return self.create_content_object(
            element_type="marked_text",
            content=text,
            element_id=element.get("id")
        )
    
    def _process_measurement(self, element: Tag) -> ContentItem:
        """
        Process a progress or meter element.
        
        Args:
            element: The progress or meter element.
            
        Returns:
            A dictionary representation of the measurement.
        """
        # Extract text content
        text = self.extract_text_content(element)
        
        # Create result object
        result = self.create_content_object(
            element_type=element.name,
            content=text,
            element_id=element.get("id")
        )
        
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
    
    def _process_search(self, element: Tag) -> ContentItem:
        """
        Process a search element.
        
        Args:
            element: The search element.
            
        Returns:
            A dictionary representation of the search.
        """
        # Extract text content
        content = self.extract_text_content(element)
        
        # Create result object
        result = self.create_content_object(
            element_type="search",
            content=content,
            element_id=element.get("id")
        )
        
        # Find search input
        search_input = element.find("input", {"type": "search"})
        if search_input:
            if search_input.has_attr("placeholder"):
                result["placeholder"] = search_input["placeholder"]
        
        # Find search button
        button = element.find("button")
        if button:
            result["button"] = button.get_text().strip()
        
        return result
    
    def _process_generic_semantic(self, element: Tag) -> ContentItem:
        """
        Process a generic semantic element.
        
        Args:
            element: The semantic element.
            
        Returns:
            A dictionary representation of the element.
        """
        # Extract text content
        text = self.extract_text_content(element, preserve_formatting=True)
        
        # Create result object
        return self.create_content_object(
            element_type=element.name,
            content=text,
            element_id=element.get("id")
        )
