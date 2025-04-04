"""
Module for transforming HTML documents into structured JSON.
"""

from typing import Dict, List, Optional, Type, TypeAlias, Any

import structlog
from bs4 import BeautifulSoup, Tag

from web2json.core.hierarchy import HierarchyExtractor
from web2json.core.parser import HtmlParser
from web2json.models.config import ProcessingConfig, Web2JsonConfig
from web2json.models.document import Document
from web2json.models.section import Section
from web2json.processors.base import ElementProcessor


logger = structlog.get_logger(__name__)

# Type alias for BeautifulSoup for better readability
Soup: TypeAlias = BeautifulSoup


class Transformer:
    """
    Coordinates the transformation of HTML into structured JSON.
    
    This is the main orchestrator that combines parsing, hierarchy extraction,
    and specialized element processing.
    """
    
    def __init__(
        self, 
        config: Web2JsonConfig,
        processors: Optional[List[ElementProcessor]] = None
    ) -> None:
        """
        Initialize the transformer with the given configuration and processors.
        
        Args:
            config: The application configuration.
            processors: Optional list of element processors to use.
        """
        self.config = config
        self.parser = HtmlParser(config.processing)
        self.hierarchy_extractor = HierarchyExtractor(config.processing, self.parser)
        self.processors = processors or []
        
        logger.debug(
            "Initialized transformer", 
            processor_count=len(self.processors)
        )
    
    def transform(self, html: str, url: str) -> Document:
        """
        Transform HTML content into a structured Document.
        
        Args:
            html: The HTML content to transform.
            url: The URL of the document, used for resolving relative links.
            
        Returns:
            A Document object representing the transformed content.
        """
        logger.info("Starting document transformation", url=url)
        
        # Parse the HTML
        soup = self.parser.parse(html, url)
        
        # Extract document title and metadata
        title = self.parser.get_document_title(soup)
        metadata = self.parser.extract_metadata(soup)
        
        # Create a document with the title and URL
        document = Document.create_empty(url, title)
        document.metadata = metadata
        
        # Extract the hierarchical structure based on headings
        document = self.hierarchy_extractor.extract_hierarchy(soup, document)
        
        # Apply specialized processors to extract and process content
        document = self._apply_processors(soup, document)
        
        # Post-process the document to ensure consistency
        document = self._post_process_document(document)
        
        logger.info(
            "Document transformation complete", 
            url=url, 
            section_count=len(document.content)
        )
        return document
    
    def _apply_processors(self, soup: Soup, document: Document) -> Document:
        """
        Apply specialized element processors to the document.
        
        Args:
            soup: The BeautifulSoup object containing the parsed HTML.
            document: The Document object to enhance with processed elements.
            
        Returns:
            The enhanced Document object.
        """
        logger.debug("Applying specialized processors")
        
        for processor in self.processors:
            logger.debug(
                "Running processor", 
                processor=processor.__class__.__name__
            )
            document = processor.process(soup, document)
        
        return document
    
    def _post_process_document(self, document: Document) -> Document:
        """
        Perform final adjustments to ensure consistent document structure.
        
        Args:
            document: The Document object to post-process.
            
        Returns:
            The post-processed Document object.
        """
        # Process all sections recursively
        self._post_process_sections(document.content)
        
        return document
    
    def _post_process_sections(self, sections: List[Section]) -> None:
        """
        Post-process all sections recursively to ensure consistent structure.
        
        Args:
            sections: List of sections to process.
        """
        for section in sections:
            # Process section content
            self._post_process_content(section)
            
            # Process child sections recursively
            if section.children:
                self._post_process_sections(section.children)
    
    def _post_process_content(self, section: Section) -> None:
        """
        Post-process section content to ensure consistency.
        
        Args:
            section: The section to process.
        """
        # Filter out empty content items
        section.content = [
            item for item in section.content 
            if (isinstance(item, dict) and item) or 
               (isinstance(item, str) and item.strip())
        ]
    
    @classmethod
    def create_default(cls, config: Optional[Web2JsonConfig] = None) -> "Transformer":
        """
        Create a transformer with default configuration and standard processors.
        
        Args:
            config: Optional custom configuration, uses defaults if not provided.
            
        Returns:
            A configured Transformer instance.
        """
        from web2json.processors.text import TextProcessor
        from web2json.processors.tables import TableProcessor
        from web2json.processors.lists import ListProcessor
        
        config = config or Web2JsonConfig.create_default()
        parser = HtmlParser(config.processing)
        
        processors = [
            TextProcessor(config.processing, parser),
            ListProcessor(config.processing, parser),
            TableProcessor(config.processing, parser),
            # Add other processors as needed
        ]
        
        return cls(config, processors)
