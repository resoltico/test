import { decode } from 'html-entities';
import { JSDOM } from 'jsdom';
import { logger } from './logger.js';
import sanitizeHtml from 'sanitize-html';

// Define DOM Node constants since Node is not globally available in Node.js
const DOCUMENT_POSITION_FOLLOWING = 4; // Same as Node.DOCUMENT_POSITION_FOLLOWING in browsers
const DOCUMENT_POSITION_PRECEDING = 2; // Same as Node.DOCUMENT_POSITION_PRECEDING in browsers
const ELEMENT_NODE = 1;  // Same as Node.ELEMENT_NODE in browsers
const TEXT_NODE = 3;     // Same as Node.TEXT_NODE in browsers

/**
 * Create a new JSDOM instance from HTML content with optimized configuration
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
  return titleElement ? normalizeTextContent(titleElement.textContent || '') : 'Untitled Document';
}

/**
 * Generate an ID for an element based on its existing ID, content, or a random string
 */
export function getIdFromElement(element: Element, prefix = 'element'): string {
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
  return `${prefix}-${Math.random().toString(36).substring(2, 12)}`;
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
  return slug ? `${prefix}-${slug}` : `${prefix}-${Math.random().toString(36).substring(2, 12)}`;
}

/**
 * Normalize HTML content while preserving formatting and element structure
 * This is critical for preserving the exact HTML formatting in content fields
 */
export function normalizeHtmlContent(html: string): string {
  if (!html) return '';
  
  // Basic cleanup of whitespace without affecting tags
  return html.trim();
}

/**
 * Clean and normalize text content without HTML tags
 */
export function normalizeTextContent(text: string): string {
  if (!text) return '';
  
  // Decode HTML entities and normalize whitespace
  return decode(text).replace(/\s+/g, ' ').trim();
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
 * Check if an element is a heading (h1-h6)
 */
export function isHeading(element: Element): boolean {
  return /^h[1-6]$/i.test(element.tagName);
}

/**
 * Get the heading level (1-6) from a heading element
 */
export function getHeadingLevel(element: Element): number | null {
  if (!isHeading(element)) return null;
  return parseInt(element.tagName.substring(1), 10);
}

/**
 * Check if an element is a container element (section, article, aside, div)
 */
export function isContainer(element: Element): boolean {
  const tag = element.tagName.toLowerCase();
  return ['section', 'article', 'aside', 'div', 'main'].includes(tag);
}

/**
 * Sanitize HTML while preserving all needed tags
 * This ensures we don't lose any important formatting
 */
export function sanitizeContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: false, // Allow all tags
    allowedAttributes: false // Allow all attributes
  });
}

/**
 * Extract HTML content from a node, preserving exact formatting
 */
export function extractNodeHtml(node: Node): string {
  if (node.nodeType === ELEMENT_NODE) {
    return (node as Element).outerHTML;
  }
  return node.textContent || '';
}

/**
 * Check if an element contains significant content (not just whitespace)
 */
export function hasSignificantContent(element: Element): boolean {
  // Check for non-whitespace text content
  if (element.textContent?.trim()) {
    return true;
  }
  
  // Check for significant child elements
  const significantElements = [
    'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'dl', 'table', 'figure', 'blockquote',
    'form', 'img', 'pre', 'code'
  ];
  
  for (const tag of significantElements) {
    if (element.querySelector(tag)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Find the next sibling element that matches a selector
 */
export function findNextSibling(element: Element, selector: string): Element | null {
  let current = element.nextElementSibling;
  
  while (current) {
    if (current.matches(selector)) {
      return current;
    }
    current = current.nextElementSibling;
  }
  
  return null;
}

/**
 * Get all siblings of a specific type between two elements
 */
export function getSiblingsBetween(
  startElement: Element,
  endElement: Element | null,
  selector: string
): Element[] {
  const result: Element[] = [];
  let current = startElement.nextElementSibling;
  
  while (current) {
    if (endElement && current === endElement) {
      break;
    }
    
    if (current.matches(selector)) {
      result.push(current);
    }
    
    current = current.nextElementSibling;
  }
  
  return result;
}

/**
 * Extract and process SVG content
 */
export function extractSvgContent(svgElement: SVGElement): string {
  return svgElement.outerHTML;
}

/**
 * Extract mathML content
 */
export function extractMathContent(mathElement: Element): string {
  return mathElement.outerHTML;
}

/**
 * Create HTML fragment from string
 */
export function createHtmlFragment(html: string, document: Document): DocumentFragment {
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content;
}

/**
 * Check if an element is empty or contains only whitespace
 */
export function isEmptyElement(element: Element): boolean {
  return !element.textContent?.trim() && !element.querySelector('*');
}

/**
 * Get the immediate text content of an element (excluding child elements)
 */
export function getImmediateTextContent(element: Element): string {
  let text = '';
  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType === TEXT_NODE) {
      text += node.textContent;
    }
  }
  return text.trim();
}

/**
 * Efficiently query multiple selectors and return the first match
 */
export function querySelectorFirst(element: Element, selectors: string[]): Element | null {
  for (const selector of selectors) {
    const match = element.querySelector(selector);
    if (match) return match;
  }
  return null;
}

/**
 * Safely get all text nodes within an element
 */
export function getAllTextNodes(element: Element): Text[] {
  const result: Text[] = [];
  const walker = document.createTreeWalker(
    element,
    // Don't use NodeFilter.SHOW_TEXT here, define it explicitly
    4, // 4 = SHOW_TEXT (NodeFilter.SHOW_TEXT)
    null
  );
  
  let node;
  while (node = walker.nextNode()) {
    result.push(node as Text);
  }
  
  return result;
}