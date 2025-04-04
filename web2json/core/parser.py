"""
Module for parsing HTML content.
"""

import re
from typing import Dict, Optional, Any, List
from urllib.parse import urljoin

import structlog
from bs4 import BeautifulSoup, Tag, NavigableString

from web2json.models.config import ProcessingConfig


logger = structlog.get_logger(__name__)


class HtmlParser:
    """
    Parses HTML content into a BeautifulSoup object and extracts basic metadata.
    """
    
    def __init__(self, config: ProcessingConfig) -> None:
        """
        Initialize the parser with the given configuration.
        
        Args:
            config: The processing configuration.
        """
        self.config = config
    
    def parse(self, html: str, base_url: str) -> BeautifulSoup:
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
        self._handle_base_tag(soup, base_url)
        
        # Remove tags that should be ignored
        self._remove_ignored_tags(soup)
        
        return soup
    
    def _handle_base_tag(self, soup: BeautifulSoup, base_url: str) -> None:
        """
        Process base tags in the HTML to correctly handle relative URLs.
        
        Args:
            soup: The BeautifulSoup object.
            base_url: The original base URL.
        """
        base_tag = soup.find("base")
        
        if base_tag and base_tag.get("href"):
            # Update base URL based on the href attribute
            new_base = urljoin(base_url, base_tag["href"])
            logger.debug("Found base tag", href=new_base)
            
            # Update relative URLs in the document
            for tag in soup.find_all(["a", "img", "link", "script"]):
                for attr in ["href", "src"]:
                    if tag.has_attr(attr) and not tag[attr].startswith(("http://", "https://", "data:", "#", "mailto:")):
                        tag[attr] = urljoin(new_base, tag[attr])
        else:
            # No base tag, use the provided base URL directly
            for tag in soup.find_all(["a", "img", "link", "script"]):
                for attr in ["href", "src"]:
                    if tag.has_attr(attr) and not tag[attr].startswith(("http://", "https://", "data:", "#", "mailto:")):
                        tag[attr] = urljoin(base_url, tag[attr])
    
    def _remove_ignored_tags(self, soup: BeautifulSoup) -> None:
        """
        Remove tags that should be ignored from the BeautifulSoup object.
        
        Args:
            soup: The BeautifulSoup object.
        """
        for tag_name in self.config.ignore_tags:
            for tag in soup.find_all(tag_name):
                logger.debug("Removing ignored tag", tag=tag_name)
                tag.decompose()
    
    def extract_metadata(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """
        Extract metadata from the HTML document.
        
        Args:
            soup: The BeautifulSoup object.
            
        Returns:
            A dictionary of metadata extracted from the document.
        """
        if not self.config.extract_metadata:
            return {}
        
        metadata: Dict[str, Any] = {}
        
        # Extract title
        title_tag = soup.find("title")
        if title_tag:
            metadata["title"] = title_tag.get_text().strip()
        
        # Extract meta tags
        for meta in soup.find_all("meta"):
            # Handle name/content pairs
            if meta.get("name") and meta.get("content"):
                metadata[meta["name"]] = meta["content"]
            
            # Handle property/content pairs (OpenGraph, etc.)
            elif meta.get("property") and meta.get("content"):
                metadata[meta["property"]] = meta["content"]
            
            # Handle charset
            elif meta.get("charset"):
                metadata["charset"] = meta["charset"]
            
            # Handle http-equiv
            elif meta.get("http-equiv") and meta.get("content"):
                metadata[f"http-equiv:{meta['http-equiv']}"] = meta["content"]
        
        # Extract other important head elements
        canonical = soup.find("link", rel="canonical")
        if canonical and canonical.get("href"):
            metadata["canonical"] = canonical["href"]
        
        # Extract viewport
        viewport = soup.find("meta", attrs={"name": "viewport"})
        if viewport and viewport.get("content"):
            metadata["viewport"] = viewport["content"]
        
        # Extract structured data (JSON-LD)
        json_ld_scripts = soup.find_all("script", type="application/ld+json")
        if json_ld_scripts:
            metadata["json_ld"] = [script.string for script in json_ld_scripts if script.string]
        
        logger.debug("Extracted metadata", count=len(metadata))
        return metadata
    
    def get_document_title(self, soup: BeautifulSoup) -> str:
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
            return self._extract_element_content(h1_tag)
        
        # Check OpenGraph title
        og_title = soup.find("meta", property="og:title")
        if og_title and og_title.get("content"):
            return og_title["content"].strip()
        
        # Check meta title
        meta_title = soup.find("meta", attrs={"name": "title"})
        if meta_title and meta_title.get("content"):
            return meta_title["content"].strip()
        
        return "Untitled Document"
    
    def _extract_element_content(self, element: Tag) -> str:
        """
        Extract the content of an element, preserving specified HTML tags.
        
        Args:
            element: The HTML element.
            
        Returns:
            The element content with preserved HTML tags.
        """
        if not element:
            return ""
        
        # If we want to preserve HTML tags
        if self.config.preserve_html_tags:
            html_content = ""
            
            for child in element.children:
                if isinstance(child, NavigableString):
                    # For text nodes, add them directly
                    html_content += str(child)
                elif isinstance(child, Tag):
                    # For tag nodes, if the tag should be preserved, add it with its content
                    if child.name in self.config.preserve_tags:
                        html_content += str(child)
                    else:
                        # Otherwise, recursively process its content
                        html_content += self._extract_element_content(child)
            
            return html_content
        else:
            # If we don't want to preserve HTML tags, just get the text
            text = element.get_text(" ", strip=True)
            return " ".join(text.split()) if self.config.normalize_whitespace else text
