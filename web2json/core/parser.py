"""
Module for parsing HTML content.
"""

from typing import Optional, TypeAlias, cast
from urllib.parse import urljoin

import structlog
from bs4 import BeautifulSoup, Tag

from web2json.models.config import ProcessingConfig


logger = structlog.get_logger(__name__)

# Type alias for BeautifulSoup for better readability
Soup: TypeAlias = BeautifulSoup


class HtmlParser:
    """
    Parses HTML content into a BeautifulSoup object and extracts basic metadata.
    """
    
    def __init__(self, config: ProcessingConfig) -> None:
        """Initialize the parser with the given configuration."""
        self.config = config
    
    def parse(self, html: str, base_url: str) -> Soup:
        """
        Parse HTML content into a BeautifulSoup object.
        
        Args:
            html: The HTML content to parse.
            base_url: The base URL for resolving relative URLs.
            
        Returns:
            A BeautifulSoup object representing the parsed HTML.
        """
        logger.info("Parsing HTML content")
        soup = BeautifulSoup(html, "lxml")
        
        # Process base tags to handle relative URLs correctly
        self._process_base_tags(soup, base_url)
        
        # Remove tags that should be ignored
        self._remove_ignored_tags(soup)
        
        return soup
    
    def _process_base_tags(self, soup: Soup, base_url: str) -> None:
        """
        Process base tags in the HTML to correctly handle relative URLs.
        
        Args:
            soup: The BeautifulSoup object.
            base_url: The original base URL.
        """
        base_tag = soup.find("base")
        if base_tag and base_tag.get("href"):
            new_base = urljoin(base_url, base_tag["href"])
            logger.debug("Found base tag", href=new_base)
            
            # Update all relative URLs in the document to use the new base
            for tag in soup.find_all(["a", "img", "link", "script"]):
                for attr in ["href", "src"]:
                    if tag.has_attr(attr) and not tag[attr].startswith(("http://", "https://", "data:", "#")):
                        tag[attr] = urljoin(new_base, tag[attr])
    
    def _remove_ignored_tags(self, soup: Soup) -> None:
        """
        Remove tags that should be ignored from the BeautifulSoup object.
        
        Args:
            soup: The BeautifulSoup object.
        """
        for tag_name in self.config.ignore_tags:
            for tag in soup.find_all(tag_name):
                logger.debug("Removing ignored tag", tag=tag_name)
                tag.decompose()
    
    def extract_metadata(self, soup: Soup) -> dict:
        """
        Extract metadata from the HTML document.
        
        Args:
            soup: The BeautifulSoup object.
            
        Returns:
            A dictionary of metadata extracted from the document.
        """
        if not self.config.extract_metadata:
            return {}
        
        metadata = {}
        
        # Extract title
        title_tag = soup.find("title")
        if title_tag:
            metadata["title"] = title_tag.get_text().strip()
        
        # Extract meta tags
        for meta in soup.find_all("meta"):
            # Handle common metadata
            if meta.get("name") and meta.get("content"):
                metadata[meta["name"]] = meta["content"]
            
            # OpenGraph and similar protocols
            if meta.get("property") and meta.get("content"):
                metadata[meta["property"]] = meta["content"]
            
            # Handle viewport and charset
            if meta.get("viewport"):
                metadata["viewport"] = meta["viewport"]
            elif meta.get("charset"):
                metadata["charset"] = meta["charset"]
        
        # Extract other common head elements
        if soup.find("link", rel="canonical"):
            metadata["canonical"] = soup.find("link", rel="canonical")["href"]
        
        logger.debug("Extracted metadata", count=len(metadata))
        return metadata
    
    def get_document_title(self, soup: Soup) -> str:
        """
        Extract the document title from the HTML.
        
        Args:
            soup: The BeautifulSoup object.
            
        Returns:
            The document title, or "Untitled Document" if not found.
        """
        # First check the title tag
        title_tag = soup.find("title")
        if title_tag and title_tag.string:
            return title_tag.string.strip()
        
        # Then check for h1
        h1_tag = soup.find("h1")
        if h1_tag:
            return h1_tag.get_text().strip()
        
        # Fallback to meta title
        meta_title = soup.find("meta", property="og:title") or soup.find("meta", name="title")
        if meta_title and meta_title.get("content"):
            return cast(str, meta_title["content"]).strip()
        
        return "Untitled Document"
    
    @staticmethod
    def get_element_id(element: Tag) -> Optional[str]:
        """
        Extract the ID from an HTML element.
        
        Args:
            element: The HTML element (BeautifulSoup Tag).
            
        Returns:
            The element ID, or None if not present.
        """
        # Direct id attribute
        if element.has_attr("id"):
            return element["id"]
        
        # Look for name attribute as fallback for anchors
        if element.name == "a" and element.has_attr("name"):
            return element["name"]
        
        return None
