"""
Module for transforming HTML documents into structured JSON.
"""

import structlog
from bs4 import BeautifulSoup
from typing import Dict, List, Optional, Type, TypeAlias

from web2json.core.hierarchy import HierarchyExtractor
from web2json.core.parser import HtmlParser
from web2json.models.config import ProcessingConfig, Web2JsonConfig
from web2json.models.document import Document
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
        self.hierarchy_extractor = HierarchyExtractor(config.processing)
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
        
        # Create an empty document
        document = Document.create_empty(url, title)
        document.metadata = metadata
        
        # Extract the hierarchical structure
        document = self.hierarchy_extractor.extract_hierarchy(soup, document)
        
        # Apply specialized processors
        if self.processors:
            document = self._apply_processors(soup, document)
        
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
    
    @classmethod
    def create_default(cls, config: Optional[Web2JsonConfig] = None) -> "Transformer":
        """
        Create a transformer with default configuration and standard processors.
        
        Args:
            config: Optional custom configuration, uses defaults if not provided.
            
        Returns:
            A configured Transformer instance.
        """
        from web2json.processors.forms import FormProcessor
        from web2json.processors.tables import TableProcessor
        from web2json.processors.text import TextProcessor
        from web2json.processors.media import MediaProcessor
        from web2json.processors.semantic import SemanticProcessor
        
        config = config or Web2JsonConfig.create_default()
        
        processors = [
            TextProcessor(config.processing),
            TableProcessor(config.processing),
            FormProcessor(config.processing),
            MediaProcessor(config.processing),
            SemanticProcessor(config.processing),
        ]
        
        return cls(config, processors)
