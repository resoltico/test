"""
Semantic processor for handling HTML5 semantic elements.
"""

from typing import Dict, List, Any, Optional

import structlog
from bs4 import Tag

from web2json.models.section import Section
from web2json.processors.base import ElementProcessor


logger = structlog.get_logger(__name__)


class SemanticProcessor(ElementProcessor):
    """
    Processor for HTML5 semantic elements.
    
    This processor extracts structured data from semantic elements like
    article, aside, blockquote, etc.
    """
    
    def process(self, element: Tag, section: Section) -> None:
        """
        Process a semantic element and add the result to the section.
        
        Args:
            element: The semantic element to process.
            section: The section to add the processed content to.
        """
        if element.name == "article":
            self._process_article(element, section)
        elif element.name == "aside":
            self._process_aside(element, section)
        elif element.name == "blockquote":
            self._process_blockquote(element, section)
        elif element.name == "details":
            self._process_details(element, section)
        elif element.name == "time":
            self._process_time(element, section)
        elif element.name == "address":
            self._process_address(element, section)
        elif element.name == "cite":
            self._process_cite(element, section)
        elif element.name in self.config.semantic_tags:
            # For other semantic elements, extract content with preserved HTML tags
            content = self.get_text_content(element)
            if content.strip():
                section.add_content(content)
    
    def _process_article(self, element: Tag, section: Section) -> None:
        """
        Process an article element.
        
        Args:
            element: The article element.
            section: The section to add the processed content to.
        """
        article_data = {
            "type": "article",
            "content": []
        }
        
        # Extract article header
        header = element.find("header")
        if header:
            article_data["header"] = self.get_text_content(header)
        
        # Extract article content
        for child in element.children:
            if not isinstance(child, Tag):
                continue
            
            # Skip header and footer (processed separately)
            if child.name in ["header", "footer"]:
                continue
            
            # For headings, create a section
            if self.is_heading(child):
                heading_level = self.get_heading_level(child)
                heading_text = self.get_text_content(child)
                
                section_data = {
                    "type": "section",
                    "title": heading_text,
                    "level": heading_level,
                    "content": []
                }
                
                article_data["content"].append(section_data)
            
            # For other content, extract text with preserved HTML tags
            else:
                content = self.get_text_content(child)
                if content.strip():
                    if article_data["content"] and isinstance(article_data["content"][-1], dict) and article_data["content"][-1]["type"] == "section":
                        article_data["content"][-1]["content"].append(content)
                    else:
                        article_data["content"].append(content)
        
        # Extract article footer
        footer = element.find("footer")
        if footer:
            article_data["footer"] = self.get_text_content(footer)
        
        # Add the article to the section content
        section.add_content(article_data)
    
    def _process_aside(self, element: Tag, section: Section) -> None:
        """
        Process an aside element.
        
        Args:
            element: The aside element.
            section: The section to add the processed content to.
        """
        aside_data = {
            "type": "aside",
            "content": []
        }
        
        # Extract aside content
        for child in element.children:
            if not isinstance(child, Tag):
                continue
            
            # For headings, create a section
            if self.is_heading(child):
                heading_level = self.get_heading_level(child)
                heading_text = self.get_text_content(child)
                
                section_data = {
                    "type": "section",
                    "title": heading_text,
                    "level": heading_level,
                    "content": []
                }
                
                aside_data["content"].append(section_data)
            
            # For other content, extract text with preserved HTML tags
            else:
                content = self.get_text_content(child)
                if content.strip():
                    if aside_data["content"] and isinstance(aside_data["content"][-1], dict) and aside_data["content"][-1]["type"] == "section":
                        aside_data["content"][-1]["content"].append(content)
                    else:
                        aside_data["content"].append(content)
        
        # Add the aside to the section content
        section.add_content(aside_data)
    
    def _process_blockquote(self, element: Tag, section: Section) -> None:
        """
        Process a blockquote element.
        
        Args:
            element: The blockquote element.
            section: The section to add the processed content to.
        """
        blockquote_data = {
            "type": "quote",
            "content": self.get_text_content(element)
        }
        
        # Extract citation
        cite = element.find("cite")
        if cite:
            blockquote_data["source"] = self.get_text_content(cite)
        
        # If there's a footer, use that as the citation source
        footer = element.find("footer")
        if footer:
            blockquote_data["source"] = self.get_text_content(footer)
        
        # Add the blockquote to the section content
        section.add_content(blockquote_data)
    
    def _process_details(self, element: Tag, section: Section) -> None:
        """
        Process a details element.
        
        Args:
            element: The details element.
            section: The section to add the processed content to.
        """
        details_data = {
            "type": "details",
            "content": []
        }
        
        # Extract summary
        summary = element.find("summary")
        if summary:
            details_data["summary"] = self.get_text_content(summary)
        
        # Extract details content
        for child in element.children:
            if not isinstance(child, Tag):
                continue
            
            # Skip summary (processed separately)
            if child.name == "summary":
                continue
            
            # Extract text content with preserved HTML tags
            content = self.get_text_content(child)
            if content.strip():
                details_data["content"].append(content)
        
        # Add the details to the section content
        section.add_content(details_data)
    
    def _process_time(self, element: Tag, section: Section) -> None:
        """
        Process a time element.
        
        Args:
            element: The time element.
            section: The section to add the processed content to.
        """
        # For time elements, preserve as HTML
        content = str(element)
        if content.strip():
            section.add_content(content)
    
    def _process_address(self, element: Tag, section: Section) -> None:
        """
        Process an address element.
        
        Args:
            element: The address element.
            section: The section to add the processed content to.
        """
        address_data = {
            "type": "address",
            "content": self.get_text_content(element)
        }
        
        # Add the address to the section content
        section.add_content(address_data)
    
    def _process_cite(self, element: Tag, section: Section) -> None:
        """
        Process a cite element.
        
        Args:
            element: The cite element.
            section: The section to add the processed content to.
        """
        # For cite elements, preserve as HTML
        content = str(element)
        if content.strip():
            section.add_content(content)
