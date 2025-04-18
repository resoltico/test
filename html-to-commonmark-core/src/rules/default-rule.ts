/**
 * Default fallback rule for unhandled HTML tags
 */

import { TagRule, RuleContext } from './base.js';
import { ElementNode } from '../types/html.js';
import { ASTNode } from '../ast/types.js';

/**
 * Default fallback rule that processes children
 * Used when no specific rule is found for a tag
 */
export const defaultRule: TagRule = {
  tagName: '_DEFAULT_',
  
  emit(node: ElementNode, context: RuleContext): ASTNode[] {
    // Just render the children of the element
    return context.renderChildrenAsAst(node);
  }
};