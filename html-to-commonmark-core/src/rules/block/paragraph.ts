/**
 * Rule for converting HTML paragraph elements to AST paragraph nodes
 */

import * as builder from '../../ast/builder.js';
import { TagRule, RuleContext } from '../base.js';
import { ElementNode } from '../../types/html.js';
import { ASTNode } from '../../ast/types.js';

/**
 * Rule for handling <p> elements
 */
export const paragraphRule: TagRule = {
  tagName: 'P',
  
  emit(node: ElementNode, context: RuleContext): ASTNode {
    // Skip empty paragraphs
    if (!node.textContent.trim()) {
      return builder.paragraph([]);
    }
    
    // Generate children AST
    const children = context.renderChildrenAsAst(node);
    
    // Create the paragraph node
    return builder.paragraph(children);
  }
};