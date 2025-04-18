/**
 * Rule for converting HTML div elements to appropriate AST nodes
 */

import * as builder from '../../ast/builder.js';
import { TagRule, RuleContext } from '../base.js';
import { ElementNode, isElementNode } from '../../types/html.js';
import { ASTNode } from '../../ast/types.js';

/**
 * Rule for handling <div> elements
 * 
 * Strategy:
 * - If div is empty or only has whitespace, ignore it
 * - If div has block elements as direct children, just render the children
 * - If div has only inline content, wrap in a paragraph
 * - Special case for divs with role=heading, convert to heading
 */
export const divRule: TagRule = {
  tagName: 'DIV',
  
  emit(node: ElementNode, context: RuleContext): ASTNode | ASTNode[] {
    // Special case: if div has role="heading", treat as heading
    if (node.getAttribute('role') === 'heading') {
      // Check for aria-level
      const levelStr = node.getAttribute('aria-level');
      let level = 2; // Default to h2
      
      if (levelStr && /^[1-6]$/.test(levelStr)) {
        level = parseInt(levelStr, 10);
      }
      
      const children = context.renderChildrenAsAst(node);
      return builder.heading(level as 1 | 2 | 3 | 4 | 5 | 6, children);
    }
    
    // Check if div is empty or only has whitespace
    if (!node.textContent.trim()) {
      return [];
    }
    
    // Generate children AST
    const children = context.renderChildrenAsAst(node);
    
    // If no children, return empty array
    if (children.length === 0) {
      return [];
    }
    
    // Check if div has block elements as direct children
    const hasBlockChildren = node.childNodes.some(child => {
      if (!isElementNode(child)) return false;
      
      const tagName = child.tagName;
      return [
        'DIV', 'P', 'BLOCKQUOTE', 'UL', 'OL', 'LI',
        'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
        'PRE', 'HR', 'TABLE'
      ].includes(tagName);
    });
    
    // If div has block children, just return the children
    if (hasBlockChildren) {
      return children;
    }
    
    // Otherwise, wrap in a paragraph
    return builder.paragraph(children);
  }
};