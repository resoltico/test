"""
Code block extractor module for web2json.

This module provides functionality for extracting and formatting code blocks
with proper preservation of line breaks and separation of captions.
"""
import logging
from typing import Dict, Any, Optional
import re

from bs4 import BeautifulSoup, Tag, NavigableString

from web2json.models.content import ContentItem
from web2json.utils.errors import ExtractError

# Tags that indicate a code block
CODE_TAGS = {'pre', 'code'}

# Tags that indicate a code block caption or title
CAPTION_TAGS = {'figcaption'}

# Define a pattern to detect terminal window headers or titles
TERMINAL_WINDOW_PATTERN = re.compile(r'terminal(\s+window)?', re.IGNORECASE)


def extract_code_block(element: Tag, preserve_styles: bool = False) -> ContentItem:
    """Extract a code block with proper formatting and caption handling.
    
    Args:
        element: HTML element containing a code block
        preserve_styles: Whether to preserve HTML style tags
        
    Returns:
        CodeContent object representing the code block
        
    Raises:
        ExtractError: If extraction fails
    """
    logger = logging.getLogger(__name__)
    
    try:
        # Initialize content structure
        content_data = {
            "type": "code_block",
            "language": None,
            "caption": None,
            "text": "",
        }
        
        # Find the actual code element
        code_element = element
        if element.name != "pre" and element.name != "code":
            # If we received a container, find the code element within it
            pre_element = element.find("pre")
            if pre_element:
                code_element = pre_element
        
        # Extract caption if present
        caption = _extract_code_caption(element)
        if caption:
            content_data["caption"] = caption
        
        # Extract language information
        language = _detect_code_language(code_element)
        if language:
            content_data["language"] = language
        
        # Extract formatted code content
        content_data["text"] = _extract_formatted_code(code_element)
        
        # Convert to ContentItem
        from web2json.models.content import ContentItem
        # Note: In a real implementation, we would create a proper CodeContent model
        # For now, we'll return a dict that matches the expected structure
        return content_data
        
    except Exception as e:
        logger.error(f"Error extracting code block: {str(e)}")
        # Fallback to simpler extraction
        return {
            "type": "code_block",
            "text": element.get_text(strip=True),
            "language": None,
            "caption": None
        }


def _extract_code_caption(element: Tag) -> Optional[str]:
    """Extract caption from a code block container.
    
    Args:
        element: HTML element that might contain a code caption
        
    Returns:
        Caption text if found, otherwise None
    """
    # Check for figcaption element
    figcaption = element.find('figcaption')
    if figcaption:
        return figcaption.get_text(strip=True)
    
    # Check for caption-like elements
    caption = element.find(['div', 'span'], class_=lambda c: c and 
                          ('caption' in c.lower() or 'title' in c.lower()))
    if caption:
        return caption.get_text(strip=True)
    
    # Check for sr-only (screen reader) elements that might contain captions
    sr_element = element.find(attrs={'class': lambda c: c and 'sr-only' in c})
    if sr_element:
        text = sr_element.get_text(strip=True)
        # Check if it looks like a terminal window description
        if TERMINAL_WINDOW_PATTERN.search(text):
            return text
    
    # Look for title attribute
    if element.has_attr('title'):
        return element['title']
    
    return None


def _detect_code_language(element: Tag) -> Optional[str]:
    """Attempt to detect the programming language of a code block.
    
    Args:
        element: HTML element containing code
        
    Returns:
        Detected language if found, otherwise None
    """
    # Check for language class (common in many syntax highlighters)
    if element.has_attr('class'):
        classes = element['class']
        for class_name in classes:
            # Common patterns for language classes
            if class_name.startswith(('language-', 'lang-')):
                return class_name.split('-', 1)[1]
    
    # Check for data-language attribute (used by some syntax highlighters)
    if element.has_attr('data-language'):
        return element['data-language']
        
    # Check parent for language indicators
    parent = element.parent
    if parent and parent.has_attr('class'):
        parent_classes = parent['class']
        for class_name in parent_classes:
            if class_name.startswith(('language-', 'lang-')):
                return class_name.split('-', 1)[1]
    
    return None


def _extract_formatted_code(element: Tag) -> str:
    """Extract code content with preserved formatting.
    
    Args:
        element: HTML element containing code
        
    Returns:
        Formatted code content with line breaks preserved
    """
    # Find code tag if we're in a pre tag
    code_tag = element.find('code') if element.name == 'pre' else element
    
    # If no code tag found, use the current element
    if not code_tag:
        code_tag = element
    
    # Get the initial text content
    content = code_tag.get_text()
    
    # Normalize line breaks
    content = re.sub(r'\r\n|\r', '\n', content)
    
    # Remove common leading whitespace (dedent)
    lines = content.split('\n')
    if lines:
        # Find common leading whitespace
        common_indent = None
        for line in lines:
            if not line.strip():  # Skip empty lines
                continue
            indent = len(line) - len(line.lstrip())
            if common_indent is None or indent < common_indent:
                common_indent = indent
        
        # Remove common leading whitespace
        if common_indent and common_indent > 0:
            formatted_lines = []
            for line in lines:
                if line.strip():  # Only process non-empty lines
                    formatted_lines.append(line[min(common_indent, len(line) - len(line.lstrip())):])
                else:
                    formatted_lines.append(line)
            content = '\n'.join(formatted_lines)
    
    # Trim leading/trailing blank lines
    content = content.strip('\n')
    
    return content
