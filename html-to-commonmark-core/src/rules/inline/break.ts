/**
 * Rule for converting HTML break elements to AST break nodes
 */

import * as builder from '../../ast/builder.js';
import { TagRule, RuleContext } from '../base.js';
import { ElementNode } from '../../types/html.js';
import { ASTNode } from '../../ast/types.js';

/**
 * Rule for handling <br> elements
 */
export const breakRule: TagRule = {
  tagName: 'BR',
  
  emit(_node: ElementNode, _context: RuleContext): ASTNode {
    // BR elements are hard breaks in CommonMark
    return builder.lineBreak(true);
  }
};