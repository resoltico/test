/**
 * Rule for converting HTML anchor elements to AST link nodes
 */

import * as builder from '../../ast/builder.js';
import { TagRule, RuleContext } from '../base.js';
import { ElementNode } from '../../types/html.js';
import { ASTNode } from '../../ast/types.js';

/**
 * Rule for handling <a> elements
 */
export const linkRule: TagRule = {
  tagName: 'A',
  
  emit(node: ElementNode, context: RuleContext): ASTNode | null {
    // Get the href attribute
    const url = node.getAttribute('href') || '';
    
    // Skip anchor links without href
    if (!url && !node.hasAttribute('href')) {
      // Just render the children as normal text
      return builder.paragraph(context.renderChildrenAsAst(node));
    }
    
    // Get the title attribute
    const title = node.getAttribute('title');
    
    // Generate children AST
    const children = context.renderChildrenAsAst(node);
    
    // If no children, use the URL as the text
    if (children.length === 0) {
      return builder.link(url, title, [builder.text(url)]);
    }
    
    // Create the link node
    return builder.link(url, title, children);
  }
};