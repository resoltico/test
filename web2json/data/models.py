"""
Data models for web2json.

This module defines the core data models using dataclasses optimized for
serialization and deserialization with cattrs.
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Union, Any


@dataclass
class HeadingContent:
    """Content model for headings."""
    type: str = "heading"
    level: int = 1
    text: str = ""


@dataclass
class ParagraphContent:
    """Content model for paragraphs."""
    type: str = "paragraph"
    text: str = ""


@dataclass
class ListItem:
    """Model for list items, supporting nested lists."""
    text: str
    type: Optional[str] = None
    list_type: Optional[str] = None
    items: Optional[List['ListItem']] = None


@dataclass
class ListContent:
    """Content model for lists."""
    type: str = "list"
    list_type: str = "unordered"
    level: int = 1
    items: List[ListItem] = field(default_factory=list)


@dataclass
class BlockquoteContent:
    """Content model for blockquotes."""
    type: str = "blockquote"
    text: str = ""


@dataclass
class SectionContent:
    """Content model for document sections."""
    type: str = "section"
    level: int = 1
    content: List[Any] = field(default_factory=list)


# Define a union type for content items
ContentItem = Union[
    HeadingContent,
    ParagraphContent,
    ListContent,
    BlockquoteContent,
    SectionContent
]


@dataclass
class Metadata:
    """Document metadata model."""
    fetched_at: str
    url: str
    preserve_styles: bool = False
    meta: Optional[dict] = None

    @classmethod
    def create(cls, url: str, preserve_styles: bool = False) -> 'Metadata':
        """Create metadata with current timestamp."""
        return cls(
            fetched_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            url=url,
            preserve_styles=preserve_styles
        )


@dataclass
class Document:
    """Main document model."""
    title: str
    content: List[ContentItem] = field(default_factory=list)
    metadata: Metadata = field(default_factory=lambda: Metadata(
        fetched_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        url="",
    ))