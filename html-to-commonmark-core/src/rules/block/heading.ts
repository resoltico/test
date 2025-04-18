/**
 * Rule for converting HTML heading elements to AST heading nodes
 */

import * as builder from '../../ast/builder.js';
import { TagRule, RuleContext } from '../base.js';
import { ElementNode } from '../../types/html.js';
import { ASTNode } from '../../ast/types.js';

/**
 * Rule for handling heading elements (h1-h6)
 */
export const headingRule: TagRule = {
  tagName: 'H',
  
  emit(node: ElementNode, context: RuleContext): ASTNode | null {
    // Extract the level from the tag name (H1-H6)
    const tagName = node.tagName;
    const level = parseInt(tagName.charAt(1), 10);
    
    // Only handle h1-h6
    if (isNaN(level) || level < 1 || level > 6) {
      return null;
    }
    
    // Skip empty headings
    if (!node.textContent.trim()) {
      return builder.heading(level as 1 | 2 | 3 | 4 | 5 | 6, []);
    }
    
    // Generate children AST
    const children = context.renderChildrenAsAst(node);
    
    // Create the heading node
    return builder.heading(level as 1 | 2 | 3 | 4 | 5 | 6, children);
  }
};