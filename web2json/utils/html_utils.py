"""
Utility functions for working with HTML.
"""

import re
from typing import Optional

from bs4 import BeautifulSoup, Tag


def clean_html_text(text: str) -> str:
    """
    Clean HTML text by removing extra whitespace.
    
    Args:
        text: The HTML text to clean.
        
    Returns:
        The cleaned text.
    """
    # Replace newlines and tabs with spaces
    text = re.sub(r'[\n\t\r]+', ' ', text)
    
    # Replace multiple spaces with a single space
    text = re.sub(r'\s+', ' ', text)
    
    # Trim leading and trailing whitespace
    return text.strip()


def extract_element_text(element: Tag) -> str:
    """
    Extract and clean text from an HTML element.
    
    Args:
        element: The HTML element.
        
    Returns:
        The cleaned text.
    """
    text = element.get_text()
    return clean_html_text(text)


def get_document_title(soup: BeautifulSoup) -> str:
    """
    Extract the document title from a BeautifulSoup object.
    
    Args:
        soup: The BeautifulSoup object.
        
    Returns:
        The document title, or "Untitled Document" if not found.
    """
    # First try the title tag
    title_tag = soup.find("title")
    if title_tag and title_tag.string:
        return clean_html_text(title_tag.string)
    
    # Then try the first h1
    h1_tag = soup.find("h1")
    if h1_tag:
        return extract_element_text(h1_tag)
    
    # Try OpenGraph title
    og_title = soup.find("meta", property="og:title")
    if og_title and og_title.get("content"):
        return og_title["content"].strip()
    
    # Try Twitter title
    twitter_title = soup.find("meta", {"name": "twitter:title"})
    if twitter_title and twitter_title.get("content"):
        return twitter_title["content"].strip()
    
    return "Untitled Document"


def get_element_id(element: Tag) -> Optional[str]:
    """
    Get the ID of an HTML element.
    
    Args:
        element: The HTML element.
        
    Returns:
        The element ID, or None if not found.
    """
    if element.has_attr("id"):
        return element["id"]
    
    return None


def is_visible_element(element: Tag) -> bool:
    """
    Check if an HTML element is likely to be visible in the rendered page.
    
    Args:
        element: The HTML element.
        
    Returns:
        True if the element is likely visible, False otherwise.
    """
    # Check display:none style
    if element.has_attr("style"):
        style = element["style"].lower()
        if "display:none" in style or "display: none" in style:
            return False
    
    # Check hidden attribute
    if element.has_attr("hidden"):
        return False
    
    # Check aria-hidden attribute
    if element.has_attr("aria-hidden") and element["aria-hidden"].lower() == "true":
        return False
    
    # Check visibility:hidden style
    if element.has_attr("style"):
        style = element["style"].lower()
        if "visibility:hidden" in style or "visibility: hidden" in style:
            return False
    
    return True


def get_heading_level(element: Tag) -> Optional[int]:
    """
    Get the heading level of an HTML element.
    
    Args:
        element: The HTML element.
        
    Returns:
        The heading level (1-6), or None if the element is not a heading.
    """
    if not element.name or not element.name.startswith("h"):
        return None
    
    try:
        level = int(element.name[1])
        if 1 <= level <= 6:
            return level
    except ValueError:
        pass
    
    return None


def get_nearest_heading(element: Tag) -> Optional[Tag]:
    """
    Find the nearest heading element that precedes the given element.
    
    Args:
        element: The HTML element.
        
    Returns:
        The nearest heading element, or None if not found.
    """
    current = element.previous_element
    
    while current:
        if current.name and current.name in ["h1", "h2", "h3", "h4", "h5", "h6"]:
            return current
        current = current.previous_element
    
    return None


def extract_url_from_element(element: Tag, base_url: str) -> Optional[str]:
    """
    Extract a URL from an HTML element.
    
    Args:
        element: The HTML element.
        base_url: The base URL for resolving relative URLs.
        
    Returns:
        The extracted URL, or None if not found.
    """
    from urllib.parse import urljoin
    
    # Check href attribute (for links)
    if element.has_attr("href"):
        return urljoin(base_url, element["href"])
    
    # Check src attribute (for images, scripts, etc.)
    if element.has_attr("src"):
        return urljoin(base_url, element["src"])
    
    # Check data-src attribute (for lazy-loaded images)
    if element.has_attr("data-src"):
        return urljoin(base_url, element["data-src"])
    
    return None
