"""
Base extractor module for web2json.

This module provides common utility functions for content extraction.
"""
import logging
from typing import Union

from bs4 import BeautifulSoup, Tag, NavigableString

# Define which HTML tags are considered style tags
STYLE_TAGS = {
    "b", "strong", "i", "em", "sup", "sub", "u", "mark",
    "small", "s", "del", "ins", "abbr", "cite", "q", "dfn",
    "time", "code", "var", "samp", "kbd", "span"
}

# Define which HTML tags are considered structural elements
STRUCTURAL_TAGS = {
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "blockquote", "ul", "ol", "dl",
    "table", "header", "footer", "main", "article", "section", "aside"
}


def get_element_text(element: Union[Tag, str], preserve_styles: bool = False) -> str:
    """Extract text from HTML element with style preservation.
    
    Args:
        element: HTML element to extract text from
        preserve_styles: Whether to preserve HTML style tags
        
    Returns:
        Extracted text
    """
    # If the element is already a string, return it
    if isinstance(element, str):
        return element
    
    # Create a copy of the element to avoid modifying the original
    soup = BeautifulSoup(str(element), 'html.parser')
    
    # Always unwrap spans, regardless of preserve_styles
    for span in soup.find_all('span'):
        span.unwrap()
    
    if not preserve_styles:
        # If not preserving styles, unwrap all tags
        for tag in soup.find_all(True):
            tag.unwrap()
    else:
        # If preserving styles, only unwrap non-style tags
        for tag in soup.find_all(True):
            if tag.name not in STYLE_TAGS:
                tag.unwrap()
    
    # Get text and normalize whitespace
    return ' '.join(str(soup).split())


def is_nested_element(element: Tag) -> bool:
    """Check if an element is nested inside another structural element.
    
    Args:
        element: Element to check
        
    Returns:
        True if the element is nested, False otherwise
    """
    parent = element.parent
    while parent and parent.name != "body" and parent.name != "html":
        if parent.name in STRUCTURAL_TAGS:
            return True
        parent = parent.parent
    return False


def get_element_position(element: Tag) -> int:
    """Get the approximate position of an element in the document.
    
    This helps with sorting elements by their appearance order.
    
    Args:
        element: Element to get position for
        
    Returns:
        Position index (higher means later in the document)
    """
    position = 0
    for sibling in element.previous_siblings:
        position += 1
    
    # Add parent positions to create a more accurate ordering
    parent = element.parent
    parent_factor = 1000  # Weight for parent positions
    while parent and parent.name != "html":
        parent_position = 0
        for parent_sibling in parent.previous_siblings:
            parent_position += 1
        position += parent_position * parent_factor
        parent = parent.parent
        parent_factor *= 10  # Increase weight for higher-level parents
    
    return position
