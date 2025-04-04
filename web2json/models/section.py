"""
Section model representing hierarchical sections within a document.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Self, Union, cast
from bs4 import Tag


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
    content: List[Any] = field(default_factory=list)
    children: List[Self] = field(default_factory=list)
    
    # Non-serialized fields used during processing
    raw_content_elements: List[Tag] = field(default_factory=list, repr=False)
    element_id: Optional[str] = field(default=None, repr=False)
    
    def add_content(self, content_item: Any) -> None:
        """
        Add a content item to this section.
        
        Args:
            content_item: The content item to add, could be a string or dictionary.
        """
        if isinstance(content_item, dict) and content_item.get("type"):
            self.content.append(content_item)
        elif isinstance(content_item, str) and content_item.strip():
            self.content.append(content_item.strip())
    
    def add_child(self, child: Self) -> None:
        """
        Add a child section to this section.
        
        Args:
            child: The child section to add.
        """
        self.children.append(child)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the section to a dictionary representation for JSON serialization."""
        result = {
            "type": self.type,
            "title": self.title,
            "level": self.level,
            "content": self.content.copy(),
        }
        
        # Include ID if present
        if self.id:
            result["id"] = self.id
        elif self.element_id:
            result["id"] = self.element_id
        
        # Include children if present
        if self.children:
            result["children"] = [child.to_dict() for child in self.children]
            
        return result
    
    @classmethod
    def create_from_heading(
        cls, title: str, level: int, element_id: Optional[str] = None
    ) -> Self:
        """
        Create a section from a heading element.
        
        Args:
            title: The section title.
            level: The heading level (1-6).
            element_id: Optional element ID.
            
        Returns:
            A new section instance.
        """
        return cls(
            title=title,
            level=level,
            id=element_id,
        )
