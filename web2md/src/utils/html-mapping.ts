/**
 * HTML Element Mapping Utilities
 * 
 * Provides mapping information for converting HTML elements to Markdown.
 * This centralizes the knowledge about how different HTML elements should be transformed.
 */

/**
 * HTML element to Markdown element mapping information
 */
export interface ElementMapping {
  /** The tag name to convert to (for rehype elements) */
  tag: string;
  /** Optional Markdown format to apply */
  format?: 'strong' | 'emphasis' | 'code' | 'strikethrough' | 'highlight';
  /** Whether to preserve the element as-is */
  preserve?: boolean;
  /** Custom transformation function name */
  transform?: string;
  /** Whether this is a block element */
  block?: boolean;
  /** Description of the element for documentation */
  description?: string;
}

/**
 * Mapping of HTML elements to their Markdown representations
 */
export const HTML_ELEMENT_MAPPING: Record<string, ElementMapping> = {
  // Main structural elements
  'div': { tag: 'div', block: true },
  'span': { tag: 'span' },
  
  // Headings
  'h1': { tag: 'h1', block: true },
  'h2': { tag: 'h2', block: true },
  'h3': { tag: 'h3', block: true },
  'h4': { tag: 'h4', block: true },
  'h5': { tag: 'h5', block: true },
  'h6': { tag: 'h6', block: true },
  
  // Text formatting
  'p': { tag: 'p', block: true },
  'strong': { tag: 'span', format: 'strong' },
  'b': { tag: 'span', format: 'strong' },
  'em': { tag: 'span', format: 'emphasis' },
  'i': { tag: 'span', format: 'emphasis' },
  'code': { tag: 'code', format: 'code' },
  's': { tag: 'span', format: 'strikethrough' },
  'strike': { tag: 'span', format: 'strikethrough' },
  'del': { tag: 'span', format: 'strikethrough' },
  'mark': { tag: 'span', format: 'highlight' },
  'u': { tag: 'span', description: 'Underline, typically rendered as emphasis' },
  'sub': { tag: 'span', transform: 'subscript' },
  'sup': { tag: 'span', transform: 'superscript' },
  
  // Links and media
  'a': { tag: 'a', transform: 'link' },
  'img': { tag: 'img', transform: 'image' },
  'figure': { tag: 'div', transform: 'figure', block: true },
  'figcaption': { tag: 'p', format: 'emphasis' },
  
  // Lists
  'ul': { tag: 'ul', block: true },
  'ol': { tag: 'ol', block: true },
  'li': { tag: 'li' },
  'dl': { tag: 'dl', block: true, transform: 'definitionList' },
  'dt': { tag: 'dt', format: 'strong' },
  'dd': { tag: 'dd' },
  
  // Tables
  'table': { tag: 'table', block: true, transform: 'table' },
  'thead': { tag: 'thead' },
  'tbody': { tag: 'tbody' },
  'tr': { tag: 'tr' },
  'th': { tag: 'th', format: 'strong' },
  'td': { tag: 'td' },
  'caption': { tag: 'p', format: 'strong' },
  
  // Quotes and code
  'blockquote': { tag: 'blockquote', block: true },
  'q': { tag: 'span', transform: 'inlineQuote' },
  'cite': { tag: 'span', format: 'emphasis' },
  'pre': { tag: 'pre', block: true, transform: 'codeBlock' },
  'samp': { tag: 'code', format: 'code' },
  'kbd': { tag: 'code', format: 'code' },
  
  // Horizontal rule
  'hr': { tag: 'hr', block: true, transform: 'horizontalRule' },
  
  // HTML5 elements
  'article': { tag: 'div', block: true },
  'section': { tag: 'div', block: true },
  'aside': { tag: 'div', block: true },
  'nav': { tag: 'div', block: true },
  'header': { tag: 'div', block: true },
  'footer': { tag: 'div', block: true },
  'main': { tag: 'div', block: true },
  'details': { tag: 'div', block: true, transform: 'details' },
  'summary': { tag: 'p', format: 'strong' },
  
  // Ruby annotations
  'ruby': { tag: 'span', transform: 'ruby' },
  'rt': { tag: 'span' },
  
  // Definition and abbreviations
  'dfn': { tag: 'span', format: 'emphasis' },
  'abbr': { tag: 'span', transform: 'abbreviation' },
  
  // Data elements
  'time': { tag: 'span' },
  'data': { tag: 'span' },
  
  // Bidirectional text
  'bdi': { tag: 'span' },
  'bdo': { tag: 'span', transform: 'bidirectional' },
  
  // Inserted and deleted text
  'ins': { tag: 'span', format: 'emphasis' },
  
  // Variables and math
  'var': { tag: 'code', format: 'code' },
  'math': { tag: 'div', transform: 'math', block: true },
  
  // Other
  'small': { tag: 'span' },
  'wbr': { tag: 'span' }
};

/**
 * Get mapping information for an HTML element
 * 
 * @param tagName - The HTML tag name
 * @returns The element mapping information or undefined if not found
 */
export function getElementMapping(tagName: string): ElementMapping | undefined {
  return HTML_ELEMENT_MAPPING[tagName.toLowerCase()];
}

/**
 * Check if an element should be preserved in HTML
 * 
 * @param tagName - The HTML tag name
 * @returns true if the element should be preserved
 */
export function shouldPreserveElement(tagName: string): boolean {
  const mapping = getElementMapping(tagName);
  return mapping?.preserve === true;
}

/**
 * Get the appropriate format for an element
 * 
 * @param tagName - The HTML tag name
 * @returns The format type or undefined if no specific format
 */
export function getElementFormat(tagName: string): string | undefined {
  const mapping = getElementMapping(tagName);
  return mapping?.format;
}

/**
 * Check if an element is a block-level element
 * 
 * @param tagName - The HTML tag name
 * @returns true if the element is block-level
 */
export function isBlockElement(tagName: string): boolean {
  const mapping = getElementMapping(tagName);
  return mapping?.block === true;
}

/**
 * Get the transform function name for an element
 * 
 * @param tagName - The HTML tag name
 * @returns The transform function name or undefined if no transform
 */
export function getElementTransform(tagName: string): string | undefined {
  const mapping = getElementMapping(tagName);
  return mapping?.transform;
}