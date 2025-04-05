"""
Section model representing hierarchical sections within a document.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Self, Union
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
    raw_tags: List[str] = field(default_factory=list, repr=False)
    
    def add_content(self, content_item: Any) -> None:
        """
        Add a content item to this section.
        
        Args:
            content_item: The content item to add, could be a string or dictionary.
        """
        self.content.append(content_item)
    
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

    def set_type(self, type_name: str) -> None:
        """
        Set the type of this section.
        
        Args:
            type_name: The type name to set.
        """
        self.type = type_name
    
    def clear_content(self) -> None:
        """Clear the content list."""
        self.content = []

    def find_section_by_id(self, section_id: str) -> Optional[Self]:
        """
        Find a section by its ID, searching this section and all children.
        
        Args:
            section_id: The ID to search for.
            
        Returns:
            The section if found, otherwise None.
        """
        if self.id == section_id:
            return self
            
        for child in self.children:
            found = child.find_section_by_id(section_id)
            if found:
                return found
                
        return None
