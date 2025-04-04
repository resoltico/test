"""
Document model representing the high-level structure of a processed HTML document.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, TypeAlias

from web2json.models.section import Section

# Type alias for content items
ContentItem: TypeAlias = Dict[str, Any]


@dataclass
class Document:
    """
    Represents the structured document extracted from an HTML page.
    
    This is the top-level container for the transformed document,
    containing metadata and the content hierarchy.
    """
    title: str
    url: str
    content: List[Section | ContentItem] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the document to a dictionary representation for JSON serialization."""
        sections_dict = [
            item.to_dict() if isinstance(item, Section) else item
            for item in self.content
        ]
        
        return {
            "title": self.title,
            "url": self.url,
            "content": sections_dict,
            "metadata": self.metadata,
        }
    
    @classmethod
    def create_empty(cls, url: str, title: Optional[str] = None) -> "Document":
        """Create an empty document for the given URL."""
        return cls(
            title=title or "Untitled Document",
            url=url,
        )
