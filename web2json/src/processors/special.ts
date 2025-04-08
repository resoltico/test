import { logger } from '../utils/logger.js';
import { normalizeTextContent, normalizeHtmlContent } from '../utils/html.js';
import { SearchContent, FooterContent } from '../schema/document.js';

/**
 * Process a search element
 */
export function processSearch(searchElement: Element): SearchContent {
  logger.debug('Processing search element');
  
  // Preserve the entire HTML content of the search element
  const content = normalizeHtmlContent(searchElement.innerHTML);
  
  return {
    type: 'search',
    content,
    children: []
  };
}

/**
 * Process header or footer elements
 */
export function processHeaderFooter(element: Element, type: 'header' | 'footer'): FooterContent | null {
  if (!element) return null;
  
  logger.debug(`Processing ${type} element`);
  
  // Extract direct child elements and preserve their HTML
  const childElements = Array.from(element.children);
  
  // Skip if no child elements
  if (childElements.length === 0) {
    return null;
  }
  
  // Preserve the HTML content of each child
  const content = childElements.map(el => normalizeHtmlContent(el.outerHTML));
  
  return {
    type: type as 'footer', // TypeScript cast for type safety
    content,
    children: []
  };
}