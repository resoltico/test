/**
 * HTML Attribute Processor Plugin
 * 
 * A rehype plugin that preserves important HTML attributes
 * that should be carried over to the Markdown output.
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

/**
 * List of attributes that we want to preserve for specific elements
 */
const IMPORTANT_ATTRIBUTES: Record<string, string[]> = {
  'a': ['href', 'title', 'target', 'rel'],
  'img': ['src', 'alt', 'title', 'width', 'height'],
  'table': ['summary'],
  'th': ['scope', 'colspan', 'rowspan'],
  'td': ['colspan', 'rowspan'],
  'code': ['class'],
  'pre': ['class']
};

/**
 * Plugin to preserve important HTML attributes
 */
export function preserveHtmlAttributes() {
  return function transformer(tree: Node) {
    visit(tree, 'element', (node: Element) => {
      // Check if this element has attributes we want to preserve
      const attributesToPreserve = IMPORTANT_ATTRIBUTES[node.tagName];
      
      if (attributesToPreserve && node.properties) {
        // Create data object if it doesn't exist
        if (!node.data) {
          node.data = {};
        }
        
        // Store attributes to preserve
        node.data.preservedAttributes = {};
        
        // Copy important attributes to the preserved attributes
        for (const attr of attributesToPreserve) {
          if (attr in node.properties) {
            node.data.preservedAttributes[attr] = node.properties[attr];
          }
        }
        
        // Store original tag name
        node.data.originalTagName = node.tagName;
      }
    });
  };
}

/**
 * Plugin to restore preserved HTML attributes in the Markdown
 * Note: This would be used in a custom Markdown renderer
 * as most Markdown formats don't directly support HTML attributes
 */
export function restoreHtmlAttributes() {
  return function transformer(tree: Node) {
    visit(tree, (node: any) => {
      // Check for preserved attributes
      if (node.data && node.data.preservedAttributes) {
        // Depending on the node type, we might need different handling
        if (node.type === 'link' && node.data.originalTagName === 'a') {
          // For links, we can add some attributes via title or as data
          const preserved = node.data.preservedAttributes;
          
          // Store target attribute if present
          if (preserved.target) {
            node.data.target = preserved.target;
          }
          
          // Store title attribute
          if (preserved.title) {
            node.title = preserved.title;
          }
        }
        else if (node.type === 'image' && node.data.originalTagName === 'img') {
          // For images, we can add title and alt
          const preserved = node.data.preservedAttributes;
          
          if (preserved.alt) {
            node.alt = preserved.alt;
          }
          
          if (preserved.title) {
            node.title = preserved.title;
          }
        }
        // For other node types, attributes will stay in data.preservedAttributes
        // and can be used by custom renderers if needed
      }
    });
  };
}