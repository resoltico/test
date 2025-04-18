/**
 * Rule for converting HTML pre/code elements to AST code block nodes
 */

import * as builder from '../../ast/builder.js';
import { TagRule, RuleContext } from '../base.js';
import { ElementNode, isElementNode } from '../../types/html.js';
import { ASTNode } from '../../ast/types.js';

/**
 * Helper to extract language info from class names
 * Supports common class naming patterns like:
 * - language-javascript
 * - lang-js
 * - brush: js
 * - javascript
 * @param classStr The class attribute string
 * @returns The language identifier, or null if not found
 */
function extractLanguage(classStr: string | null): string | null {
  if (!classStr) return null;
  
  // Common class patterns
  const patterns = [
    /language-(\w+)/i,
    /lang-(\w+)/i,
    /brush:\s*(\w+)/i,
    /^(\w+)$/i
  ];
  
  const classes = classStr.split(/\s+/);
  
  for (const className of classes) {
    for (const pattern of patterns) {
      const match = className.match(pattern);
      if (match?.[1]) {
        return match[1].toLowerCase();
      }
    }
  }
  
  return null;
}

/**
 * Rule for handling <pre> elements
 */
export const codeBlockRule: TagRule = {
  tagName: 'PRE',
  
  emit(node: ElementNode, _context: RuleContext): ASTNode {
    // If pre contains a code element, use its contents
    let codeNode: ElementNode | null = null;
    let language: string | null = null;
    
    // Check if this pre contains a code element
    for (const child of node.childNodes) {
      if (isElementNode(child) && child.tagName === 'CODE') {
        codeNode = child;
        
        // Try to extract language from code element
        language = extractLanguage(child.getAttribute('class'));
        break;
      }
    }
    
    // If no language was found on code element, try the pre element
    if (!language) {
      language = extractLanguage(node.getAttribute('class'));
    }
    
    // Get the code content
    let value: string;
    
    if (codeNode) {
      // Use the code element's text content
      value = codeNode.textContent;
    } else {
      // Use the pre element's text content
      value = node.textContent;
    }
    
    // Clean up the content
    // - Remove leading/trailing newlines
    // - Normalize line endings
    value = value.replace(/^\n+|\n+$/g, '');
    value = value.replace(/\r\n?/g, '\n');
    
    // Create the code block node
    return builder.codeBlock(value, language, null);
  }
};