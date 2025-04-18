/**
 * Rule for converting HTML hr elements to AST thematic break nodes
 */

import * as builder from '../../ast/builder.js';
import { TagRule, RuleContext } from '../base.js';
import { ElementNode } from '../../types/html.js';
import { ASTNode } from '../../ast/types.js';

/**
 * Rule for handling <hr> elements
 */
export const thematicBreakRule: TagRule = {
  tagName: 'HR',
  
  emit(_node: ElementNode, _context: RuleContext): ASTNode {
    // HR elements don't have content, just create a thematic break node
    return builder.thematicBreak();
  }
};