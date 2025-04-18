/**
 * Debugging utilities for the html-to-commonmark-core library
 */

import { ASTNode } from '../ast/types.js';
import { HtmlNode, ElementNode, TextNode, isElementNode, isTextNode } from '../types/html.js';

/**
 * Prints a DOM tree for debugging
 * @param node The root node
 * @param indent Indentation level
 */
export function printDOMTree(node: HtmlNode, indent: number = 0): void {
  const padding = ' '.repeat(indent * 2);
  
  if (isElementNode(node)) {
    console.log(`${padding}${node.nodeName} [${node.tagName}]`);
    
    // Print attributes
    if (node.attributes.size > 0) {
      const attrs = Array.from(node.attributes.entries())
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ');
      console.log(`${padding}  Attributes: ${attrs}`);
    }
    
    // Print children
    for (const child of node.childNodes) {
      printDOMTree(child, indent + 1);
    }
  } else if (isTextNode(node)) {
    const content = node.data.trim() 
      ? node.data.replace(/\n/g, '\\n').substr(0, 30) + (node.data.length > 30 ? '...' : '')
      : '[empty]';
    console.log(`${padding}#text: "${content}"`);
  } else {
    console.log(`${padding}${node.nodeName}`);
  }
}

/**
 * Prints an AST tree for debugging
 * @param node The root node
 * @param indent Indentation level
 */
export function printASTTree(nodes: ASTNode | ASTNode[], indent: number = 0): void {
  const padding = ' '.repeat(indent * 2);
  
  if (!Array.isArray(nodes)) {
    nodes = [nodes];
  }
  
  for (const node of nodes) {
    console.log(`${padding}${node.type}`);
    
    // Print properties
    for (const [key, value] of Object.entries(node)) {
      if (key === 'type' || key === 'children' || key === 'position') {
        continue;
      }
      
      const display = typeof value === 'string' 
        ? `"${value.substr(0, 30)}${value.length > 30 ? '...' : ''}"`
        : value;
      console.log(`${padding}  ${key}: ${display}`);
    }
    
    // Print children
    if ('children' in node) {
      printASTTree((node as any).children, indent + 1);
    }
  }
}

/**
 * Compares the actual output with expected output for debugging
 * @param actual Actual output
 * @param expected Expected output
 */
export function compareOutput(actual: string, expected: string): void {
  console.log('Actual output:');
  console.log(JSON.stringify(actual));
  console.log('\nExpected contains:');
  console.log(JSON.stringify(expected));
  
  if (actual.includes(expected)) {
    console.log('\n✅ Expected content found in actual output');
  } else {
    console.log('\n❌ Expected content NOT found in actual output');
    
    // Try to find similarities
    const lines = actual.split('\n');
    const expectedLines = expected.split('\n');
    
    for (const expLine of expectedLines) {
      const similar = lines.find(line => 
        line.includes(expLine.replace(/[^\w\s]/g, '').trim())
      );
      
      if (similar) {
        console.log('\nFound similar line:');
        console.log(`Expected: "${expLine}"`);
        console.log(`Found   : "${similar}"`);
      }
    }
  }
}