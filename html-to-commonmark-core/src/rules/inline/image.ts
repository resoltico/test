/**
 * Rule for converting HTML image elements to AST image nodes
 */

import * as builder from '../../ast/builder.js';
import { TagRule, RuleContext } from '../base.js';
import { ElementNode } from '../../types/html.js';
import { ASTNode } from '../../ast/types.js';

/**
 * Rule for handling <img> elements
 */
export const imageRule: TagRule = {
  tagName: 'IMG',
  
  emit(node: ElementNode, _context: RuleContext): ASTNode | null {
    // Get the src attribute
    const url = node.getAttribute('src') || '';
    
    // Skip images without src
    if (!url) {
      return null;
    }
    
    // Get the alt and title attributes
    const alt = node.getAttribute('alt') || '';
    const title = node.getAttribute('title');
    
    // Create the image node
    return builder.image(url, title, alt);
  }
};