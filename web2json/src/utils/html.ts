import sanitizeHtml from 'sanitize-html';
import { decode } from 'html-entities';
import { JSDOM } from 'jsdom';

/**
 * Normalizes text content from HTML elements by trimming and preserving basic formatting
 */
export function normalizeTextContent(text: string): string {
  if (!text) return '';
  
  // Decode HTML entities
  const decodedText = decode(text);
  
  // Normalize whitespace
  return decodedText
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts the inner HTML content while preserving formatting tags
 */
export function extractFormattedContent(element: Element): string {
  // Allow specific HTML5 formatting tags
  const allowedTags = [
    'strong', 'b', 'em', 'i', 'u', 's', 'code', 'var', 'samp', 'kbd', 
    'mark', 'q', 'small', 'sub', 'sup', 'dfn', 'abbr', 'time', 'wbr',
    'ruby', 'rt', 'bdi', 'bdo', 'cite', 'span', 'a'
  ];
  
  // Allow specific attributes that provide semantic meaning
  const allowedAttributes = {
    'abbr': ['title'],
    'time': ['datetime'],
    'bdo': ['dir'],
    'a': ['href', 'target'],
    'data': ['value'],
    '*': ['class']
  };
  
  // Sanitize the HTML to keep only allowed elements and attributes
  const sanitized = sanitizeHtml(element.innerHTML, {
    allowedTags,
    allowedAttributes
  });
  
  return sanitized;
}

/**
 * Checks if the element is a heading (h1-h6)
 */
export function isHeading(element: Element): boolean {
  return /^H[1-6]$/i.test(element.tagName);
}

/**
 * Gets the heading level (1-6) from a heading element
 */
export function getHeadingLevel(element: Element): number | null {
  if (!isHeading(element)) return null;
  return parseInt(element.tagName.substring(1), 10);
}

/**
 * Creates a JSDOM instance with the provided HTML
 */
export function createDOM(html: string): JSDOM {
  return new JSDOM(html, {
    includeNodeLocations: true,
    runScripts: 'outside-only'
  });
}

/**
 * Gets document title from the HTML
 */
export function getDocumentTitle(document: Document): string {
  const titleElement = document.querySelector('title');
  return titleElement ? normalizeTextContent(titleElement.textContent || '') : 'Untitled Document';
}

/**
 * Determines if an element is a section container
 */
export function isSectionContainer(element: Element): boolean {
  return ['SECTION', 'ARTICLE', 'ASIDE', 'DIV', 'MAIN'].includes(element.tagName);
}

/**
 * Extracts ID from an element, generating one if not present
 */
export function getElementId(element: Element, prefix = 'section'): string {
  const id = element.id;
  if (id) return id;
  
  // Generate an ID based on element content or position
  const text = element.textContent?.trim() || '';
  if (text) {
    // Create slug from first few words of text
    return `${prefix}-${text.substring(0, 20)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}`;
  }
  
  // Fallback - use a random suffix
  return `${prefix}-${Math.random().toString(36).substring(2, 8)}`;
}
