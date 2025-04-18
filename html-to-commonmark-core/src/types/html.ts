/**
 * Type definitions for HTML node structure
 * Represents a simplified DOM-like API for HTML nodes
 */

/**
 * Base HTML node interface
 */
export interface HtmlNode {
  /**
   * Type of node: 'element', 'text', or 'comment'
   */
  nodeType: 'element' | 'text' | 'comment';
  
  /**
   * Name of the node (tag name for elements, '#text' for text nodes, '#comment' for comments)
   */
  nodeName: string;
  
  /**
   * Text content of the node
   */
  textContent: string;
  
  /**
   * Parent node reference, if available
   */
  parentNode?: HtmlNode;
}

/**
 * Element node interface for HTML elements
 */
export interface ElementNode extends HtmlNode {
  nodeType: 'element';
  
  /**
   * Tag name of the element (uppercase)
   */
  tagName: string;
  
  /**
   * Map of attributes
   */
  attributes: Map<string, string>;
  
  /**
   * Child nodes
   */
  childNodes: HtmlNode[];
  
  /**
   * Inner HTML content
   */
  innerHTML: string;
  
  /**
   * Outer HTML content (including the element itself)
   */
  outerHTML: string;
  
  /**
   * Check if the element has an attribute
   */
  hasAttribute(name: string): boolean;
  
  /**
   * Get the value of an attribute
   */
  getAttribute(name: string): string | null;
  
  /**
   * Get elements by tag name
   */
  getElementsByTagName(name: string): ElementNode[];
}

/**
 * Text node interface for HTML text content
 */
export interface TextNode extends HtmlNode {
  nodeType: 'text';
  nodeName: '#text';
  
  /**
   * Text content
   */
  data: string;
}

/**
 * Comment node interface for HTML comments
 */
export interface CommentNode extends HtmlNode {
  nodeType: 'comment';
  nodeName: '#comment';
  
  /**
   * Comment content
   */
  data: string;
}

/**
 * Type guard to check if a node is an element node
 */
export function isElementNode(node: HtmlNode): node is ElementNode {
  return node.nodeType === 'element';
}

/**
 * Type guard to check if a node is a text node
 */
export function isTextNode(node: HtmlNode): node is TextNode {
  return node.nodeType === 'text';
}

/**
 * Type guard to check if a node is a comment node
 */
export function isCommentNode(node: HtmlNode): node is CommentNode {
  return node.nodeType === 'comment';
}