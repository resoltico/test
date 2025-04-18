/**
 * Rule for converting HTML span elements to appropriate AST nodes
 */

import * as builder from '../../ast/builder.js';
import { TagRule, RuleContext } from '../base.js';
import { ElementNode } from '../../types/html.js';
import { ASTNode } from '../../ast/types.js';

/**
 * Rule for handling <span> elements
 * 
 * Strategy:
 * - Check for common styling patterns (like font-weight: bold, etc.)
 * - Otherwise, just render the children
 */
export const spanRule: TagRule = {
  tagName: 'SPAN',
  
  emit(node: ElementNode, context: RuleContext): ASTNode | ASTNode[] {
    // Skip if the node is empty
    if (!node.textContent.trim()) {
      return [];
    }
    
    // Generate children AST
    const children = context.renderChildrenAsAst(node);
    
    // If no children, return empty array
    if (children.length === 0) {
      return [];
    }
    
    // Check for styling that would indicate specific formatting
    const style = node.getAttribute('style') || '';
    
    // Check for font-weight: bold
    if (/font-weight\s*:\s*(bold|[6-9]00)/i.test(style)) {
      return builder.strong(children);
    }
    
    // Check for font-style: italic
    if (/font-style\s*:\s*italic/i.test(style)) {
      return builder.emphasis(children);
    }
    
    // Check for text-decoration: line-through
    if (/text-decoration\s*:[^;]*line-through/i.test(style)) {
      return builder.strikethrough(children);
    }
    
    // Check for role=heading or aria-level
    if (node.getAttribute('role') === 'heading') {
      // Check for aria-level
      const levelStr = node.getAttribute('aria-level');
      let level = 2; // Default to h2
      
      if (levelStr && /^[1-6]$/.test(levelStr)) {
        level = parseInt(levelStr, 10);
      }
      
      return builder.heading(level as 1 | 2 | 3 | 4 | 5 | 6, children);
    }
    
    // No special formatting, just return the children
    return children;
  }
};