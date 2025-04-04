"""
Document model representing the high-level structure of a processed HTML document.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

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
