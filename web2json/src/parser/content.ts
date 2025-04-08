import { normalizeHtmlContent } from '../utils/html.js';

// Define DOM Node constants since Node is not globally available in Node.js
const DOCUMENT_POSITION_FOLLOWING = 4; // Same as Node.DOCUMENT_POSITION_FOLLOWING in browsers
const DOCUMENT_POSITION_PRECEDING = 2; // Same as Node.DOCUMENT_POSITION_PRECEDING in browsers

/**
 * Get content elements between the heading and the next heading or section
 */
export function getContentElements(container: Element, heading: Element | null): Element[] {
  // Get paragraphs that are direct children of the container
  const paragraphs = Array.from(container.querySelectorAll(':scope > p'));
  
  // If no heading, return all paragraphs
  if (!heading) {
    return paragraphs;
  }
  
  // Otherwise, find paragraphs that come after the heading
  // and before the next heading or section
  return paragraphs.filter(p => {
    // Check if the paragraph is after the heading
    let currentNode: Node | null = p;
    while (currentNode) {
      if (currentNode === heading) {
        return false; // The heading comes after this paragraph
      }
      currentNode = currentNode.previousSibling;
    }
    
    // Check if there's a heading between our heading and this paragraph
    const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    for (const h of headings) {
      if (h === heading) continue;
      
      // Check if this heading is between our heading and the paragraph
      let beforeParagraph = false;
      let afterHeading = false;
      
      currentNode = h;
      while (currentNode) {
        if (currentNode === p) {
          beforeParagraph = true;
          break;
        }
        currentNode = currentNode.nextSibling;
      }
      
      currentNode = h;
      while (currentNode) {
        if (currentNode === heading) {
          afterHeading = true;
          break;
        }
        currentNode = currentNode.previousSibling;
      }
      
      if (beforeParagraph && afterHeading) {
        return false; // There's a heading between our heading and this paragraph
      }
    }
    
    return true; // This paragraph is valid content for our section
  });
}

/**
 * Get all content elements between an element and the next element of the same type
 * or until a certain element is reached
 */
export function getContentUntilNextSibling(
  startElement: Element,
  endElement: Element | null,
  container: Element
): Element[] {
  const result: Element[] = [];
  let current = startElement.nextElementSibling;
  
  while (current) {
    // Stop if we've reached the end element
    if (endElement && current === endElement) {
      break;
    }
    
    // Stop if we've reached another element of the same type as the start element
    if (current.tagName === startElement.tagName) {
      break;
    }
    
    // Add the element if it's a direct child of the container
    if (current.parentElement === container) {
      result.push(current);
    }
    
    current = current.nextElementSibling;
  }
  
  return result;
}

/**
 * Create a section for general content
 */
export function createContentSection(container: Element, getIdFunction: (element: Element, prefix: string) => string): any {
  const id = getIdFunction(container, 'content');
  
  // Extract paragraphs
  const paragraphs = Array.from(container.querySelectorAll('p'));
  const content = paragraphs.map(p => normalizeHtmlContent(p.innerHTML));
  
  // Create section
  return {
    type: 'section',
    id,
    content,
    children: []
  };
}