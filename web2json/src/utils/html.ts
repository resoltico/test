import { decode } from 'html-entities';
import { JSDOM } from 'jsdom';

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
  return titleElement ? titleElement.textContent || '' : 'Untitled Document';
}

/**
 * Extracts the inner HTML content while preserving all HTML markup
 * This is critical for maintaining HTML tags in content fields
 */
export function extractFormattedContent(element: Element): string {
  return element.innerHTML;
}

/**
 * Normalizes text content from HTML elements by trimming
 * but preserving the HTML markup
 */
export function normalizeTextContent(text: string): string {
  if (!text) return '';
  
  // Decode HTML entities
  const decodedText = decode(text);
  
  // Normalize whitespace but preserve HTML markup
  return decodedText.trim();
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