import { decode } from 'html-entities';
import { JSDOM } from 'jsdom';
import { logger } from './logger.js';
import sanitizeHtml from 'sanitize-html';

// Define DOM Node constants since Node is not globally available in Node.js
const DOCUMENT_POSITION_FOLLOWING = 4; // Same as Node.DOCUMENT_POSITION_FOLLOWING in browsers
const DOCUMENT_POSITION_PRECEDING = 2; // Same as Node.DOCUMENT_POSITION_PRECEDING in browsers

/**
 * Create a new JSDOM instance from HTML content
 */
export function createDOM(html: string): JSDOM {
  return new JSDOM(html, {
    includeNodeLocations: true,
    runScripts: 'outside-only'
  });
}

/**
 * Get the document title from the head element
 */
export function getDocumentTitle(document: Document): string {
  const titleElement = document.querySelector('title');
  return titleElement ? titleElement.textContent || '' : 'Untitled Document';
}

/**
 * Extract the inner HTML content of an element, preserving HTML formatting
 */
export function extractFormattedContent(element: Element): string {
  return element.innerHTML;
}

/**
 * Normalize HTML content while preserving important markup
 */
export function normalizeHtmlContent(html: string): string {
  if (!html) return '';
  
  // Basic cleanup of whitespace without affecting tags
  let normalized = html.trim()
    // Replace sequences of whitespace with a single space within text nodes
    .replace(/>\s+</g, '><') // Remove whitespace between tags
    .replace(/\s+/g, ' ');   // Normalize whitespace
    
  return normalized;
}

/**
 * Clean and normalize text content
 */
export function normalizeTextContent(text: string): string {
  if (!text) return '';
  
  // Decode HTML entities
  const decodedText = decode(text);
  
  // Normalize whitespace
  return decodedText.replace(/\s+/g, ' ').trim();
}

/**
 * Convert an Element to its HTML string representation
 */
export function elementToHtml(element: Element): string {
  return element.outerHTML;
}

/**
 * Check if an element is a heading (h1-h6)
 */
export function isHeading(element: Element): boolean {
  return /^H[1-6]$/i.test(element.tagName);
}

/**
 * Get the heading level (1-6) from a heading element
 */
export function getHeadingLevel(element: Element): number | null {
  if (!isHeading(element)) return null;
  return parseInt(element.tagName.substring(1), 10);
}

/**
 * Extract a title from a section or other container element
 */
export function getSectionTitle(element: Element): string | undefined {
  // First try to find a heading element
  const heading = element.querySelector('h1, h2, h3, h4, h5, h6');
  
  if (heading) {
    return normalizeHtmlContent(heading.innerHTML);
  }
  
  // Try other potential title elements
  const potentialTitleElements = [
    element.querySelector('header'),
    element.querySelector('caption'),
    element.querySelector('legend'),
    element.querySelector('strong'),
  ].filter(Boolean) as Element[];
  
  for (const titleElement of potentialTitleElements) {
    if (titleElement && titleElement.textContent) {
      return normalizeHtmlContent(titleElement.innerHTML);
    }
  }
  
  return undefined;
}

/**
 * Check if an element is a container (section, article, aside)
 */
export function isContainer(element: Element): boolean {
  const tag = element.tagName.toLowerCase();
  return ['section', 'article', 'aside', 'div', 'main'].includes(tag);
}

/**
 * Check if an element is block-level
 */
export function isBlockElement(element: Element): boolean {
  const blockElements = [
    'address', 'article', 'aside', 'blockquote', 'details', 'dialog', 'dd', 'div',
    'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2',
    'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'li', 'main', 'nav', 'ol',
    'p', 'pre', 'section', 'table', 'ul'
  ];
  
  return blockElements.includes(element.tagName.toLowerCase());
}

/**
 * Generate an ID for an element, using its existing ID or generating one
 */
export function getElementId(element: Element, prefix = 'section'): string {
  // Use existing ID if present
  if (element.id) {
    return element.id;
  }
  
  // Generate ID from heading content if present
  const heading = element.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading && heading.textContent) {
    return generateIdFromText(heading.textContent, prefix);
  }
  
  // Generate ID from element content
  if (element.textContent) {
    return generateIdFromText(element.textContent, prefix);
  }
  
  // Fallback to a random ID
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate an ID from text content
 */
function generateIdFromText(text: string, prefix: string): string {
  // Create a slug from the text
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '')     // Remove leading/trailing hyphens
    .substring(0, 40);           // Limit length
  
  // Combine prefix and slug
  return prefix && slug ? `${prefix}-${slug}` : slug || `${prefix}-${generateRandomId()}`;
}

/**
 * Generate a random ID string
 */
function generateRandomId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Sanitize HTML while preserving needed tags
 */
export function sanitizeContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'mark', 'abbr', 'time', 'var', 'samp', 'kbd', 'ruby', 'rt', 'bdo', 'bdi',
      'data', 'wbr', 'cite', 'dfn', 'sub', 'sup', 'small', 'code'
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      '*': ['id', 'class', 'data-*', 'dir', 'title'],
      'abbr': ['title'],
      'time': ['datetime'],
      'data': ['value'],
      'ruby': ['lang'],
      'bdo': ['dir']
    }
  });
}

/**
 * Extract all text content from an element, removing all HTML tags
 */
export function extractPlainText(element: Element): string {
  return element.textContent || '';
}

/**
 * Check if an element has visible content (not just whitespace)
 */
export function hasVisibleContent(element: Element): boolean {
  return !!element.textContent?.trim();
}

/**
 * Find all siblings of an element between it and the next heading or section
 */
export function getContentUntilNextHeadingOrSection(element: Element): Element[] {
  const result: Element[] = [];
  let current = element.nextElementSibling;
  
  while (current && !isHeading(current) && 
         !['SECTION', 'ARTICLE', 'ASIDE'].includes(current.tagName)) {
    result.push(current);
    current = current.nextElementSibling;
  }
  
  return result;
}

/**
 * Check if an element is nested inside another element type
 */
export function isNestedIn(element: Element, parentType: string): boolean {
  return !!element.closest(parentType);
}

/**
 * Find the most appropriate container for an element
 */
export function findContainingSection(element: Element): Element | null {
  // Try to find containing section, article, or aside
  const container = element.closest('section, article, aside');
  
  if (container) {
    return container;
  }
  
  // If no structural container, try to find closest div with significant content
  const div = element.closest('div');
  
  // Check if div contains headings or other significant elements
  if (div && (div.querySelector('h1, h2, h3, h4, h5, h6') || 
              div.querySelector('section, article, aside'))) {
    return div;
  }
  
  return null;
}
