// src/utils/html.ts
import { decode } from 'html-entities';
import sanitizeHtml from 'sanitize-html';
import * as cheerio from 'cheerio';
import { Element } from 'domhandler';

/**
 * Clean and decode HTML content while preserving semantic elements
 */
export function cleanHtmlContent(content: string): string {
  // First decode HTML entities
  const decoded = decode(content);
  
  // Then sanitize the HTML to remove potentially harmful content
  // but preserve legitimate formatting elements
  const sanitized = sanitizeHtml(decoded, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'section', 'article', 'aside',
      'figure', 'figcaption', 'time', 'mark', 'ruby', 'rt', 'abbr',
      'data', 'bdi', 'bdo', 'wbr', 'kbd', 'q', 'samp', 'var', 'sub', 
      'sup', 'code', 'pre', 'strong', 'em', 'i', 'b', 'u', 's', 'small', 
      'dfn', 'cite'
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      '*': ['id', 'class', 'data-*'],
      'time': ['datetime'],
      'abbr': ['title'],
      'data': ['value'],
      'bdo': ['dir']
    }
  });
  
  return sanitized.trim();
}

/**
 * Extract text content from an HTML element
 */
export function extractTextContent(html: string): string {
  // Remove all HTML tags and decode entities
  const withoutTags = html.replace(/<[^>]*>/g, '');
  return decode(withoutTags).trim();
}

/**
 * Get the parent section of an element
 */
export function getParentSection($: cheerio.CheerioAPI, element: Element): Element | null {
  const $element = $(element);
  const $section = $element.closest('section, article, aside, div');
  
  if ($section.length > 0) {
    return $section[0];
  }
  
  return null;
}

/**
 * Create a Cheerio instance with consistent configuration
 */
export function createCheerio(html: string): cheerio.CheerioAPI {
  // Fix for the CheerioOptions issue
  return cheerio.load(html, {
    // Only include properties that are actually supported
    // Removed decodeEntities as it's not in the interface
    xml: false, // Use HTML mode
    _useHtmlParser2: true // Use htmlparser2 for better HTML5 support
  });
}

/**
 * Extract metadata from HTML head
 */
export function extractMetadata($: cheerio.CheerioAPI): Record<string, string> {
  const metadata: Record<string, string> = {};
  
  // Extract base URL
  const baseUrl = $('base').attr('href');
  if (baseUrl) {
    metadata.baseUrl = baseUrl;
  }
  
  // Extract language
  const language = $('html').attr('lang');
  if (language) {
    metadata.language = language;
  }
  
  // Extract description
  const description = $('meta[name="description"]').attr('content');
  if (description) {
    metadata.description = description;
  }
  
  return metadata;
}

/**
 * Get heading level from an element
 */
export function getHeadingLevel(tagName: string): number | null {
  if (/^h[1-6]$/i.test(tagName)) {
    return parseInt(tagName.substring(1), 10);
  }
  return null;
}