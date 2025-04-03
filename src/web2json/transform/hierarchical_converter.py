"""
Hierarchical converter for web2json.

This module provides functions to convert content into a hierarchical structure
that matches the custom JSON format with heading titles and children arrays.
"""
from typing import List, Dict, Any, Optional, Union
import logging
import re
from pydantic import BaseModel


def convert_to_hierarchical(document: Union[Dict[str, Any], BaseModel]) -> Dict[str, Any]:
    """Convert the document into the hierarchical format.
    
    The hierarchical format uses a structure with headings, content text arrays,
    and children arrays for nested elements, matching the custom JSON format.
    
    Args:
        document: Document in the current format, can be a dictionary or a Pydantic model
        
    Returns:
        Document in the hierarchical format
    """
    logger = logging.getLogger(__name__)
    logger.debug("Converting document to hierarchical format")
    
    # Convert Pydantic model to dict if needed
    if hasattr(document, 'model_dump'):
        document_dict = document.model_dump()
    else:
        document_dict = document
    
    # Create a new document with the same title
    result = {
        "title": document_dict.get("title", "Untitled Document"),
        "content": []
    }
    
    # Process the content
    content_items = document_dict.get("content", [])
    
    # Group top-level sections and other content
    top_level_sections = []
    other_content = []
    
    for item in content_items:
        if isinstance(item, dict) and item.get("type") == "section" and item.get("level") == 1:
            top_level_sections.append(item)
        else:
            other_content.append(item)
    
    # Convert top-level sections
    for section in top_level_sections:
        converted = _convert_section_to_heading(section)
        if converted:
            result["content"].append(converted)
    
    # If no top-level sections, try to find heading/paragraph groupings
    if not top_level_sections:
        result["content"] = _build_heading_hierarchy(content_items)
    
    # If still no content and we have other items, create a default section
    if not result["content"] and other_content:
        default_section = {
            "type": "heading",
            "level": 1,
            "title": "Content",
            "content": []
        }
        
        for item in other_content:
            if isinstance(item, dict) and item.get("type") == "paragraph" and "text" in item:
                default_section["content"].append(item["text"])
        
        if default_section["content"]:
            result["content"].append(default_section)
    
    # Add metadata if available
    if "metadata" in document_dict:
        result["metadata"] = document_dict["metadata"]
    
    logger.debug(f"Converted document with {len(result['content'])} top-level items")
    return result


def _convert_section_to_heading(section: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Convert a section to a heading with content and children.
    
    Args:
        section: Section in the current format
        
    Returns:
        Heading in the hierarchical format, or None if conversion failed
    """
    logger = logging.getLogger(__name__)
    
    # Find the heading in the section
    heading_content = None
    paragraphs = []
    child_sections = []
    
    for item in section.get("content", []):
        if isinstance(item, dict):
            if item.get("type") == "heading":
                heading_content = item
            elif item.get("type") == "paragraph":
                paragraphs.append(item)
            elif item.get("type") == "section":
                child_sections.append(item)
    
    if not heading_content:
        logger.warning("Section without heading, skipping conversion")
        return None
    
    # Create the hierarchical item
    hierarchical = {
        "type": "heading",
        "level": heading_content.get("level", 1),
        "title": heading_content.get("text", "")
    }
    
    # Add content from paragraphs
    if paragraphs:
        content_items = []
        for para in paragraphs:
            if "text" in para:
                content_items.append(para["text"])
        
        if content_items:
            hierarchical["content"] = content_items
    
    # Add children from child sections
    if child_sections:
        children = []
        for child in child_sections:
            converted_child = _convert_section_to_heading(child)
            if converted_child:
                children.append(converted_child)
        
        if children:
            hierarchical["children"] = children
    
    return hierarchical


def _build_heading_hierarchy(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Build a hierarchical structure from a flat list of content items.
    
    Args:
        items: List of content items
        
    Returns:
        Hierarchical structure with headings, content, and children
    """
    # Track current section at each level (level -> current section)
    current_sections = {}
    
    # Result will contain top-level (level 1) headings
    result = []
    
    # First pass: create heading sections and build the hierarchy
    for item in items:
        if isinstance(item, dict) and item.get("type") == "heading":
            level = item.get("level", 1)
            title = item.get("text", "")
            
            # Create new section
            new_section = {
                "type": "heading",
                "level": level,
                "title": title,
                "content": [],
                "children": []
            }
            
            # Store this section at its level
            current_sections[level] = new_section
            
            # Add to parent or result
            if level == 1:
                # Top level heading, add to result
                result.append(new_section)
            else:
                # Find the parent (highest level below this one)
                parent_level = max((l for l in current_sections.keys() if l < level), default=None)
                if parent_level:
                    # Add to parent's children
                    current_sections[parent_level]["children"].append(new_section)
                else:
                    # No parent found (shouldn't happen with well-structured content)
                    # Add to result as a top-level item
                    result.append(new_section)
        
        elif isinstance(item, dict) and item.get("type") == "paragraph":
            # Add paragraph to the most recent section at any level
            if current_sections:
                latest_level = max(current_sections.keys())
                current_sections[latest_level]["content"].append(item.get("text", ""))
    
    return result


def preserve_html_formatting(text: str) -> str:
    """Preserve common HTML formatting tags in text.
    
    Args:
        text: Text that may contain HTML tags
        
    Returns:
        Text with preserved HTML formatting
    """
    # Define the tags we want to preserve
    preserve_tags = ['b', 'strong', 'i', 'em', 'u', 'code', 'mark', 'small', 'sub', 'sup']
    
    # Create a regex pattern to match these tags
    tag_pattern = '|'.join(preserve_tags)
    pattern = f'</?({tag_pattern})>'
    
    # Find all tags
    tags = re.findall(pattern, text, re.IGNORECASE)
    
    # If no tags found, return the original text
    if not tags:
        return text
    
    # Otherwise, keep the tags
    return text
