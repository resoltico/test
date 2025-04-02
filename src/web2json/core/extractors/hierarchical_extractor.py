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

# Fix: Import table extractor functions at the module level instead of inside functions
from web2json.core.extractors.table_extractor import extract_table, is_data_table
from web2json.core.extractors.base import get_element_text
from web2json.core.extractors.list_extractor import extract_list_items
from web2json.core.extractors.code_extractor import extract_code_block

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

# Additional tags likely to contain content
CONTENT_TAGS = {"div", "span", "section", "article", "main"}


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
        logger.debug(f"Main content found: {main_content.name} with {len(main_content.contents)} children")
        
        # Flatten and normalize the document structure
        blocks = _extract_content_blocks(main_content)
        logger.debug(f"Extracted {len(blocks)} content blocks")
        
        # Create hierarchical structure
        hierarchical_content = _organize_hierarchically(blocks, preserve_styles)
        
        if not hierarchical_content:
            # If no content was found with the hierarchical approach, try a more aggressive approach
            logger.warning("No content found with standard approach, trying aggressive extraction")
            blocks = _extract_content_aggressively(soup)
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
    5. Additional specialized patterns for common website structures
    
    Args:
        soup: BeautifulSoup object representing the parsed HTML
        
    Returns:
        Tag representing the main content area
    """
    logger = logging.getLogger(__name__)
    
    # First, check for specific Airbnb selectors and other common content containers
    airbnb_selectors = [
        "div[data-section-id='DESCRIPTION']",
        "div[data-section-id='LISTING_DETAILS']",
        "div[data-testid='help-article-content']",
        "div._14i3z6h",  # Common Airbnb content class
        "div.help-content-area",
        "div.help-article-body",
        "div.article-body",
        "div._1d6n8q0",  # Another potential Airbnb class
        ".help-article", 
        ".article-content"
    ]
    
    for selector in airbnb_selectors:
        content = soup.select_one(selector)
        if content:
            logger.debug(f"Found Airbnb content using selector: {selector}")
            return content
    
    # Try to find main content area using common patterns
    main_selectors = [
        "main", 
        "article", 
        "div#content", "div.content", 
        "div#main", "div.main", 
        "div#article", "div.article",
        "div.page-content",
        "div.entry-content",
        "div.post-content",
        "div.article-content",
        "div.story-content",
        "section.content",
        "div.body-content",
        "[role='main']"
    ]
    
    for selector in main_selectors:
        content = soup.select_one(selector)
        if content:
            logger.debug(f"Found main content using selector: {selector}")
            return content
    
    # Try to find elements with content-related class or id
    content_patterns = re.compile(r'(content|main|article|entry|post|story|text|body)', re.IGNORECASE)
    for element in soup.find_all(['div', 'section', 'article']):
        element_id = element.get('id', '')
        element_class = ' '.join(element.get('class', []) if element.get('class') else [])
        if (content_patterns.search(element_id) or 
            content_patterns.search(element_class)):
            logger.debug(f"Found main content via pattern matching: {element.name}#{element_id}.{element_class}")
            return element
    
    # Look for the div with the most paragraph content
    p_counts = {}
    for div in soup.find_all('div'):
        # Count paragraphs and headings
        content_elements = div.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
        if content_elements:
            # Weigh by text length to favor divs with substantial content
            text_length = sum(len(el.get_text()) for el in content_elements)
            p_counts[div] = (len(content_elements), text_length)
    
    if p_counts:
        # Find div with most content elements, breaking ties with text length
        max_p_div = max(p_counts.items(), key=lambda x: (x[1][0], x[1][1]))
        if max_p_div[1][0] > 1:  # If there are multiple paragraphs/headings, it's likely content
            logger.debug(f"Found main content via content density: {max_p_div[1][0]} elements, {max_p_div[1][1]} chars")
            return max_p_div[0]
    
    # Fallback to body
    body = soup.body
    if body:
        logger.debug("Falling back to body tag for content")
        return body
    
    # Ultimate fallback
    logger.debug("No content containers found, using entire document")
    return soup


def _extract_content_blocks(element: Tag) -> List[Tag]:
    """Extract content blocks from the HTML in order of appearance.
    
    This function has been enhanced to better handle different HTML structures
    and identify potential content blocks even in complex layouts.
    
    Args:
        element: HTML element to extract blocks from
        
    Returns:
        List of block-level elements in order of appearance
    """
    logger = logging.getLogger(__name__)
    blocks = []
    
    # First, try to find dedicated content containers
    content_containers = element.select('.article-content, .page-content, .post-content, .help-article-content, .entry-content')
    if content_containers:
        logger.debug(f"Found {len(content_containers)} dedicated content containers")
        # Process each container
        for container in content_containers:
            for child in container.children:
                if isinstance(child, NavigableString):
                    if child.strip():
                        # Wrap text nodes in a paragraph for processing
                        p = BeautifulSoup(f"<p>{child}</p>", 'html.parser').p
                        blocks.append(p)
                elif isinstance(child, Tag):
                    if child.name in BLOCK_TAGS:
                        blocks.append(child)
                    elif child.name not in {"script", "style", "meta", "link", "noscript", "svg", "button", "input"}:
                        # Recursively extract blocks from non-block elements
                        nested_blocks = _extract_content_blocks(child)
                        blocks.extend(nested_blocks)
    
    # If no dedicated containers or no blocks found, process the element directly
    if not blocks:
        for child in element.children:
            if isinstance(child, NavigableString):
                if child.strip():
                    p = BeautifulSoup(f"<p>{child}</p>", 'html.parser').p
                    blocks.append(p)
            elif isinstance(child, Tag):
                if child.name in BLOCK_TAGS:
                    blocks.append(child)
                elif child.name not in {"script", "style", "meta", "link", "noscript", "svg", "button", "input"}:
                    nested_blocks = _extract_content_blocks(child)
                    blocks.extend(nested_blocks)
    
    # Look specifically for common content elements
    if not blocks:
        for content_tag in element.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'blockquote', 'table']):
            if content_tag.name in BLOCK_TAGS and not _is_nested_in_blocks(content_tag, blocks):
                blocks.append(content_tag)
    
    return blocks


def _extract_content_aggressively(soup: BeautifulSoup) -> List[Tag]:
    """Extract content more aggressively when standard approaches fail.
    
    This is a fallback method that tries harder to find any possible content.
    
    Args:
        soup: BeautifulSoup object representing the parsed HTML
        
    Returns:
        List of potential content blocks
    """
    logger = logging.getLogger(__name__)
    blocks = []
    
    # Look for any paragraphs with substantial text
    for p in soup.find_all('p'):
        text = p.get_text().strip()
        if text and len(text) > 20:  # Only include paragraphs with reasonable content
            blocks.append(p)
    
    # Look for any headings
    for h in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
        if h.get_text().strip():
            blocks.append(h)
    
    # Look for lists
    for lst in soup.find_all(['ul', 'ol']):
        if lst.find_all('li'):  # Only include non-empty lists
            blocks.append(lst)
    
    # Look for tables
    for table in soup.find_all('table'):
        if is_data_table(table):
            blocks.append(table)
    
    # Look for any div that might contain text content
    for div in soup.find_all('div'):
        text = div.get_text().strip()
        # Check if this div contains a substantial paragraph-like text
        if text and len(text) > 100 and '.' in text and not any(tag in blocks for tag in div.find_all(True)):
            p = BeautifulSoup(f"<p>{text}</p>", 'html.parser').p
            blocks.append(p)
    
    # Remove duplicates while preserving order
    seen = set()
    unique_blocks = []
    for block in blocks:
        if id(block) not in seen:
            seen.add(id(block))
            unique_blocks.append(block)
    
    logger.debug(f"Aggressively extracted {len(unique_blocks)} content blocks")
    return unique_blocks


def _is_nested_in_blocks(element: Tag, blocks: List[Tag]) -> bool:
    """Check if an element is already nested inside any of the blocks.
    
    Args:
        element: Element to check
        blocks: List of blocks to check against
        
    Returns:
        True if element is nested inside any block, False otherwise
    """
    for block in blocks:
        if element in block.find_all(True):
            return True
    return False


def _organize_hierarchically(blocks: List[Tag], preserve_styles: bool) -> List[ContentItem]:
    """Organize content blocks into a hierarchical structure.
    
    Args:
        blocks: List of block-level elements
        preserve_styles: Whether to preserve HTML style tags
        
    Returns:
        List of structured content items organized hierarchically
    """
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
                # Extract paragraph text, skipping empty paragraphs
                text = get_element_text(block, preserve_styles)
                if text.strip():
                    paragraph = ParagraphContent(
                        type="paragraph",
                        text=text
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
