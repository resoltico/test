"""
Text processor for handling paragraph and text elements.
"""

import structlog
from bs4 import Tag, NavigableString

from web2json.models.section import Section
from web2json.processors.base import ElementProcessor


logger = structlog.get_logger(__name__)


class TextProcessor(ElementProcessor):
    """
    Processor for paragraph and text elements.
    
    This processor extracts text content from paragraph and similar elements,
    preserving specified HTML tags.
    """
    
    def process(self, element: Tag, section: Section) -> None:
        """
        Process a text element and add the result to the section.
        
        Args:
            element: The text element to process.
            section: The section to add the processed content to.
        """
        if element.name == "p":
            # For paragraphs, extract text content with preserved HTML tags
            content = self.get_text_content(element)
            if content.strip():
                section.add_content(content)
        
        elif element.name in self.config.content_tags:
            # For other content elements, extract text content with preserved HTML tags
            content = self.get_text_content(element)
            if content.strip():
                section.add_content(content)
