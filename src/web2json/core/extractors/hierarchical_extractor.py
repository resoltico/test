"""
Hierarchical extractor module for web2json.

This module provides functionality for extracting content in a hierarchical structure
that reflects the document's semantic organization.
"""
import logging
import re
from typing import List, Dict, Any, Optional, Tuple, Set, Union
from collections import defaultdict

from bs4 import BeautifulSoup, Tag, NavigableString

from web2json.models.content import (
    ContentItem, HeadingContent, ParagraphContent, 
    ListContent, BlockquoteContent, SectionContent,
    CodeContent, TableContent
)
from web2json.utils.errors import ExtractError

# Import other extractors
from web2json.core.extractors.table_extractor import extract_table, is_data_table
from web2json.core.extractors.base import get_element_text
from web2json.core.extractors.list_extractor import extract_list_items
from web2json.core.extractors.code_extractor import extract_code_block

# Tags that are likely to be structural containers for content
CONTENT_CONTAINERS = {
    "article", "main", "div", "section", "content", "post", "entry", 
    "blog-post", "page-content", "post-content", "entry-content", "article-content",
    "body-content", "page-body", "prose", "markdown", "md-content", "site-content"
}

# Tags that are likely to be structural elements
STRUCTURAL_TAGS = {
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "blockquote", "pre", "ul", "ol", "dl", "table",
    "article", "section", "main"
}

# Tags to exclude as they likely contain navigation, ads, etc.
EXCLUDE_TAGS = {
    "nav", "header", "footer", "aside", "sidebar", "advertisement", "menu",
    "banner", "ad", "widget", "comment", "comments", "related", "share",
    "social", "toolbar", "navigation", "breadcrumb", "pagination", "search"
}

# Minimum text length for a node to be considered content
MIN_TEXT_LENGTH = 30
MIN_PARAGRAPH_LENGTH = 20

# Class name patterns that indicate main content
CONTENT_CLASS_PATTERNS = [
    r'(^|\s)(article|blog|post|entry|content|main|body|text|page)(\s|$)',
    r'(^|\s)(prose|markdown|md|doc|document|story|narrative)(\s|$)',
    r'(^|\s)(sl-markdown-content)(\s|$)',
]

# Class/ID name patterns that indicate non-content areas
NON_CONTENT_PATTERNS = [
    r'(^|\s)(sidebar|widget|banner|ad|advertisement|promo|popup)(\s|$)',
    r'(^|\s)(menu|nav|footer|header|copyright|social|share|toolbar)(\s|$)',
    r'(^|\s)(comment|related|recommended|popular|trending)(\s|$)'
]


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
        # First, try to get the main content area
        content_elements = find_main_content_elements(soup)
        logger.debug(f"Found {len(content_elements)} potential content elements")
        
        if not content_elements:
            logger.warning("Could not identify main content elements, falling back to whole document")
            content_elements = [soup.body or soup]
        
        # Filter for elements with substantial textual content
        content_elements = [element for element in content_elements 
                           if get_content_text_length(element) > MIN_TEXT_LENGTH]
        
        # Get the element with the highest content score
        scored_elements = [(element, score_content_element(element)) for element in content_elements]
        scored_elements.sort(key=lambda x: x[1], reverse=True)
        
        # Process the top content elements until we have substantial content
        processed_blocks = []
        processed_fingerprints = set()
        content_sufficient = False
        
        for element, score in scored_elements:
            logger.debug(f"Processing content element with score {score}")
            
            # Extract blocks from this element
            blocks = extract_content_blocks(element)
            
            # Deduplicate blocks
            filtered_blocks = []
            for block in blocks:
                fingerprint = create_content_fingerprint(block)
                if fingerprint and fingerprint not in processed_fingerprints:
                    processed_fingerprints.add(fingerprint)
                    filtered_blocks.append(block)
            
            processed_blocks.extend(filtered_blocks)
            
            # Check if we now have sufficient content
            total_text = sum(len(get_element_text(block)) for block in processed_blocks)
            if total_text > 500 and len(processed_blocks) > 5:
                content_sufficient = True
                break
        
        # If still no substantial content, try aggressive extraction
        if not content_sufficient:
            logger.warning("Insufficient content found, trying aggressive extraction")
            aggressive_blocks = extract_content_aggressively(soup)
            
            # Deduplicate these blocks as well
            for block in aggressive_blocks:
                fingerprint = create_content_fingerprint(block)
                if fingerprint and fingerprint not in processed_fingerprints:
                    processed_fingerprints.add(fingerprint)
                    processed_blocks.append(block)
        
        # Sort blocks to maintain document order
        processed_blocks = sort_blocks_by_position(processed_blocks)
        
        # Organize content into hierarchical structure
        hierarchical_content = organize_hierarchically(processed_blocks, preserve_styles)
        
        logger.info(f"Extracted {len(hierarchical_content)} top-level content items")
        return hierarchical_content
        
    except Exception as e:
        logger.error(f"Error extracting hierarchical content: {str(e)}")
        raise ExtractError(f"Failed to extract hierarchical content: {str(e)}")


def find_main_content_elements(soup: BeautifulSoup) -> List[Tag]:
    """Find elements likely to contain the main content.
    
    This function uses multiple strategies to identify content containers:
    1. Common HTML5 semantic elements
    2. Elements with content-related class/id names
    3. Elements with high text-to-tag ratios
    4. Content containers specific to common frameworks/CMS
    
    Args:
        soup: BeautifulSoup object
        
    Returns:
        List of elements likely to contain main content
    """
    potential_elements = []
    
    # Strategy 1: Look for semantic HTML5 elements
    semantic_elements = soup.find_all(['article', 'main', 'section'])
    potential_elements.extend(semantic_elements)
    
    # Strategy 2: Look for elements with content-related classes
    # First compile all patterns
    compiled_patterns = [re.compile(pattern, re.IGNORECASE) for pattern in CONTENT_CLASS_PATTERNS]
    
    for element in soup.find_all(True):
        # Skip elements that are already in our list
        if element in potential_elements:
            continue
            
        # Check class attribute
        if element.get('class'):
            class_str = ' '.join(element.get('class', []))
            for pattern in compiled_patterns:
                if pattern.search(class_str):
                    potential_elements.append(element)
                    break
        
        # Check id attribute
        if element.get('id'):
            id_str = element.get('id', '')
            for pattern in compiled_patterns:
                if pattern.search(id_str):
                    potential_elements.append(element)
                    break
    
    # Strategy 3: Look for specific content containers used by common frameworks
    # Starlight framework
    starlight_content = soup.select('.sl-markdown-content, .prose')
    potential_elements.extend(starlight_content)
    
    # WordPress and other common CMS
    cms_content = soup.select('.entry-content, .post-content, .article-body, .content-area')
    potential_elements.extend(cms_content)
    
    # Medium-like platforms
    medium_content = soup.select('article section, [role="article"]')
    potential_elements.extend(medium_content)
    
    # Documentation sites
    docs_content = soup.select('.documentation, .docs-content, .markdown-body')
    potential_elements.extend(docs_content)
    
    # Strategy 4: Analyze text-to-tag ratio for generic <div> elements
    for div in soup.find_all('div'):
        # Skip small divs and already processed divs
        if div in potential_elements or len(div.get_text(strip=True)) < 200:
            continue
            
        # Calculate text-to-tag ratio
        text_length = len(div.get_text(strip=True))
        tags_count = len(div.find_all(True))
        
        if tags_count > 0:
            ratio = text_length / tags_count
            # High ratio indicates content-heavy element
            if ratio > 10:
                potential_elements.append(div)
    
    # Remove duplicates while preserving order
    seen = set()
    unique_elements = []
    for element in potential_elements:
        element_id = id(element)
        if element_id not in seen:
            seen.add(element_id)
            unique_elements.append(element)
    
    return unique_elements


def score_content_element(element: Tag) -> float:
    """Calculate a relevance score for a content element.
    
    Higher scores indicate better content candidates.
    
    Args:
        element: Element to score
        
    Returns:
        Relevance score
    """
    score = 0.0
    
    # Get text content
    text_content = element.get_text(strip=True)
    text_length = len(text_content)
    
    # Base score on text length
    score += min(text_length / 100, 10)  # Cap at 10 points
    
    # Bonus for semantic elements
    if element.name in ['article', 'main', 'section']:
        score += 5
    
    # Bonus for content-related class names
    if element.get('class'):
        class_str = ' '.join(element.get('class', []))
        for pattern in CONTENT_CLASS_PATTERNS:
            if re.search(pattern, class_str, re.IGNORECASE):
                score += 3
                break
    
    # Bonus for content-related id
    if element.get('id'):
        id_str = element.get('id')
        for pattern in CONTENT_CLASS_PATTERNS:
            if re.search(pattern, id_str, re.IGNORECASE):
                score += 3
                break
    
    # Penalty for likely non-content areas
    for pattern in NON_CONTENT_PATTERNS:
        class_str = ' '.join(element.get('class', []))
        id_str = element.get('id', '')
        
        if re.search(pattern, class_str, re.IGNORECASE) or re.search(pattern, id_str, re.IGNORECASE):
            score -= 5
    
    # Bonus for heading elements
    score += len(element.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])) * 2
    
    # Bonus for paragraph density
    paragraphs = element.find_all('p')
    if len(paragraphs) > 0:
        # Calculate average paragraph length
        p_text_length = sum(len(p.get_text(strip=True)) for p in paragraphs)
        avg_p_length = p_text_length / len(paragraphs) if len(paragraphs) > 0 else 0
        
        # Bonus for reasonable paragraph length (suggesting real content)
        if avg_p_length > 40:
            score += 3
        
        # Bonus for multiple paragraphs
        score += min(len(paragraphs) / 2, 5)  # Cap at 5 points
    
    # Bonus for presence of lists, blockquotes, and other content elements
    score += len(element.find_all(['ul', 'ol', 'blockquote', 'pre', 'code', 'table'])) * 1.5
    
    # Penalty for too many links (possibly navigation)
    links = element.find_all('a')
    if links:
        link_text = sum(len(a.get_text(strip=True)) for a in links)
        link_ratio = link_text / text_length if text_length > 0 else 1
        
        if link_ratio > 0.5:  # More than half the text is in links
            score -= 4
    
    return max(score, 0)  # Ensure score is not negative


def get_content_text_length(element: Tag) -> int:
    """Get the total text length of an element, excluding scripts, styles, etc.
    
    Args:
        element: Element to analyze
        
    Returns:
        Text length in characters
    """
    # Clone the element to avoid modifying the original
    elem_copy = element
    
    # Remove script, style tags from the copy
    for tag in elem_copy.find_all(['script', 'style', 'noscript']):
        tag.decompose()
    
    return len(elem_copy.get_text(strip=True))


def create_content_fingerprint(element: Tag) -> Optional[str]:
    """Create a fingerprint for an element to detect duplicates.
    
    Args:
        element: Element to fingerprint
        
    Returns:
        Fingerprint string or None if element is too small
    """
    # Ignore tiny elements
    text = element.get_text(strip=True)
    if len(text) < 15:
        return None
    
    # Create fingerprint from element name, class, and text
    element_type = element.name
    
    # Get first and last 20 chars of text for the fingerprint
    text_start = text[:20].strip()
    text_end = text[-20:].strip() if len(text) > 40 else ""
    
    # Include tag name and some text in fingerprint
    fingerprint = f"{element_type}:{text_start}:{text_end}"
    
    return fingerprint


def extract_content_blocks(element: Tag) -> List[Tag]:
    """Extract content blocks from an element, focusing on structural elements.
    
    Args:
        element: Element to extract blocks from
        
    Returns:
        List of block-level elements
    """
    blocks = []
    
    # Process direct block-level children
    for child in element.children:
        if isinstance(child, NavigableString):
            # Skip empty strings
            if not child.strip():
                continue
                
            # Wrap text nodes in a paragraph if they're substantial
            if len(child.strip()) > MIN_PARAGRAPH_LENGTH:
                p = BeautifulSoup(f"<p>{child}</p>", 'html.parser').p
                blocks.append(p)
                
        elif isinstance(child, Tag):
            if child.name in STRUCTURAL_TAGS:
                # Skip elements that might be non-content
                if is_likely_non_content(child):
                    continue
                
                blocks.append(child)
            elif child.name not in ['script', 'style', 'meta', 'link', 'noscript', 'svg', 'button', 'input']:
                # Recursively extract blocks from container elements
                nested_blocks = extract_content_blocks(child)
                blocks.extend(nested_blocks)
    
    # If we didn't find blocks directly, look deeper
    if not blocks:
        # Look for direct structural elements anywhere in the subtree
        for structural in element.find_all(STRUCTURAL_TAGS):
            # Skip elements already processed
            if any(structural is block or structural in block for block in blocks):
                continue
                
            # Skip tiny elements and likely non-content
            if len(structural.get_text(strip=True)) < MIN_TEXT_LENGTH and structural.name not in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                continue
                
            if is_likely_non_content(structural):
                continue
                
            blocks.append(structural)
    
    return blocks


def is_likely_non_content(element: Tag) -> bool:
    """Check if an element is likely to be navigation, footer, etc. rather than content.
    
    Args:
        element: Element to check
        
    Returns:
        True if likely non-content
    """
    # Check element name
    if element.name in ['nav', 'footer', 'header']:
        return True
    
    # Check class and id attributes
    for attr in ['class', 'id']:
        if element.get(attr):
            attr_value = ' '.join(element.get(attr)) if isinstance(element.get(attr), list) else element.get(attr)
            
            # Check against non-content patterns
            for pattern in NON_CONTENT_PATTERNS:
                if re.search(pattern, attr_value, re.IGNORECASE):
                    return True
                    
    # Check role attribute
    if element.get('role') in ['navigation', 'banner', 'contentinfo']:
        return True
        
    return False


def sort_blocks_by_position(blocks: List[Tag]) -> List[Tag]:
    """Sort blocks by their position in the document.
    
    Args:
        blocks: List of blocks to sort
        
    Returns:
        Sorted list of blocks
    """
    # Create position index for each block
    def get_position(element):
        # Start at 0
        position = 0
        
        # For each previous sibling, increment position
        for sibling in element.previous_siblings:
            position += 1
        
        # Also consider parent positions to ensure different subtrees maintain order
        parent = element.parent
        parent_multiplier = 1000  # Higher than typical sibling count
        
        while parent:
            parent_position = 0
            for parent_sibling in parent.previous_siblings:
                parent_position += 1
            
            position += parent_position * parent_multiplier
            parent = parent.parent
            parent_multiplier *= 1000  # Increase multiplier for higher level parents
        
        return position
    
    # Get position for each block and sort
    return sorted(blocks, key=get_position)


def extract_content_aggressively(soup: BeautifulSoup) -> List[Tag]:
    """Extract content aggressively, finding any potential content elements.
    
    Args:
        soup: BeautifulSoup object
        
    Returns:
        List of potential content elements
    """
    blocks = []
    
    # Look for headings with content
    for heading in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
        # Skip tiny headings
        if len(heading.get_text(strip=True)) < 10:
            continue
        
        # Skip headings in non-content areas
        if is_likely_non_content(heading):
            continue
            
        blocks.append(heading)
        
        # Look for content following headings
        for sibling in heading.next_siblings:
            if isinstance(sibling, Tag):
                if sibling.name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                    # Stop at the next heading
                    break
                    
                if sibling.name in ['p', 'ul', 'ol', 'blockquote', 'pre']:
                    blocks.append(sibling)
    
    # Look for substantial paragraphs
    for p in soup.find_all('p'):
        # Skip tiny paragraphs
        if len(p.get_text(strip=True)) < MIN_PARAGRAPH_LENGTH:
            continue
            
        # Skip paragraphs in non-content areas
        if is_likely_non_content(p):
            continue
            
        blocks.append(p)
    
    # Look for lists with substantial content
    for lst in soup.find_all(['ul', 'ol']):
        # Skip empty lists
        if not lst.find_all('li'):
            continue
            
        # Skip lists in non-content areas
        if is_likely_non_content(lst):
            continue
            
        blocks.append(lst)
    
    # Look for code blocks
    for pre in soup.find_all(['pre', 'code']):
        # Skip tiny code blocks
        if len(pre.get_text(strip=True)) < 10:
            continue
        
        blocks.append(pre)
    
    # Look for tables
    for table in soup.find_all('table'):
        if is_data_table(table) and not is_likely_non_content(table):
            blocks.append(table)
    
    return blocks


def organize_hierarchically(blocks: List[Tag], preserve_styles: bool) -> List[ContentItem]:
    """Organize content blocks into a hierarchical structure.
    
    Args:
        blocks: List of content blocks
        preserve_styles: Whether to preserve HTML styles
        
    Returns:
        List of organized content items
    """
    # Initialize result to hold top-level content items
    result = []
    
    # Store processed content fingerprints to prevent duplicates
    processed = set()
    
    # Track sections by level
    sections_stack = []  # Stack of (section object, heading level)
    
    # Process each block in order
    for block in blocks:
        try:
            # Create a fingerprint for deduplication
            fingerprint = create_content_fingerprint(block)
            if fingerprint and fingerprint in processed:
                continue
            
            # Mark as processed
            if fingerprint:
                processed.add(fingerprint)
            
            # Handle different block types
            if block.name in ["h1", "h2", "h3", "h4", "h5", "h6"]:
                # Extract heading level (1-6)
                level = int(block.name[1])
                
                # Create heading content
                heading = HeadingContent(
                    type="heading",
                    level=level,
                    text=get_element_text(block, preserve_styles)
                )
                
                # Create a new section with this heading
                section = SectionContent(
                    type="section",
                    level=level,
                    content=[]
                )
                
                # Close any sections that are lower in hierarchy
                while sections_stack and sections_stack[-1][1] >= level:
                    sections_stack.pop()
                
                # Add this section to its parent (or to result if no parent)
                if sections_stack:
                    parent_section = sections_stack[-1][0]
                    parent_section.content.append(section)
                else:
                    result.append(section)
                
                # Add the heading as first item in section
                section.content.append(heading)
                
                # Add this section to the stack
                sections_stack.append((section, level))
                
            elif block.name == "p":
                # Create paragraph content
                text = get_element_text(block, preserve_styles)
                
                # Skip empty paragraphs
                if not text.strip():
                    continue
                    
                # Create paragraph item
                paragraph = ParagraphContent(
                    type="paragraph",
                    text=text
                )
                
                # Add to current section or result
                if sections_stack:
                    sections_stack[-1][0].content.append(paragraph)
                else:
                    result.append(paragraph)
                    
            elif block.name in ["ul", "ol"]:
                # Create list content
                list_type = "ordered" if block.name == "ol" else "unordered"
                list_content = ListContent(
                    type="list",
                    list_type=list_type,
                    items=extract_list_items(block, preserve_styles)
                )
                
                # Add to current section or result
                if sections_stack:
                    sections_stack[-1][0].content.append(list_content)
                else:
                    result.append(list_content)
                    
            elif block.name == "blockquote":
                # Create blockquote content
                blockquote = BlockquoteContent(
                    type="blockquote",
                    text=get_element_text(block, preserve_styles)
                )
                
                # Add to current section or result
                if sections_stack:
                    sections_stack[-1][0].content.append(blockquote)
                else:
                    result.append(blockquote)
                    
            elif block.name == "pre" or (block.name == "div" and block.find("pre")):
                # Create code content
                from web2json.core.extractors.code_extractor import extract_code_block
                
                # Extract code block as a CodeContent object
                code_content = extract_code_block(block, preserve_styles)
                
                # Add to current section or result
                if sections_stack:
                    sections_stack[-1][0].content.append(code_content)
                else:
                    result.append(code_content)
                    
            elif block.name == "table":
                # Only process actual data tables
                if is_data_table(block):
                    table_content = extract_table(block, preserve_styles)
                    
                    # Add to current section or result
                    if table_content:
                        if sections_stack:
                            sections_stack[-1][0].content.append(table_content)
                        else:
                            result.append(table_content)
                            
        except Exception as e:
            logging.warning(f"Error processing block {block.name}: {str(e)}")
            # Continue with other blocks
    
    # If no organized content (no headings found), just return as flat list
    if not result and blocks:
        # Try a simple extraction of all blocks
        for block in blocks:
            try:
                if block.name == "p":
                    text = get_element_text(block, preserve_styles)
                    if text.strip():
                        result.append(ParagraphContent(type="paragraph", text=text))
                        
                elif block.name in ["ul", "ol"]:
                    list_type = "ordered" if block.name == "ol" else "unordered"
                    result.append(ListContent(
                        type="list",
                        list_type=list_type,
                        items=extract_list_items(block, preserve_styles)
                    ))
                    
                elif block.name in ["h1", "h2", "h3", "h4", "h5", "h6"]:
                    level = int(block.name[1])
                    result.append(HeadingContent(
                        type="heading",
                        level=level,
                        text=get_element_text(block, preserve_styles)
                    ))
                    
                elif block.name == "blockquote":
                    result.append(BlockquoteContent(
                        type="blockquote",
                        text=get_element_text(block, preserve_styles)
                    ))
                    
                elif block.name == "pre" or block.find("pre"):
                    # Extract as a CodeContent object
                    code_content = extract_code_block(block, preserve_styles)
                    result.append(code_content)
                    
                elif block.name == "table" and is_data_table(block):
                    table_content = extract_table(block, preserve_styles)
                    if table_content:
                        result.append(table_content)
                        
            except Exception as e:
                logging.warning(f"Error in flat extraction: {str(e)}")
    
    return result
