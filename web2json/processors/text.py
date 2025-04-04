"""
Processor for text content elements.
"""

import re
from typing import Dict, List, Optional, Set, Union

import structlog
from bs4 import BeautifulSoup, NavigableString, Tag

from web2json.models.document import Document
from web2json.models.section import Section
from web2json.processors.base import ElementProcessor


logger = structlog.get_logger(__name__)


class TextProcessor(ElementProcessor):
    """
    Processor for text-based HTML elements.
    
    Handles paragraphs, lists, blockquotes, and other text containers,
    preserving inline formatting and structure.
    """
    
    # Tags that we'll process
    TEXT_TAGS = {
        "p", "blockquote", "pre", "ul", "ol", "dl",
        "code", "q", "cite", "em", "strong", "i", "b", 
        "mark", "small", "del", "ins", "sub", "sup"
    }
    
    # Inline tags that should be preserved in text
    INLINE_TAGS = {
        "a", "abbr", "b", "br", "cite", "code", "data", "dfn", 
        "em", "i", "kbd", "mark", "q", "s", "samp", "small", 
        "span", "strong", "sub", "sup", "time", "u", "var", "wbr"
    }
    
    def process(self, soup: BeautifulSoup, document: Document) -> Document:
        """
        Process text elements in the document.
        
        This processor handles common text elements like paragraphs, lists,
        and blockquotes, preserving their structure and inline formatting.
        
        Args:
            soup: The BeautifulSoup object containing the parsed HTML.
            document: The Document object to enhance with processed elements.
            
        Returns:
            The enhanced Document object.
        """
        logger.info("Processing text elements")
        
        # Find all sections in the document (including nested ones)
        sections = self._find_all_sections(document.content)
        
        # Process text elements in each section
        for section in sections:
            self._process_section_content(soup, section)
        
        return document
    
    def _find_all_sections(self, content: List[Union[Section, Dict]]) -> List[Section]:
        """
        Recursively find all sections in the document.
        
        Args:
            content: The content list to search in.
            
        Returns:
            A list of all Section objects found.
        """
        result: List[Section] = []
        
        for item in content:
            if isinstance(item, Section):
                result.append(item)
                # Recursively find sections in children
                result.extend(self._find_all_sections(item.children))
        
        return result
    
    def _process_section_content(self, soup: BeautifulSoup, section: Section) -> None:
        """
        Process the text content in a section.
        
        Args:
            soup: The BeautifulSoup object.
            section: The section to process.
        """
        # This is a simplified implementation that would need to be expanded
        # in a real application to properly handle all text elements
        
        # Replace simple string content with richer representations
        new_content = []
        for item in section.content:
            if isinstance(item, str):
                # Find elements in the soup that might contain this text
                matches = self._find_elements_with_text(soup, item)
                if matches:
                    for element in matches:
                        processed = self._process_text_element(element)
                        if processed:
                            new_content.append(processed)
                else:
                    # Keep the original text if no match found
                    new_content.append(item)
            else:
                # Non-string items (like tables, forms) are preserved
                new_content.append(item)
        
        # Update the section's content
        section.content = new_content
    
    def _find_elements_with_text(self, soup: BeautifulSoup, text: str) -> List[Tag]:
        """
        Find elements in the soup that might contain this text.
        
        Args:
            soup: The BeautifulSoup object.
            text: The text to search for.
            
        Returns:
            A list of matching elements.
        """
        # This is a simplified approach - in a real application, we would
        # need a more sophisticated matching algorithm
        
        # Clean the text for comparison (remove extra whitespace)
        clean_text = re.sub(r'\s+', ' ', text).strip()
        
        # Try to find elements containing this text
        results = []
        for tag_name in self.TEXT_TAGS:
            for element in soup.find_all(tag_name):
                element_text = re.sub(r'\s+', ' ', element.get_text()).strip()
                if clean_text in element_text:
                    results.append(element)
        
        return results
    
    def _process_text_element(self, element: Tag) -> Optional[Dict]:
        """
        Process a text element into a rich representation.
        
        Args:
            element: The HTML element to process.
            
        Returns:
            A dictionary representation of the element, or None if it
            could not be processed.
        """
        # Handle different types of text elements
        if element.name == "p":
            return self._process_paragraph(element)
        elif element.name in ("ul", "ol"):
            return self._process_list(element)
        elif element.name == "blockquote":
            return self._process_blockquote(element)
        elif element.name == "pre":
            return self._process_preformatted(element)
        elif element.name == "dl":
            return self._process_definition_list(element)
        else:
            # Default handling for other text elements
            return {
                "type": element.name,
                "text": self._extract_text_with_formatting(element)
            }
    
    def _process_paragraph(self, element: Tag) -> Dict:
        """
        Process a paragraph element.
        
        Args:
            element: The paragraph element.
            
        Returns:
            A dictionary representation of the paragraph.
        """
        return {
            "type": "paragraph",
            "text": self._extract_text_with_formatting(element)
        }
    
    def _process_list(self, element: Tag) -> Dict:
        """
        Process a list element (ul or ol).
        
        Args:
            element: The list element.
            
        Returns:
            A dictionary representation of the list.
        """
        list_type = "unordered" if element.name == "ul" else "ordered"
        items = []
        
        for li in element.find_all("li", recursive=False):
            items.append(self._extract_text_with_formatting(li))
        
        return {
            "type": f"{list_type}_list",
            "items": items
        }
    
    def _process_blockquote(self, element: Tag) -> Dict:
        """
        Process a blockquote element.
        
        Args:
            element: The blockquote element.
            
        Returns:
            A dictionary representation of the blockquote.
        """
        # Check for citation
        cite = element.get("cite")
        citation = None
        
        # Look for cite element
        cite_element = element.find("cite")
        if cite_element:
            citation = cite_element.get_text().strip()
            # Remove the cite element to avoid duplicating it in the text
            cite_element.extract()
        
        return {
            "type": "blockquote",
            "text": self._extract_text_with_formatting(element),
            **({"citation": citation} if citation else {}),
            **({"cite_url": cite} if cite else {}),
        }
    
    def _process_preformatted(self, element: Tag) -> Dict:
        """
        Process a preformatted text element.
        
        Args:
            element: The pre element.
            
        Returns:
            A dictionary representation of the preformatted text.
        """
        # Check if this is a code block
        code = element.find("code")
        if code:
            # Try to determine the language
            language = None
            classes = code.get("class", [])
            for cls in classes:
                if cls.startswith("language-"):
                    language = cls[9:]  # Remove "language-" prefix
                    break
            
            return {
                "type": "code_block",
                "code": code.get_text(),
                **({"language": language} if language else {})
            }
        else:
            # Regular preformatted text
            return {
                "type": "preformatted",
                "text": element.get_text()
            }
    
    def _process_definition_list(self, element: Tag) -> Dict:
        """
        Process a definition list element.
        
        Args:
            element: The dl element.
            
        Returns:
            A dictionary representation of the definition list.
        """
        items = []
        current_term = None
        
        for child in element.children:
            if not isinstance(child, Tag):
                continue
                
            if child.name == "dt":
                current_term = self._extract_text_with_formatting(child)
            elif child.name == "dd" and current_term:
                items.append({
                    "term": current_term,
                    "definition": self._extract_text_with_formatting(child)
                })
                current_term = None
        
        return {
            "type": "definition_list",
            "items": items
        }
    
    def _extract_text_with_formatting(self, element: Tag) -> str:
        """
        Extract text from an element, preserving inline formatting.
        
        This is a simplified implementation that would need to be expanded
        in a real application to properly handle all inline elements.
        
        Args:
            element: The HTML element.
            
        Returns:
            The formatted text content.
        """
        # In a real implementation, we would convert the HTML to a
        # format that preserves inline formatting. For simplicity,
        # we'll just return the text here.
        return element.get_text().strip()
