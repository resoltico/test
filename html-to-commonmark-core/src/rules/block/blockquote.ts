/**
 * Rule for converting HTML blockquote elements to AST blockquote nodes
 */

import * as builder from '../../ast/builder.js';
import { TagRule, RuleContext } from '../base.js';
import { ElementNode } from '../../types/html.js';
import { ASTNode } from '../../ast/types.js';

/**
 * Rule for handling <blockquote> elements
 */
export const blockquoteRule: TagRule = {
  tagName: 'BLOCKQUOTE',
  
  emit(node: ElementNode, context: RuleContext): ASTNode {
    // Generate children AST
    const children = context.renderChildrenAsAst(node);
    
    // If there are no block elements in the children, wrap in a paragraph
    const needsParagraph = !children.some(child => 
      ['Paragraph', 'Heading', 'List', 'CodeBlock', 'ThematicBreak', 'Blockquote'].includes(child.type)
    );
    
    if (needsParagraph && children.length > 0) {
      return builder.blockquote([builder.paragraph(children)]);
    }
    
    // Create the blockquote node
    return builder.blockquote(children);
  }
};