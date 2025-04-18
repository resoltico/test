/**
 * HTML DOM Parser module
 * Uses JSDOM for parsing HTML content into a standardized DOM structure
 */

import { JSDOM } from 'jsdom';
import { HtmlNode, ElementNode, TextNode, CommentNode } from '../types/html.js';
import { ConversionError } from '../utils/errors.js';

/**
 * Options for the HTML parser
 */
export interface ParserOptions {
  /**
   * Whether to throw an error on parse failure or attempt recovery
   */
  strict?: boolean;
  
  /**
   * Whether to normalize the HTML content (merge text nodes, etc.)
   */
  normalize?: boolean;

  /**
   * Whether to preserve comments in the output
   */
  preserveComments?: boolean;
  
  /**
   * Whether to output debug information
   */
  debug?: boolean;
}

/**
 * Default parser options
 */
const DEFAULT_OPTIONS: ParserOptions = {
  strict: false,
  normalize: true,
  preserveComments: false,
  debug: false,
};

/**
 * Parses HTML string content into a DOM structure
 * @param html HTML string to parse
 * @param options Parser options
 * @returns The document element as an HtmlNode
 */
export function parseHtml(html: string, options?: ParserOptions): ElementNode {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  try {
    // Parse the HTML using JSDOM
    const dom = new JSDOM(html, {
      // Use a recent browser version for modern HTML support
      contentType: 'text/html',
    });
    
    // Get the document body
    const documentElement = dom.window.document.body;
    
    // Normalize the DOM if requested
    if (opts.normalize) {
      documentElement.normalize();
    }
    
    if (opts.debug) {
      console.log('Parsed HTML document:');
      console.log(documentElement.innerHTML);
    }
    
    // Convert the JSDOM document to our HtmlNode structure
    return convertDomNode(documentElement) as ElementNode;
  } catch (error) {
    if (opts.strict) {
      throw new ConversionError('Failed to parse HTML', { 
        cause: error instanceof Error ? error : new Error(String(error))
      });
    }
    
    // Attempt recovery by wrapping in a div and reparsing
    try {
      const wrapped = `<div>${html}</div>`;
      const dom = new JSDOM(wrapped);
      
      if (opts.normalize) {
        dom.window.document.body.normalize();
      }
      
      if (opts.debug) {
        console.log('Recovered HTML document:');
        console.log(dom.window.document.body.innerHTML);
      }
      
      return convertDomNode(dom.window.document.body.firstChild as Element) as ElementNode;
    } catch (recoveryError) {
      throw new ConversionError('Failed to parse HTML and recovery failed', { 
        cause: recoveryError instanceof Error ? recoveryError : new Error(String(recoveryError))
      });
    }
  }
}

/**
 * Converts a DOM node to our internal HtmlNode structure
 * @param node DOM node to convert
 * @returns Converted HtmlNode
 */
function convertDomNode(node: Node): HtmlNode | null {
  // Handle different node types
  switch (node.nodeType) {
    case node.ELEMENT_NODE: {
      const element = node as Element;
      
      // Create a map of attributes
      const attributes = new Map<string, string>();
      for (const attr of element.attributes) {
        attributes.set(attr.name, attr.value);
      }
      
      // Convert child nodes
      const childNodes: HtmlNode[] = [];
      for (const child of element.childNodes) {
        const convertedChild = convertDomNode(child);
        if (convertedChild) {
          childNodes.push(convertedChild);
        }
      }
      
      // Create the element node
      const elementNode: ElementNode = {
        nodeType: 'element',
        nodeName: element.nodeName,
        tagName: element.tagName,
        attributes,
        childNodes,
        textContent: element.textContent || '',
        innerHTML: element.innerHTML,
        outerHTML: element.outerHTML,
        hasAttribute(name: string): boolean {
          return attributes.has(name);
        },
        getAttribute(name: string): string | null {
          return attributes.get(name) || null;
        },
        getElementsByTagName(name: string): ElementNode[] {
          const result: ElementNode[] = [];
          const queue: ElementNode[] = [elementNode];
          
          while (queue.length > 0) {
            const current = queue.shift()!;
            
            for (const child of current.childNodes) {
              if (child.nodeType === 'element') {
                const elem = child as ElementNode;
                
                if (elem.tagName.toLowerCase() === name.toLowerCase()) {
                  result.push(elem);
                }
                
                queue.push(elem);
              }
            }
          }
          
          return result;
        }
      };
      
      return elementNode;
    }
    
    case node.TEXT_NODE: {
      const text = node as Text;
      const content = text.textContent || '';
      
      // Skip empty text nodes (whitespace)
      if (!content.trim() && content.length === 0) {
        return null;
      }
      
      return {
        nodeType: 'text',
        nodeName: '#text',
        textContent: content,
        data: content,
      } as TextNode;
    }
    
    case node.COMMENT_NODE: {
      const comment = node as Comment;
      
      return {
        nodeType: 'comment',
        nodeName: '#comment',
        textContent: comment.textContent || '',
        data: comment.textContent || '',
      } as CommentNode;
    }
    
    default:
      return null;
  }
}