"""
Document model representing the high-level structure of a processed HTML document.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Union

from web2json.models.section import Section


@dataclass
class Document:
    """
    Represents the structured document extracted from an HTML page.
    
    This is the top-level container for the transformed document,
    containing metadata and the content hierarchy.
    """
    title: str
    url: str
    content: List[Section] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the document to a dictionary representation for JSON serialization."""
        result = {
            "title": self.title,
            "content": [section.to_dict() for section in self.content],
        }
        
        # Include metadata as separate object
        if self.metadata:
            result["metadata"] = self.metadata.copy()
            
        # Include URL in result
        if "url" not in result:
            result["url"] = self.url
            
        return result
    
    @classmethod
    def create_empty(cls, url: str, title: Optional[str] = None) -> "Document":
        """Create an empty document for the given URL."""
        return cls(
            title=title or "Untitled Document",
            url=url,
        )
    
    def find_section_by_id(self, section_id: str) -> Optional[Section]:
        """
        Find a section by its ID.
        
        Args:
            section_id: The ID to search for.
            
        Returns:
            The section if found, otherwise None.
        """
        for section in self.content:
            found = section.find_section_by_id(section_id)
            if found:
                return found
                
        return None
    
    def add_section(self, section: Section) -> None:
        """
        Add a top-level section to the document.
        
        Args:
            section: The section to add.
        """
        self.content.append(section)
