/**
 * Rule for converting HTML image elements to AST image nodes
 */

import { TagRule, RuleContext } from '../base.js';
import { ElementNode } from '../../types/html.js';
import { ASTNode } from '../../ast/types.js';
import * as builder from '../../ast/builder.js';
import { debugLog } from '../../utils/debug.js';

/**
 * Rule for handling <img> elements
 */
export const imageRule: TagRule = {
  tagName: 'IMG',
  
  emit(node: ElementNode, _context: RuleContext): ASTNode | null {
    debugLog('Processing image element', 'info');
    
    // Get the src attribute
    const url = node.getAttribute('src') || '';
    
    // Skip images without src
    if (!url) {
      debugLog('Image has no src attribute, skipping', 'warn');
      return null;
    }
    
    // Get the alt and title attributes
    const alt = node.getAttribute('alt') || '';
    const title = node.getAttribute('title');
    
    debugLog('Creating image node', 'info', { url, alt, title });
    
    // Create the image node with explicit properties
    const imageNode = builder.image(url, title, alt);
    
    // Validate the image node has all required properties
    if (!imageNode.url) {
      debugLog('Created image node is missing url property', 'error');
    }
    
    return imageNode;
  }
};