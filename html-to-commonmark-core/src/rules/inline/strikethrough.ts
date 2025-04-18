/**
 * Rule for converting HTML strikethrough elements to AST strikethrough nodes
 */

import * as builder from '../../ast/builder.js';
import { TagRule, RuleContext } from '../base.js';
import { ElementNode } from '../../types/html.js';
import { ASTNode } from '../../ast/types.js';

/**
 * Rule for handling <del>, <s>, and <strike> elements
 * This is a GFM extension to CommonMark
 */
export const strikethroughRule: TagRule = {
  tagName: 'DEL',
  
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
    
    // Create the strikethrough node
    return builder.strikethrough(children);
  }
};