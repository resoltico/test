/**
 * Rule for converting HTML emphasis elements to AST emphasis nodes
 */

import * as builder from '../../ast/builder.js';
import { TagRule, RuleContext } from '../base.js';
import { ElementNode } from '../../types/html.js';
import { ASTNode } from '../../ast/types.js';

/**
 * Rule for handling <em>, <i>, <cite>, <dfn> elements
 * All converted to emphasis in CommonMark
 */
export const emphasisRule: TagRule = {
  tagName: 'EM',
  
  emit(node: ElementNode, context: RuleContext): ASTNode | null {
    // Skip if the node is empty
    if (!node.textContent.trim()) {
      return null;
    }
    
    // Special case: check if this is actually used for strong (some legacy HTML uses nested em)
    if (node.tagName === 'EM' && 
        (context.isInside('STRONG') || context.isInside('B'))) {
      return builder.text(node.textContent);
    }
    
    // Generate children AST
    const children = context.renderChildrenAsAst(node);
    
    // If no children, return null
    if (children.length === 0) {
      return null;
    }
    
    // Create the emphasis node
    return builder.emphasis(children);
  }
};