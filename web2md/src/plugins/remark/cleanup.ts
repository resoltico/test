/**
 * Markdown Cleanup Plugin
 * 
 * A remark plugin that performs post-processing on the Markdown AST
 * to improve formatting and fix common conversion issues.
 */

import { visit } from 'unist-util-visit';
import { SKIP } from 'unist-util-visit';
import { Plugin, Transformer } from 'unified';
import type { Node } from 'unist';

interface TextNode extends Node {
  type: 'text';
  value: string;
  parent?: ParentNode;
}

interface ParentNode extends Node {
  type: string;
  children: Node[];
}

interface HeadingNode extends ParentNode {
  type: 'heading';
  depth: number;
}

interface LinkNode extends ParentNode {
  type: 'link';
  url: string;
  data?: {
    originalHref?: string;
    isEmail?: boolean;
  };
}

/**
 * Plugin to clean up the Markdown AST before stringification
 */
export function cleanupMarkdown(): Plugin {
  return function transformer(tree: Node): void {
    // Remove extra whitespace in text nodes
    visit(tree, 'text', (node: TextNode) => {
      // Clean up whitespace but preserve necessary spacing
      if (typeof node.value === 'string') {
        // Replace multiple spaces with a single space
        node.value = node.value.replace(/[ \t]+/g, ' ');
        
        // Trim whitespace from beginning and end if not in a code block
        if (node.parent && node.parent.type !== 'code') {
          node.value = node.value.trim();
        }
      }
    });
    
    // Fix consecutive headings without content between them
    let lastHeadingDepth = 0;
    visit(tree, 'heading', (node: HeadingNode, index: number | null, parent: ParentNode | null) => {
      if (index !== null && parent && index > 0 && lastHeadingDepth > 0) {
        // If we have two consecutive headings, insert a blank paragraph between them
        const prevNode = parent.children[index - 1];
        if (prevNode.type === 'heading') {
          parent.children.splice(index, 0, {
            type: 'paragraph',
            children: [{ type: 'text', value: '' }]
          } as ParentNode);
          // Adjust index since we inserted a node
          return index + 1;
        }
      }
      lastHeadingDepth = node.depth;
      return undefined;
    });
    
    // Ensure proper spacing around lists
    visit(tree, ['list'], (node: ParentNode, index: number | null, parent: ParentNode | null) => {
      if (index !== null && parent && index > 0) {
        // Add a blank line before lists if needed
        const prevNode = parent.children[index - 1] as ParentNode;
        if (prevNode.type !== 'list' && !isBlankParagraph(prevNode)) {
          parent.children.splice(index, 0, createBlankParagraph());
          // Adjust index
          return index + 1;
        }
      }
      return undefined;
    });
    
    // Clean up links
    visit(tree, 'link', (node: LinkNode) => {
      // Restore original href if it was preserved
      if (node.data && node.data.originalHref) {
        node.url = node.data.originalHref;
      }
      
      // Handle email links
      if (node.data && node.data.isEmail) {
        node.url = 'mailto:' + node.url;
      }
    });
  };
}

/**
 * Check if a node is a blank paragraph
 */
function isBlankParagraph(node: ParentNode): boolean {
  return (
    node.type === 'paragraph' &&
    node.children.length === 1 &&
    node.children[0].type === 'text' &&
    (node.children[0] as TextNode).value === ''
  );
}

/**
 * Create a blank paragraph node
 */
function createBlankParagraph(): ParentNode {
  return {
    type: 'paragraph',
    children: [{ type: 'text', value: '' }]
  } as ParentNode;
}