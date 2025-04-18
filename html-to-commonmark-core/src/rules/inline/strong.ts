/**
 * Rule for converting HTML strong elements to AST strong nodes
 */

import * as builder from '../../ast/builder.js';
import { TagRule, RuleContext } from '../base.js';
import { ElementNode } from '../../types/html.js';
import { ASTNode } from '../../ast/types.js';

/**
 * Rule for handling <strong> and <b> elements
 */
export const strongRule: TagRule = {
  tagName: 'STRONG',
  
  emit(node: ElementNode, context: RuleContext): ASTNode | null {
    // Skip if the node is empty
    if (!node.textContent.trim()) {
      return null;
    }
    
    // Generate children AST
    const children = context.renderChildrenAsAst(node);
    
    // If no children, return null
    if (children.length === 0) {
      return null;
    }
    
    // Create the strong node
    return builder.strong(children);
  }
};