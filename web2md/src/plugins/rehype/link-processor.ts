/**
 * Link Processor Plugin
 * 
 * A rehype plugin that preserves original link attributes during HTML to Markdown conversion.
 * This ensures exact preservation of query parameters and other special URL characters.
 */

import { visit } from 'unist-util-visit';
import type { Node } from 'unist';

interface Element extends Node {
  tagName: string;
  properties?: {
    [key: string]: any;
  };
  children: Node[];
  data?: {
    [key: string]: any;
  };
}

interface TextNode extends Node {
  type: 'text';
  value: string;
}

/**
 * Plugin to preserve links in HTML AST before conversion to Markdown
 */
export function preserveLinks() {
  return function transformer(tree: Node) {
    // First pass: store original URLs and all attributes
    visit(tree, 'element', (node: Element) => {
      // Handle anchor elements
      if (node.tagName === 'a' && node.properties && node.properties.href) {
        const originalHref = node.properties.href;
        
        // Create data object if it doesn't exist
        if (!node.data) {
          node.data = {};
        }
        
        // Store the original href in the node data
        // This ensures it will survive the rehype-remark conversion
        node.data.hName = 'a';
        node.data.hProperties = {
          ...node.properties
        };
        
        // Store original href directly for easier access
        node.data.originalHref = originalHref;
        
        // Store all original attributes for preservation
        node.data.originalAttributes = { ...node.properties };
      }
    });

    // Second pass: handle special link types
    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'a' && node.data && node.data.originalHref) {
        const href = node.data.originalHref;
        
        // Special handling for email links
        if (typeof href === 'string' && href.startsWith('mailto:')) {
          node.data.isEmail = true;
          
          // Ensure the node has the proper URL structure
          // The href should remain intact with mailto: prefix
          if (!node.properties) {
            node.properties = {};
          }
          node.properties.href = href;
          
          // If there's no text content, use the email address as the text
          if (node.children.length === 0) {
            const email = href.replace(/^mailto:/, '');
            node.children.push({ type: 'text', value: email } as TextNode);
          }
        }
      }
    });
  };
}

/**
 * Plugin to restore original links in Markdown AST after conversion
 * This is used as a remark plugin after rehype-remark
 */
export function restoreLinks() {
  return function transformer(tree: Node) {
    visit(tree, 'link', (node: any) => {
      // Restore the original href if available
      if (node.data && node.data.originalHref) {
        node.url = node.data.originalHref;
      } else if (node.data && node.data.hProperties && node.data.hProperties.href) {
        node.url = node.data.hProperties.href;
      }
      
      // Ensure email links are properly preserved with mailto: prefix
      if (node.data && node.data.isEmail) {
        const emailUrl = node.url;
        if (!emailUrl.startsWith('mailto:')) {
          node.url = 'mailto:' + emailUrl;
        }
      }
      
      // Preserve other link attributes by storing them in node.data
      // These can be used by custom markdown renderers or in post-processing
      if (node.data && node.data.originalAttributes) {
        node.data.attributes = node.data.originalAttributes;
      }
    });
  };
}