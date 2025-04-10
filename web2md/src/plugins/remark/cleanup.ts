/**
 * Markdown Cleanup Plugin
 * 
 * A remark plugin that performs post-processing on the Markdown AST
 * to improve formatting and fix common conversion issues.
 */

import { visit, SKIP } from 'unist-util-visit';
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
    attributes?: Record<string, any>;
    hProperties?: {
      originalHref?: string;
      href?: string;
    };
  };
}

interface MathNode extends ParentNode {
  type: 'math';
  value: string;
  data?: {
    hProperties?: {
      display?: string;
    };
  };
  meta?: string;
}

/**
 * Plugin to clean up the Markdown AST before stringification
 */
export function cleanupMarkdown() {
  return function transformer(tree: Node) {
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
            children: [{ type: 'text', value: '' } as TextNode]
          } as ParentNode);
          // Adjust index since we inserted a node
          return index + 1;
        }
      }
      lastHeadingDepth = node.depth;
      return undefined;
    });
    
    // Ensure proper spacing around lists and blockquotes
    visit(tree, ['list', 'blockquote'], (node: ParentNode, index: number | null, parent: ParentNode | null) => {
      if (index !== null && parent && index > 0) {
        // Add a blank line before lists/blockquotes if needed
        const prevNode = parent.children[index - 1] as ParentNode;
        if (prevNode.type !== 'list' && prevNode.type !== 'blockquote' && !isBlankParagraph(prevNode)) {
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
      if (node.data?.originalHref) {
        node.url = node.data.originalHref;
      } else if (node.data?.hProperties?.href) {
        node.url = node.data.hProperties.href;
      }
      
      // Handle email links
      if (node.data?.isEmail && !node.url.startsWith('mailto:')) {
        node.url = 'mailto:' + node.url;
      }
      
      // Ensure link text isn't empty
      if (node.children.length === 0) {
        node.children.push({
          type: 'text',
          value: node.url
        } as TextNode);
      }
    });
    
    // Fix math formatting
    visit(tree, 'math', (node: MathNode) => {
      // Ensure proper math syntax
      if (node.value) {
        // Clean up whitespace in math expressions
        node.value = node.value.trim();
        
        // Add line breaks for display math
        const isDisplay = node.data?.hProperties?.display === 'block' || 
                          node.meta === 'display';
                          
        if (isDisplay && !node.value.includes('\n')) {
          node.value = '\n' + node.value + '\n';
        }
      }
    });
    
    // Handle inline math nodes
    visit(tree, 'inlineMath', (node: any) => {
      if (node.value) {
        // Clean up whitespace in inline math expressions
        node.value = node.value.trim();
      }
    });
    
    // Fix code blocks
    visit(tree, 'code', (node: any) => {
      if (node.value) {
        // Ensure code doesn't start or end with too many newlines
        node.value = node.value.replace(/^\n+/, '\n').replace(/\n+$/, '\n');
      }
    });
    
    // Fix inconsistent list items
    fixListItems(tree);
    
    // Fix raw HTML containing math (post-process to ensure proper math display)
    visit(tree, 'html', (node: any) => {
      if (node.value && 
          (node.value.includes('class="math') || 
           node.value.includes('data-math') ||
           node.value.includes('MathJax'))) {
        
        // Try to extract math content from HTML
        const mathContent = extractMathContent(node.value);
        if (mathContent) {
          // Determine if this is display math
          const isDisplay = node.value.includes('math-display') || 
                           node.value.includes('display="block"') ||
                           node.value.includes('MathJax_Display');
          
          // Replace with proper math node
          if (isDisplay) {
            node.type = 'html';
            node.value = `$$\n${mathContent}\n$$`;
          } else {
            node.type = 'html';
            node.value = `$${mathContent}$`;
          }
        }
      }
    });
  };
}

/**
 * Fix inconsistent list items
 */
function fixListItems(tree: Node): void {
  visit(tree, 'listItem', (node: any) => {
    // Ensure list items have proper children
    if (node.children && node.children.length > 0) {
      // If the first child is not a paragraph, wrap content in a paragraph
      if (node.children[0].type !== 'paragraph') {
        // Collect all text nodes until we hit a block element
        const textChildren = [];
        let i = 0;
        while (i < node.children.length && 
              !['paragraph', 'list', 'blockquote', 'heading'].includes(node.children[i].type)) {
          textChildren.push(node.children[i]);
          i++;
        }
        
        if (textChildren.length > 0) {
          // Create a paragraph with these text nodes
          const paragraph = {
            type: 'paragraph',
            children: textChildren
          };
          
          // Replace these nodes with the paragraph
          node.children.splice(0, textChildren.length, paragraph);
        }
      }
    }
  });
}

/**
 * Extract math content from HTML
 */
function extractMathContent(html: string): string | null {
  // Simple regex-based extraction (could be enhanced for more complex cases)
  const mathMatch = html.match(/<[^>]*>(.*?)<\/[^>]*>/);
  if (mathMatch && mathMatch[1]) {
    return mathMatch[1].trim();
  }
  return null;
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
    children: [{ type: 'text', value: '' } as TextNode]
  } as ParentNode;
}