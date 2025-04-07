import { decode } from 'html-entities';
import { JSDOM } from 'jsdom';
import { logger } from './logger.js';
import sanitizeHtml from 'sanitize-html';

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
 * Check if an element is a container (section, article, aside)
 */
export function isContainer(element: Element): boolean {
  const tag = element.tagName.toLowerCase();
  return ['section', 'article', 'aside', 'div', 'main'].includes(tag);
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
    allowedTags: [
      'strong', 'em', 'b', 'i', 'u', 's', 'code', 'pre', 'a', 'br', 
      'p', 'div', 'span', 'mark', 'sub', 'sup', 'small', 'abbr', 
      'time', 'var', 'samp', 'kbd', 'q', 'cite', 'dfn', 'wbr',
      'ruby', 'rt', 'bdo', 'bdi'
    ],
    allowedAttributes: {
      'a': ['href', 'target', 'rel'],
      'abbr': ['title'],
      'time': ['datetime'],
      'bdo': ['dir'],
      '*': ['class', 'id', 'data-*']
    }
  });
}
