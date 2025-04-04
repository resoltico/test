"""
Base class for element processors.
"""

from abc import ABC, abstractmethod
from typing import TypeAlias

from bs4 import BeautifulSoup

from web2json.models.config import ProcessingConfig
from web2json.models.document import Document


# Type alias for BeautifulSoup for better readability
Soup: TypeAlias = BeautifulSoup


class ElementProcessor(ABC):
    """
    Abstract base class for processors that handle specific HTML elements.
    
    Element processors are specialized components that process specific
    types of HTML elements (tables, forms, media, etc.) and transform
    them into structured JSON representations.
    """
    
    def __init__(self, config: ProcessingConfig) -> None:
        """
        Initialize the processor with the given configuration.
        
        Args:
            config: The processing configuration.
        """
        self.config = config
    
    @abstractmethod
    def process(self, soup: Soup, document: Document) -> Document:
        """
        Process the specified elements in the document.
        
        Args:
            soup: The BeautifulSoup object containing the parsed HTML.
            document: The Document object to enhance with processed elements.
            
        Returns:
            The enhanced Document object.
        """
        pass
