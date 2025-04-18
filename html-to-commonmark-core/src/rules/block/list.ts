/**
 * Rules for converting HTML list elements to AST list and list item nodes
 */

import * as builder from '../../ast/builder.js';
import { TagRule, RuleContext } from '../base.js';
import { ElementNode, isElementNode } from '../../types/html.js';
import { ASTNode } from '../../ast/types.js';

/**
 * Helper function to determine if a list is tight
 * A list is tight if none of its list items contain blank lines
 * @param node List element
 * @returns true if the list is tight, false otherwise
 */
function isTightList(node: ElementNode): boolean {
  // Check if any list items have paragraphs with blank lines
  for (const child of node.childNodes) {
    if (!isElementNode(child) || child.tagName !== 'LI') {
      continue;
    }
    
    // If a list item has multiple block elements, it's a loose list
    let blockCount = 0;
    for (const itemChild of child.childNodes) {
      if (isElementNode(itemChild)) {
        const tagName = itemChild.tagName;
        if (['P', 'BLOCKQUOTE', 'PRE', 'UL', 'OL', 'DIV'].includes(tagName)) {
          blockCount++;
        }
      }
    }
    
    if (blockCount > 1) {
      return false;
    }
  }
  
  return true;
}

/**
 * Helper function to parse the start attribute of an ordered list
 * @param node Ordered list element
 * @returns The starting number, or null if not specified
 */
function parseListStart(node: ElementNode): number | null {
  const start = node.getAttribute('start');
  
  if (start && /^\d+$/.test(start)) {
    return parseInt(start, 10);
  }
  
  return null;
}

/**
 * Checks if a list item has a task checkbox
 * @param node List item element
 * @returns The checked state, or null if not a task item
 */
function getTaskCheckboxState(node: ElementNode): boolean | null {
  // Look for inputs that might be checkboxes
  const inputs = node.getElementsByTagName('input');
  
  for (const input of inputs) {
    // Check if it's a checkbox
    if (input.getAttribute('type')?.toLowerCase() === 'checkbox') {
      // Check if it's checked
      return input.hasAttribute('checked');
    }
  }
  
  return null;
}

/**
 * Rule for handling <ul> (unordered list) elements
 */
export const unorderedListRule: TagRule = {
  tagName: 'UL',
  
  emit(node: ElementNode, context: RuleContext): ASTNode {
    // Generate children AST (should be list items)
    const children = context.renderChildrenAsAst(node);
    
    // Determine if this is a tight list
    const tight = isTightList(node);
    
    // Create the list node
    return builder.list(false, null, tight, children);
  }
};

/**
 * Rule for handling <ol> (ordered list) elements
 */
export const orderedListRule: TagRule = {
  tagName: 'OL',
  
  emit(node: ElementNode, context: RuleContext): ASTNode {
    // Generate children AST (should be list items)
    const children = context.renderChildrenAsAst(node);
    
    // Determine if this is a tight list
    const tight = isTightList(node);
    
    // Parse the start attribute
    const start = parseListStart(node);
    
    // Create the list node
    return builder.list(true, start, tight, children);
  }
};

/**
 * Rule for handling <li> (list item) elements
 */
export const listItemRule: TagRule = {
  tagName: 'LI',
  
  emit(node: ElementNode, context: RuleContext): ASTNode {
    // Check if we're inside a list
    if (!context.isInside('UL') && !context.isInside('OL')) {
      // Not inside a list, wrap in a paragraph
      const children = context.renderChildrenAsAst(node);
      return builder.paragraph(children);
    }
    
    // Check if this is a task list item
    const checked = getTaskCheckboxState(node);
    
    // Generate children AST
    let children = context.renderChildrenAsAst(node);
    
    // If first child is an input (checkbox), filter it out
    if (checked !== null && children.length > 0) {
      // Remove the checkbox from children if it's there
      children = children.filter(child => 
        !(child.type === 'HTML' && 
          /input.*type\s*=\s*["']?checkbox["']?/i.test((child as any).value))
      );
    }
    
    // Process children - if no block elements, wrap in a paragraph
    const hasBlockElement = children.some(child => 
      ['Paragraph', 'Heading', 'List', 'CodeBlock', 'ThematicBreak', 'Blockquote'].includes(child.type)
    );
    
    if (!hasBlockElement && children.length > 0) {
      // Create a paragraph to hold the children
      const paragraph = builder.paragraph();
      
      // Add all children to the paragraph
      for (const child of children) {
        paragraph.appendChild(child);
      }
      
      children = [paragraph];
    }
    
    // Create the list item node
    return builder.listItem(children, checked);
  }
};

/**
 * Export all list-related rules
 */
export const listRules: TagRule[] = [
  unorderedListRule,
  orderedListRule,
  listItemRule,
];