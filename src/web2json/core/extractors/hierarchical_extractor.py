"""
Hierarchical extractor module for web2json.

This module provides functionality for extracting content in a hierarchical structure
that reflects the document's semantic organization.
"""
import logging
from typing import List, Dict, Any, Optional, Tuple
import re

from bs4 import BeautifulSoup, Tag, NavigableString

from web2json.models.content import (
    ContentItem, HeadingContent, ParagraphContent, 
    ListContent, BlockquoteContent, SectionContent,
    CodeContent, TableContent
)
from web2json.utils.errors import ExtractError

# Define which tags are considered block-level elements
BLOCK_TAGS = {
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "div", "blockquote", "pre", "ul", "ol", "table",
    "article", "section", "header", "footer", "aside", "nav"
}

# Define which tags are considered code blocks
CODE_BLOCK_TAGS = {"pre", "code"}

# Define which tags are considered figure captions
CAPTION_TAGS = {"figcaption"}


def extract_content_hierarchically(soup: BeautifulSoup, preserve_styles: bool = False) -> List[ContentItem]:
    """Extract structured content from HTML in a hierarchical manner.
    
    Args:
        soup: BeautifulSoup object representing the parsed HTML
        preserve_styles: Whether to preserve HTML style tags
        
    Returns:
        List of structured content items organized hierarchically
        
    Raises:
        ExtractError: If extraction fails
    """
    logger = logging.getLogger(__name__)
    
    try:
        # Get the main content area
        main_content = _get_main_content(soup)
        
        # Flatten and normalize the document structure
        blocks = _extract_content_blocks(main_content)
        
        # Create hierarchical structure
        hierarchical_content = _organize_hierarchically(blocks, preserve_styles)
        
        logger.info(f"Extracted {len(hierarchical_content)} top-level content items hierarchically")
        return hierarchical_content
        
    except Exception as e:
        logger.error(f"Error extracting hierarchical content: {str(e)}")
        raise ExtractError(f"Failed to extract hierarchical content: {str(e)}")


def _get_main_content(soup: BeautifulSoup) -> Tag:
    """Attempt to find the main content area of the page.
    
    This tries to identify the main content area by looking for:
    1. <main> tag
    2. <article> tag
    3. <div> with id/class containing 'content', 'main', 'article'
    4. <body> tag as fallback
    
    Args:
        soup: BeautifulSoup object representing the parsed HTML
        
    Returns:
        Tag representing the main content area
    """
    # Try to find main content area using common patterns
    main_selectors = [
        "main", 
        "article", 
        "div#content", "div.content", 
        "div#main", "div.main", 
        "div#article", "div.article"
    ]
    
    for selector in main_selectors:
        content = soup.select_one(selector)
        if content:
            return content
    
    # Try to find elements with content-related class or id
    content_patterns = re.compile(r'(content|main|article)', re.IGNORECASE)
    for element in soup.find_all(['div', 'section']):
        element_id = element.get('id', '')
        element_class = ' '.join(element.get('class', []))
        if (content_patterns.search(element_id) or 
            content_patterns.search(element_class)):
            return element
    
    # Fallback to body
    body = soup.body
    if body:
        return body
    
    # Ultimate fallback
    return soup


def _extract_content_blocks(element: Tag) -> List[Tag]:
    """Extract content blocks from the HTML in order of appearance.
    
    Args:
        element: HTML element to extract blocks from
        
    Returns:
        List of block-level elements in order of appearance
    """
    blocks = []
    
    for child in element.children:
        if isinstance(child, NavigableString):
            # Skip empty strings
            if child.strip():
                # Wrap text nodes in a paragraph for processing
                p = BeautifulSoup(f"<p>{child}</p>", 'html.parser').p
                blocks.append(p)
                
        elif isinstance(child, Tag):
            if child.name in BLOCK_TAGS:
                blocks.append(child)
            elif child.name not in {"script", "style", "meta", "link", "noscript"}:
                # Recursively extract blocks from non-block elements
                nested_blocks = _extract_content_blocks(child)
                blocks.extend(nested_blocks)
    
    return blocks


def _organize_hierarchically(blocks: List[Tag], preserve_styles: bool) -> List[ContentItem]:
    """Organize content blocks into a hierarchical structure.
    
    Args:
        blocks: List of block-level elements
        preserve_styles: Whether to preserve HTML style tags
        
    Returns:
        List of structured content items organized hierarchically
    """
    from web2json.core.extractors.base import get_element_text
    from web2json.core.extractors.list_extractor import extract_list_items
    from web2json.core.extractors.code_extractor import extract_code_block
    
    # Result will contain top-level content items
    result = []
    
    # Section stack tracks the current hierarchy of sections
    # Each item is a tuple of (section object, heading level)
    section_stack = []
    
    for block in blocks:
        try:
            # Handle different block types
            if block.name in {"h1", "h2", "h3", "h4", "h5", "h6"}:
                # Extract heading level (1-6)
                level = int(block.name[1])
                
                # Create heading content
                heading = HeadingContent(
                    type="heading",
                    level=level,
                    text=get_element_text(block, preserve_styles)
                )
                
                # Create section with this heading
                section = SectionContent(
                    type="section",
                    level=level,
                    content=[]
                )
                
                # Pop sections from stack until we find a parent section
                while section_stack and section_stack[-1][1] >= level:
                    section_stack.pop()
                
                # Add section to the appropriate parent or to the result
                if section_stack:
                    parent_section, _ = section_stack[-1]
                    parent_section.content.append(section)
                else:
                    result.append(section)
                
                # Add the heading as the first item in the section
                section.content.append(heading)
                
                # Push the new section onto the stack
                section_stack.append((section, level))
                
            elif block.name == "p":
                paragraph = ParagraphContent(
                    type="paragraph",
                    text=get_element_text(block, preserve_styles)
                )
                
                # Add paragraph to the current section or to the result
                if section_stack:
                    section_stack[-1][0].content.append(paragraph)
                else:
                    result.append(paragraph)
                    
            elif block.name in {"ul", "ol"}:
                list_type = "ordered" if block.name == "ol" else "unordered"
                list_content = ListContent(
                    type="list",
                    list_type=list_type,
                    items=extract_list_items(block, preserve_styles)
                )
                
                # Add list to the current section or to the result
                if section_stack:
                    section_stack[-1][0].content.append(list_content)
                else:
                    result.append(list_content)
                    
            elif block.name == "blockquote":
                blockquote = BlockquoteContent(
                    type="blockquote",
                    text=get_element_text(block, preserve_styles)
                )
                
                # Add blockquote to the current section or to the result
                if section_stack:
                    section_stack[-1][0].content.append(blockquote)
                else:
                    result.append(blockquote)
                    
            elif block.name == "pre" or (block.name == "div" and block.find("pre")):
                # Handle code blocks with special care
                code_content = extract_code_block(block, preserve_styles)
                
                # Add code block to the current section or to the result
                if section_stack:
                    section_stack[-1][0].content.append(code_content)
                else:
                    result.append(code_content)
            
            elif block.name == "table":
                # Handle tables
                from web2json.core.extractors.table_extractor import extract_table, is_data_table
                
                # Only process data tables, not layout tables
                if is_data_table(block):
                    table_content = extract_table(block, preserve_styles)
                    
                    if table_content:
                        # Add table to the current section or to the result
                        if section_stack:
                            section_stack[-1][0].content.append(table_content)
                        else:
                            result.append(table_content)
            
            # Additional content types can be handled here
            
        except Exception as e:
            logging.warning(f"Error processing block {block.name}: {str(e)}")
            # Continue processing other blocks
    
    return result


def extract_hierarchical_headings(soup: BeautifulSoup, preserve_styles: bool = False) -> Dict[str, Any]:
    """Extract headings and organize them into a hierarchical structure.
    
    This creates a tree of headings showing the document outline.
    
    Args:
        soup: BeautifulSoup object representing the parsed HTML
        preserve_styles: Whether to preserve HTML style tags
        
    Returns:
        Dictionary with hierarchical heading structure
    """
    from web2json.core.extractors.base import get_element_text
    
    # Initialize the root node
    root = {
        "title": _get_document_title(soup),
        "children": []
    }
    
    # Find all headings
    headings = soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"])
    
    # Current path in the heading hierarchy
    path = [root]
    
    # Process headings in document order
    for heading in headings:
        level = int(heading.name[1])
        text = get_element_text(heading, preserve_styles)
        
        # Create a heading node
        node = {
            "level": level,
            "text": text,
            "children": []
        }
        
        # Find appropriate parent
        while len(path) > 1 and path[-1]["level"] >= level:
            path.pop()
        
        # Add as child to parent
        path[-1]["children"].append(node)
        
        # Add to path
        path.append(node)
    
    return root


def _get_document_title(soup: BeautifulSoup) -> str:
    """Extract the document title.
    
    Args:
        soup: BeautifulSoup object
        
    Returns:
        Document title
    """
    # Try title tag
    title_tag = soup.find("title")
    if title_tag:
        return title_tag.get_text(strip=True)
    
    # Try first h1
    h1 = soup.find("h1")
    if h1:
        return h1.get_text(strip=True)
    
    # Default
    return "Untitled Document"