/**
 * Rules for converting HTML table elements to AST table nodes
 */

import * as builder from '../../ast/builder.js';
import { TagRule, RuleContext } from '../base.js';
import { ElementNode, isElementNode } from '../../types/html.js';
import { ASTNode } from '../../ast/types.js';

/**
 * Determines the alignment for a table cell from its style or align attribute
 * @param node Table cell element
 * @returns The alignment ('left', 'center', 'right', or null)
 */
function determineAlignment(node: ElementNode): 'left' | 'center' | 'right' | null {
  // Check align attribute
  const align = node.getAttribute('align')?.toLowerCase();
  if (align === 'left' || align === 'center' || align === 'right') {
    return align as 'left' | 'center' | 'right';
  }
  
  // Check style attribute for text-align
  const style = node.getAttribute('style');
  if (style) {
    const textAlignMatch = style.match(/text-align\s*:\s*(left|center|right)/i);
    if (textAlignMatch) {
      return textAlignMatch[1].toLowerCase() as 'left' | 'center' | 'right';
    }
  }
  
  return null;
}

/**
 * Extracts column alignments from the first row of a table
 * @param node Table element
 * @returns Array of alignments for each column
 */
function extractColumnAlignments(node: ElementNode): Array<'left' | 'center' | 'right' | null> {
  const alignments: Array<'left' | 'center' | 'right' | null> = [];
  
  // Look for thead
  const thead = node.getElementsByTagName('thead')[0];
  if (thead) {
    const rows = thead.getElementsByTagName('tr');
    if (rows.length > 0) {
      const cells = rows[0].getElementsByTagName('th').length > 0
        ? rows[0].getElementsByTagName('th')
        : rows[0].getElementsByTagName('td');
      
      for (const cell of cells) {
        alignments.push(determineAlignment(cell));
      }
      
      return alignments;
    }
  }
  
  // If no thead, look at the first row
  const rows = node.getElementsByTagName('tr');
  if (rows.length > 0) {
    const cells = rows[0].getElementsByTagName('th').length > 0
      ? rows[0].getElementsByTagName('th')
      : rows[0].getElementsByTagName('td');
    
    for (const cell of cells) {
      alignments.push(determineAlignment(cell));
    }
  }
  
  return alignments;
}

/**
 * Rule for handling <table> elements
 */
export const tableRule: TagRule = {
  tagName: 'TABLE',
  
  emit(node: ElementNode, context: RuleContext): ASTNode {
    // Extract column alignments
    const align = extractColumnAlignments(node);
    
    // Generate children AST (table rows)
    const children = context.renderChildrenAsAst(node);
    
    // Create the table node
    return builder.table(align, children);
  }
};

/**
 * Rule for handling <thead> elements
 * Simply renders the children as the rows will be processed by the tr rule
 */
export const theadRule: TagRule = {
  tagName: 'THEAD',
  
  emit(node: ElementNode, context: RuleContext): ASTNode[] {
    // Just render the children, marking them as header rows
    context.store('isHeaderRow', true);
    const children = context.renderChildrenAsAst(node);
    context.store('isHeaderRow', false);
    
    return children;
  }
};

/**
 * Rule for handling <tbody> elements
 * Simply renders the children as the rows will be processed by the tr rule
 */
export const tbodyRule: TagRule = {
  tagName: 'TBODY',
  
  emit(node: ElementNode, context: RuleContext): ASTNode[] {
    // Just render the children
    return context.renderChildrenAsAst(node);
  }
};

/**
 * Rule for handling <tr> (table row) elements
 */
export const trRule: TagRule = {
  tagName: 'TR',
  
  emit(node: ElementNode, context: RuleContext): ASTNode {
    // Check if we're in a header row
    const isHeader = context.retrieve<boolean>('isHeaderRow') || 
                     context.isInside('THEAD') ||
                     node.childNodes.some(child => 
                       isElementNode(child) && child.tagName === 'TH'
                     );
    
    // Generate children AST (table cells)
    const children = context.renderChildrenAsAst(node);
    
    // Create the table row node
    return builder.tableRow(isHeader, children);
  }
};

/**
 * Rule for handling <th> (table header cell) elements
 */
export const thRule: TagRule = {
  tagName: 'TH',
  
  emit(node: ElementNode, context: RuleContext): ASTNode {
    // Generate children AST
    const children = context.renderChildrenAsAst(node);
    
    // Create the table cell node
    return builder.tableCell(children);
  }
};

/**
 * Rule for handling <td> (table data cell) elements
 */
export const tdRule: TagRule = {
  tagName: 'TD',
  
  emit(node: ElementNode, context: RuleContext): ASTNode {
    // Generate children AST
    const children = context.renderChildrenAsAst(node);
    
    // Create the table cell node
    return builder.tableCell(children);
  }
};

/**
 * Export all table-related rules
 */
export const tableRules: TagRule[] = [
  tableRule,
  theadRule,
  tbodyRule,
  trRule,
  thRule,
  tdRule,
];