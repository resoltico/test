/**
 * Math Processor Plugin
 * 
 * A rehype plugin that handles mathematical content in HTML,
 * converting MathML and other math formats to Markdown-compatible notation.
 */

import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Node } from 'unist';

interface Element extends Node {
  tagName: string;
  properties?: {
    [key: string]: any;
    className?: string[];
    type?: string;
    display?: string;
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
 * Plugin to handle mathematical content in HTML AST
 */
export function handleMath() {
  return function transformer(tree: Node) {
    visit(tree, 'element', (node: Element) => {
      // Handle MathML elements
      if (node.tagName === 'math') {
        // Convert MathML to GitHub-compatible math notation
        convertMathML(node);
      }
      
      // Handle LaTeX in script tags
      if (node.tagName === 'script' && 
          node.properties && 
          node.properties.type && 
          typeof node.properties.type === 'string' &&
          node.properties.type.includes('math/tex')) {
        // Convert script with LaTeX to GitHub-compatible math notation
        convertScriptMath(node);
      }
      
      // Handle elements with math class
      if (node.properties && 
          node.properties.className &&
          Array.isArray(node.properties.className) &&
          node.properties.className.includes('math')) {
        // Convert classed elements with math content
        convertClassedMath(node);
      }
    });
  };
}

/**
 * Convert MathML element to Markdown math notation
 */
function convertMathML(node: Element): void {
  // Determine if this is inline or block math
  const isDisplay = node.properties && 
                    node.properties.display === 'block';
  
  // Extract the math content
  const mathContent = extractMathContent(node);
  
  // Transform the node
  node.tagName = 'div'; // Change to a div that rehype-remark will handle
  
  // Use double dollars for block math, single for inline
  if (isDisplay) {
    // Block math with double dollars
    node.children = [
      { type: 'text', value: '$$\n' + mathContent + '\n$$' } as TextNode
    ];
    node.properties = { className: ['math', 'math-display'] };
  } else {
    // Inline math with single dollars
    node.children = [
      { type: 'text', value: '$' + mathContent + '$' } as TextNode
    ];
    node.properties = { className: ['math', 'math-inline'] };
  }
}

/**
 * Convert script tag with LaTeX to Markdown math notation
 */
function convertScriptMath(node: Element): void {
  // Extract the math content
  let mathContent = '';
  if (node.children && node.children.length > 0) {
    const textNode = node.children[0] as TextNode;
    mathContent = textNode.value || '';
  }
  
  // Determine if this is display math
  const isDisplay = node.properties?.type?.includes('display') || false;
  
  // Transform the node
  node.tagName = 'div'; // Change to a div
  
  // Use double dollars for block math, single for inline
  if (isDisplay) {
    node.children = [
      { type: 'text', value: '$$\n' + mathContent + '\n$$' } as TextNode
    ];
    node.properties = { className: ['math', 'math-display'] };
  } else {
    node.children = [
      { type: 'text', value: '$' + mathContent + '$' } as TextNode
    ];
    node.properties = { className: ['math', 'math-inline'] };
  }
}

/**
 * Convert element with math class to Markdown math notation
 */
function convertClassedMath(node: Element): void {
  // Extract the math content
  const mathContent = extractTextContent(node);
  
  // Determine if this is display math
  const isDisplay = node.properties?.className?.includes('math-display') || 
                   node.tagName === 'div'; // Assume divs are block-level
  
  // Clear the children and set the new content
  if (isDisplay) {
    node.children = [
      { type: 'text', value: '$$\n' + mathContent + '\n$$' } as TextNode
    ];
  } else {
    node.children = [
      { type: 'text', value: '$' + mathContent + '$' } as TextNode
    ];
  }
  
  // Ensure proper classes are set
  if (isDisplay) {
    node.properties = { className: ['math', 'math-display'] };
  } else {
    node.properties = { className: ['math', 'math-inline'] };
  }
}

/**
 * Extract math content from a MathML node
 */
function extractMathContent(node: Element): string {
  // This is a simplified implementation
  // A full implementation would need to properly parse MathML
  // and convert it to LaTeX notation
  
  let result = '';
  
  // Recursive function to extract text from the node tree
  function extractText(node: Node): void {
    if (node.type === 'text') {
      result += (node as TextNode).value;
    } else if ((node as Element).children) {
      for (const child of (node as Element).children) {
        extractText(child);
      }
    }
  }
  
  extractText(node);
  return result;
}

/**
 * Extract text content from any node
 */
function extractTextContent(node: Node): string {
  let result = '';
  
  function extractText(node: Node): void {
    if (node.type === 'text') {
      result += (node as TextNode).value;
    } else if ((node as Element).children) {
      for (const child of (node as Element).children) {
        extractText(child);
      }
    }
  }
  
  extractText(node);
  return result;
}