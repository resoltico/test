"""
Section model representing hierarchical sections within a document.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Self, Union


@dataclass
class Section:
    """
    Represents a section in the document hierarchy.
    
    Sections are typically created from heading elements (h1-h6) and contain
    content and possibly nested subsections.
    """
    title: str
    level: int
    id: Optional[str] = None
    type: str = "section"
    content: List[Dict[str, Any]] = field(default_factory=list)
    children: List[Self] = field(default_factory=list)
    attributes: Dict[str, str] = field(default_factory=dict)
    
    def add_content(self, content_item: Dict[str, Any]) -> None:
        """Add a content item to this section."""
        self.content.append(content_item)
    
    def add_child(self, child: Self) -> None:
        """Add a child section to this section."""
        self.children.append(child)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the section to a dictionary representation for JSON serialization."""
        result = {
            "type": self.type,
            "title": self.title,
            "level": self.level,
            "content": self.content.copy(),
        }
        
        if self.id:
            result["id"] = self.id
        
        if self.children:
            result["children"] = [child.to_dict() for child in self.children]
        
        if self.attributes:
            result["attributes"] = self.attributes.copy()
            
        return result
    
    @classmethod
    def create_from_heading(
        cls, title: str, level: int, element_id: Optional[str] = None
    ) -> Self:
        """Create a section from a heading element."""
        return cls(
            title=title,
            level=level,
            id=element_id,
        )
