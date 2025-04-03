"""
Base extractor module for web2json.

This module provides common utility functions for content extraction.
"""
import logging
import re
from typing import Union, Set, Optional, List

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

# Tags to exclude from content extraction
EXCLUDE_TAGS = {
    "script", "style", "noscript", "iframe", "svg", "canvas", 
    "button", "input", "select", "option", "form", "meta", "link"
}

# Minimum length for text to be considered substantial
MIN_TEXT_LENGTH = 10


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
    
    # Remove exclude tags that shouldn't be part of content
    for exclude_tag in EXCLUDE_TAGS:
        for tag in soup.find_all(exclude_tag):
            tag.decompose()
    
    if not preserve_styles:
        # If not preserving styles, unwrap all tags
        for tag in soup.find_all(True):
            # Always preserve line breaks
            if tag.name == 'br':
                tag.replace_with('\n')
            else:
                tag.unwrap()
    else:
        # If preserving styles, only unwrap non-style tags
        for tag in soup.find_all(True):
            if tag.name == 'br':
                tag.replace_with('\n')
            elif tag.name not in STYLE_TAGS:
                tag.unwrap()
    
    # Get text and normalize whitespace
    if preserve_styles:
        # For style preservation, get the HTML string
        text = str(soup)
    else:
        # For no style preservation, get just the text
        text = soup.get_text()
    
    # Normalize whitespace but preserve meaningful newlines
    lines = [line.strip() for line in text.splitlines()]
    text = ' '.join([line for line in lines if line])
    
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    
    return text.strip()


def is_nested_element(element: Tag, container_tags: Optional[Set[str]] = None) -> bool:
    """Check if an element is nested inside another structural element.
    
    Args:
        element: Element to check
        container_tags: Set of tag names to consider as containers (defaults to STRUCTURAL_TAGS)
        
    Returns:
        True if the element is nested, False otherwise
    """
    if container_tags is None:
        container_tags = STRUCTURAL_TAGS
        
    parent = element.parent
    while parent and parent.name != "body" and parent.name != "html":
        if parent.name in container_tags:
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


def is_substantial_text(text: str, min_length: int = MIN_TEXT_LENGTH) -> bool:
    """Check if text contains substantial content.
    
    Args:
        text: Text to check
        min_length: Minimum required length to be considered substantial
        
    Returns:
        True if the text is substantial, False otherwise
    """
    if not text:
        return False
        
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Check length
    if len(text) < min_length:
        return False
        
    # Check if text contains actual words
    words = text.split()
    if len(words) < 2:
        return False
        
    return True


def get_text_density(element: Tag) -> float:
    """Calculate text density for an element.
    
    Text density is the ratio of text length to number of tags.
    Higher density indicates more textual content vs. markup.
    
    Args:
        element: Element to calculate density for
        
    Returns:
        Text density score
    """
    # Remove script, style elements
    for exclude_tag in EXCLUDE_TAGS:
        for tag in element.find_all(exclude_tag):
            tag.decompose()
    
    # Get text length
    text_length = len(element.get_text(strip=True))
    
    # Count tags
    tag_count = len(element.find_all(True))
    
    # Avoid division by zero
    if tag_count == 0:
        return 0
        
    return text_length / tag_count


def find_elements_by_class_pattern(soup: BeautifulSoup, pattern: str) -> List[Tag]:
    """Find elements with class names matching a pattern.
    
    Args:
        soup: BeautifulSoup object to search in
        pattern: Regex pattern to match against class names
        
    Returns:
        List of matching elements
    """
    matches = []
    compiled_pattern = re.compile(pattern, re.IGNORECASE)
    
    for element in soup.find_all(class_=True):
        # Handle both list and string class attributes
        classes = element['class'] if isinstance(element['class'], list) else [element['class']]
        class_string = ' '.join(classes)
        
        if compiled_pattern.search(class_string):
            matches.append(element)
    
    return matches


def find_content_containers(soup: BeautifulSoup) -> List[Tag]:
    """Find elements that are likely to contain main content.
    
    This uses a combination of semantic tags and class name patterns.
    
    Args:
        soup: BeautifulSoup object to search in
        
    Returns:
        List of potential content containers
    """
    containers = []
    
    # Look for semantic elements
    for tag in ['article', 'main', 'section']:
        containers.extend(soup.find_all(tag))
    
    # Look for content classes
    content_patterns = [
        r'(^|\s)(content|main|article|body|text)(\s|$)',
        r'(^|\s)(entry|post|story|blog)(\s|$)',
        r'(^|\s)(markdown|prose)(\s|$)',
        # Common framework patterns
        r'(^|\s)(sl-markdown-content|docusaurus|md-content|hugo-content)(\s|$)',
        r'(^|\s)(container|card-body|page-content|article-content)(\s|$)'
    ]
    
    for pattern in content_patterns:
        containers.extend(find_elements_by_class_pattern(soup, pattern))
    
    # Look for common ID patterns
    id_patterns = [
        r'(^|\s)(content|main|article|post|entry)(\s|$)'
    ]
    
    for pattern in id_patterns:
        for element in soup.find_all(id=True):
            if re.search(pattern, element.get('id', ''), re.IGNORECASE):
                containers.append(element)
    
    # Remove duplicates while preserving order
    seen = set()
    unique_containers = []
    
    for container in containers:
        container_id = id(container)
        if container_id not in seen:
            seen.add(container_id)
            unique_containers.append(container)
    
    return unique_containers


def extract_meaningful_content(element: Tag, preserve_styles: bool = False) -> str:
    """Extract meaningful content from an element, preserving structure.
    
    This function goes beyond simple text extraction to maintain formatting.
    
    Args:
        element: Element to extract content from
        preserve_styles: Whether to preserve HTML style tags
        
    Returns:
        Formatted text with preserved structure
    """
    # Handle headings
    if element.name in ["h1", "h2", "h3", "h4", "h5", "h6"]:
        text = get_element_text(element, preserve_styles)
        level = int(element.name[1])
        # Add markup based on heading level
        if preserve_styles:
            return text
        else:
            prefix = "#" * level
            return f"{prefix} {text}"
    
    # Handle paragraphs
    elif element.name == "p":
        return get_element_text(element, preserve_styles)
    
    # Handle lists
    elif element.name in ["ul", "ol"]:
        lines = []
        for i, li in enumerate(element.find_all("li", recursive=False)):
            marker = f"{i+1}." if element.name == "ol" else "•"
            item_text = get_element_text(li, preserve_styles)
            lines.append(f"{marker} {item_text}")
        return "\n".join(lines)
    
    # Handle blockquotes
    elif element.name == "blockquote":
        text = get_element_text(element, preserve_styles)
        if preserve_styles:
            return text
        else:
            lines = text.split("\n")
            return "\n".join([f"> {line}" for line in lines])
    
    # Handle code blocks
    elif element.name == "pre" or (element.name == "div" and element.find("pre")):
        code_elem = element.find("pre") or element
        text = code_elem.get_text(strip=False)
        
        # Try to detect language from class
        language = None
        if code_elem.has_attr("class"):
            for cls in code_elem.get("class", []):
                if cls.startswith(("language-", "lang-")):
                    language = cls.split("-")[1]
                    break
        
        if preserve_styles:
            return text
        else:
            if language:
                return f"```{language}\n{text}\n```"
            else:
                return f"```\n{text}\n```"
    
    # Default fallback
    return get_element_text(element, preserve_styles)
