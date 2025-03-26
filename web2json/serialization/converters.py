"""
Converter configuration for cattrs.

This module configures cattrs for serializing and deserializing
web2json data models to and from dictionary/JSON representations.
"""
from datetime import datetime
import traceback
from typing import Any, Dict, List, Optional, Type, Union, cast
import logging

import cattrs
from cattrs.gen import make_dict_unstructure_fn, make_dict_structure_fn, override

from ..data.models import (
    Document,
    Metadata,
    HeadingContent,
    ParagraphContent,
    ListContent,
    ListItem,
    BlockquoteContent,
    SectionContent,
    ContentItem
)

logger = logging.getLogger(__name__)

# Create a converter with our custom configuration
converter = cattrs.Converter()

# Register hooks for datetime objects
converter.register_unstructure_hook(
    datetime,
    lambda dt: dt.isoformat()
)

converter.register_structure_hook(
    datetime,
    lambda obj, _: datetime.fromisoformat(obj) if isinstance(obj, str) else obj
)


# Create a mapping for content item types to classes
CONTENT_TYPE_MAP = {
    "heading": HeadingContent,
    "paragraph": ParagraphContent,
    "list": ListContent,
    "blockquote": BlockquoteContent,
    "section": SectionContent
}


def structure_list_item(data: Dict[str, Any], _: Type = None) -> ListItem:
    """Structure a dictionary into a ListItem, handling nested items."""
    try:
        # Create a copy to avoid modifying the original
        item_data = dict(data)
        
        # Handle nested items if present
        if "items" in item_data and isinstance(item_data["items"], list):
            processed_items = []
            for nested_item in item_data["items"]:
                if isinstance(nested_item, dict):
                    processed_items.append(structure_list_item(nested_item))
                else:
                    # Skip non-dict items
                    logger.warning(f"Skipping invalid nested list item: {nested_item}")
            item_data["items"] = processed_items
        
        # Filter out any None values (optional fields that weren't provided)
        item_data = {k: v for k, v in item_data.items() if v is not None}
        
        # Create the ListItem
        return ListItem(**item_data)
    
    except Exception as e:
        logger.error(f"Error structuring ListItem {data}: {str(e)}")
        # Provide a default item with at least the text field
        return ListItem(text=str(data.get("text", "Missing text")))


def structure_list_content(data: Dict[str, Any], _: Type = None) -> ListContent:
    """Structure a dictionary into a ListContent object."""
    try:
        # Create a copy to avoid modifying the original
        list_data = dict(data)
        
        # Process items if present
        items = list_data.get("items", [])
        processed_items = []
        
        for item in items:
            if isinstance(item, dict):
                processed_items.append(structure_list_item(item))
        
        # Create the ListContent with explicit field assignment
        return ListContent(
            type=list_data.get("type", "list"),
            list_type=list_data.get("list_type", "unordered"),
            level=list_data.get("level", 1),
            items=processed_items
        )
    except Exception as e:
        error_msg = f"Error structuring ListContent {data}: {str(e)}"
        logger.error(error_msg)
        traceback.print_exc()
        # Return a minimal valid ListContent
        return ListContent(
            type="list",
            list_type="unordered",
            level=1,
            items=[]
        )


def structure_content_item(data: Dict[str, Any], _: Type = None) -> ContentItem:
    """Convert a dictionary to the appropriate content item class based on type."""
    if not isinstance(data, dict) or "type" not in data:
        logger.warning(f"Invalid content item format: {data}")
        # Return a default paragraph if we can't determine the type
        return ParagraphContent(text=str(data) if data else "")
    
    try:
        item_type = data.get("type")
        
        # Handle each content type specifically
        if item_type == "heading":
            return HeadingContent(
                type="heading",
                level=int(data.get("level", 1)),
                text=str(data.get("text", ""))
            )
            
        elif item_type == "paragraph":
            return ParagraphContent(
                type="paragraph",
                text=str(data.get("text", ""))
            )
            
        elif item_type == "list":
            return structure_list_content(data)
            
        elif item_type == "blockquote":
            return BlockquoteContent(
                type="blockquote",
                text=str(data.get("text", ""))
            )
            
        elif item_type == "section":
            content_list = data.get("content", [])
            processed_content = []
            
            for content_item in content_list:
                if isinstance(content_item, dict):
                    processed_content.append(structure_content_item(content_item))
            
            return SectionContent(
                type="section",
                level=int(data.get("level", 1)),
                content=processed_content
            )
        
        else:
            logger.warning(f"Unknown content item type: {item_type}")
            return ParagraphContent(text=str(data.get("text", f"Unknown item type: {item_type}")))
    
    except Exception as e:
        error_msg = f"Error structuring content item {data}: {str(e)}"
        logger.error(error_msg)
        traceback.print_exc()
        return ParagraphContent(text=f"Error: {str(e)}")


# Configure unstructure functions for each model
unstructure_document = make_dict_unstructure_fn(
    Document,
    converter,
    _cattrs_omit_if_default=False
)
converter.register_unstructure_hook(Document, unstructure_document)

unstructure_heading = make_dict_unstructure_fn(
    HeadingContent,
    converter,
    _cattrs_omit_if_default=False
)
converter.register_unstructure_hook(HeadingContent, unstructure_heading)

unstructure_paragraph = make_dict_unstructure_fn(
    ParagraphContent,
    converter,
    _cattrs_omit_if_default=False
)
converter.register_unstructure_hook(ParagraphContent, unstructure_paragraph)

unstructure_list_content = make_dict_unstructure_fn(
    ListContent,
    converter,
    _cattrs_omit_if_default=False
)
converter.register_unstructure_hook(ListContent, unstructure_list_content)

unstructure_list_item = make_dict_unstructure_fn(
    ListItem,
    converter,
    _cattrs_omit_if_default=False
)
converter.register_unstructure_hook(ListItem, unstructure_list_item)

unstructure_blockquote = make_dict_unstructure_fn(
    BlockquoteContent,
    converter,
    _cattrs_omit_if_default=False
)
converter.register_unstructure_hook(BlockquoteContent, unstructure_blockquote)

unstructure_section = make_dict_unstructure_fn(
    SectionContent,
    converter,
    _cattrs_omit_if_default=False
)
converter.register_unstructure_hook(SectionContent, unstructure_section)

# Register structure hooks for specific classes
converter.register_structure_hook(HeadingContent, lambda d, _: HeadingContent(**d))
converter.register_structure_hook(ParagraphContent, lambda d, _: ParagraphContent(**d))
converter.register_structure_hook(ListContent, structure_list_content)
converter.register_structure_hook(ListItem, structure_list_item)
converter.register_structure_hook(BlockquoteContent, lambda d, _: BlockquoteContent(**d))
converter.register_structure_hook(SectionContent, lambda d, _: SectionContent(
    type=d.get("type", "section"),
    level=d.get("level", 1),
    content=[structure_content_item(item) for item in d.get("content", []) if isinstance(item, dict)]
))


# For Document class
def structure_document(data: Dict[str, Any], _: Type = None) -> Document:
    """Structure a dictionary into a Document object."""
    try:
        # Extract basic fields
        title = data.get("title", "")
        metadata_dict = data.get("metadata", {})
        content_list = data.get("content", [])
        
        # Structure metadata
        metadata = Metadata(
            fetched_at=metadata_dict.get("fetched_at", datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
            url=metadata_dict.get("url", ""),
            preserve_styles=metadata_dict.get("preserve_styles", False),
            meta=metadata_dict.get("meta")
        )
        
        # Structure content items
        content = []
        for item in content_list:
            if isinstance(item, dict):
                content.append(structure_content_item(item))
        
        # Create document
        return Document(title=title, content=content, metadata=metadata)
    
    except Exception as e:
        logger.error(f"Error structuring document: {str(e)}")
        traceback.print_exc()
        # Return a minimal valid document
        return Document(
            title="Error",
            content=[],
            metadata=Metadata(
                fetched_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                url="",
                preserve_styles=False
            )
        )


converter.register_structure_hook(Document, structure_document)


def unstructure_dict(obj: Any) -> Dict[str, Any]:
    """Convert an object to a dictionary using the configured converter."""
    return converter.unstructure(obj)


def structure_document_from_dict(data: Dict[str, Any]) -> Document:
    """Convert a dictionary to a Document object using the configured converter."""
    return structure_document(data)


def structure_metadata_from_dict(data: Dict[str, Any]) -> Metadata:
    """Convert a dictionary to a Metadata object using the configured converter."""
    return Metadata(
        fetched_at=data.get("fetched_at", datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
        url=data.get("url", ""),
        preserve_styles=data.get("preserve_styles", False),
        meta=data.get("meta")
    )