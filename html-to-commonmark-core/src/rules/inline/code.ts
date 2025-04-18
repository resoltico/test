/**
 * Rule for converting HTML inline code elements to AST inline code nodes
 */

import * as builder from '../../ast/builder.js';
import { TagRule, RuleContext } from '../base.js';
import { ElementNode } from '../../types/html.js';
import { ASTNode } from '../../ast/types.js';

/**
 * Rule for handling <code> elements when not inside a <pre>
 * If inside a <pre>, it should be handled by the code block rule
 */
export const codeRule: TagRule = {
  tagName: 'CODE',
  
  emit(node: ElementNode, context: RuleContext): ASTNode | null {
    // If inside a pre element, let the code block rule handle it
    if (context.isInside('PRE')) {
      return null;
    }
    
    // Get the text content
    const value = node.textContent;
    
    // Create the inline code node
    return builder.inlineCode(value);
  }
};