/**
 * Link Processor Plugin
 * 
 * A rehype plugin that preserves original link attributes during HTML to Markdown conversion.
 * This prevents the loss of query parameters and other special URL characters.
 */

import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
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
    visit(tree, 'element', (node: Element) => {
      // Handle anchor elements
      if (node.tagName === 'a' && node.properties && node.properties.href) {
        // Store the original href to ensure it's preserved exactly
        node.properties.originalHref = node.properties.href;
        
        // Create data object if it doesn't exist
        if (!node.data) {
          node.data = {};
        }
        
        // Store the original href in the data object as well (for rehype-remark)
        node.data.originalHref = node.properties.href;
        
        // Handle email links (mailto:)
        if (typeof node.properties.href === 'string' && node.properties.href.startsWith('mailto:')) {
          // Special handling for email links to prevent obfuscation
          const email = node.properties.href.replace('mailto:', '');
          node.properties.href = email; // Store clean email
          node.data.isEmail = true;
        }
      }
    });

    // Second pass to handle edge cases and apply additional transformations
    visit(tree, 'element', (node: Element, index: number | null, parent: Element | null) => {
      // Restore or transform links now that we have the full context
      if (node.tagName === 'a' && node.properties) {
        // If this is an email link, ensure it's properly formatted for Markdown conversion
        if (node.data && node.data.isEmail) {
          // Create a text node with the email address if there isn't already content
          if (node.children.length === 0) {
            node.children.push({ type: 'text', value: node.properties.href } as TextNode);
          }
        }
      }
    });
  };
}