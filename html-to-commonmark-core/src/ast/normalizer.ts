/**
 * AST normalization utilities
 * Cleans up and validates AST nodes for consistency while preserving relationships
 */

import {
  ASTNode,
  ParentNode,
  TextNode,
  isParentNode,
  isBlockNode,
  isInlineNode,
  TableNode,
  TableRowNode,
  TableCellNode,
  ListNode,
  ListItemNode,
} from './types.js';
import * as builder from './builder.js';
import { NormalizationError } from '../utils/errors.js';
import { 
  verifyRelationships, 
  fixRelationships, 
  detachFromParent,
  attachToParent
} from './relationship.js';

/**
 * Options for AST normalization
 */
export interface NormalizerOptions {
  /**
   * Whether to remove empty nodes
   */
  removeEmpty?: boolean;
  
  /**
   * Whether to merge adjacent text nodes
   */
  mergeText?: boolean;
  
  /**
   * Whether to ensure nodes are in the correct nested structure
   */
  fixStructure?: boolean;
  
  /**
   * Whether to normalize tables (e.g., ensure header rows)
   */
  normalizeTables?: boolean;
  
  /**
   * Whether to normalize lists (e.g., ensure consistent item structure)
   */
  normalizeLists?: boolean;
  
  /**
   * Whether to verify and fix relationships after normalization
   */
  verifyRelationships?: boolean;
}

/**
 * Default normalizer options
 */
const DEFAULT_OPTIONS: NormalizerOptions = {
  removeEmpty: true,
  mergeText: true,
  fixStructure: true,
  normalizeTables: true,
  normalizeLists: true,
  verifyRelationships: true,
};

/**
 * Normalizes an AST
 * @param ast The AST to normalize
 * @param options Normalizer options
 * @returns The normalized AST
 */
export function normalizeAst(ast: ASTNode[], options?: NormalizerOptions): ASTNode[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  try {
    let result = [...ast];
    
    // Remove empty nodes
    if (opts.removeEmpty) {
      result = removeEmptyNodes(result);
    }
    
    // Fix structure issues
    if (opts.fixStructure) {
      result = fixStructure(result);
    }
    
    // Merge adjacent text nodes
    if (opts.mergeText) {
      result = mergeAdjacentTextNodes(result);
    }
    
    // Normalize tables
    if (opts.normalizeTables) {
      result = normalizeTables(result);
    }
    
    // Normalize lists
    if (opts.normalizeLists) {
      result = normalizeLists(result);
    }
    
    // Verify and fix relationships if needed
    if (opts.verifyRelationships) {
      if (!verifyRelationships(result)) {
        result = fixRelationships(result);
      }
    }
    
    return result;
  } catch (error) {
    throw new NormalizationError('Failed to normalize AST', {
      cause: error instanceof Error ? error : new Error(String(error)),
    });
  }
}

/**
 * Removes empty nodes from an AST
 * @param ast The AST to process
 * @returns The AST with empty nodes removed
 */
function removeEmptyNodes(ast: ASTNode[]): ASTNode[] {
  const result: ASTNode[] = [];
  
  for (const node of ast) {
    // Skip empty text nodes
    if (node.type === 'Text' && (node as TextNode).value.trim() === '') {
      continue;
    }
    
    // Process parent nodes recursively
    if (isParentNode(node)) {
      const parentNode = node as ParentNode & ASTNode;
      const children = removeEmptyNodes(parentNode.children);
      
      // Skip parent nodes with no children except for certain types that are valid even empty
      if (children.length === 0 && !['Document', 'TableCell', 'ListItem'].includes(node.type)) {
        continue;
      }
      
      // Update children with preserved relationships
      parentNode.children = [];
      for (const child of children) {
        parentNode.appendChild(child);
      }
      
      result.push(parentNode);
    } else {
      // Include non-parent nodes
      result.push(node);
    }
  }
  
  return result;
}

/**
 * Merges adjacent text nodes in an AST
 * @param ast The AST to process
 * @returns The AST with adjacent text nodes merged
 */
function mergeAdjacentTextNodes(ast: ASTNode[]): ASTNode[] {
  if (!isParentNode(ast[0]?.parent)) {
    // If we're at the root or nodes don't share a parent, process each node individually
    const result: ASTNode[] = [];
    
    for (const node of ast) {
      if (isParentNode(node)) {
        // Process children recursively
        const parentNode = node as ParentNode & ASTNode;
        mergeAdjacentTextNodes(parentNode.children);
        result.push(node);
      } else {
        result.push(node);
      }
    }
    
    return result;
  }
  
  // Get the parent of these nodes since they share one
  const parent = ast[0].parent as ParentNode & ASTNode;
  const children = [...parent.children]; // Work with a copy
  
  // Clear parent's children
  parent.children = [];
  
  // Process and reattach children
  let prevTextNode: TextNode | null = null;
  
  for (const node of children) {
    if (node.type === 'Text' && prevTextNode) {
      // Merge with previous text node
      prevTextNode.value += (node as TextNode).value;
    } else if (node.type === 'Text') {
      // First text node, remember it
      prevTextNode = node as TextNode;
      parent.appendChild(node);
    } else {
      // Not a text node, reset prevTextNode
      prevTextNode = null;
      
      // Process children of parent nodes
      if (isParentNode(node)) {
        mergeAdjacentTextNodes(node.children);
      }
      
      parent.appendChild(node);
    }
  }
  
  // Return the original array
  return ast;
}

/**
 * Fixes structural issues in an AST
 * @param ast The AST to process
 * @returns The AST with structural issues fixed
 */
function fixStructure(ast: ASTNode[]): ASTNode[] {
  const result: ASTNode[] = [];
  
  for (const node of ast) {
    // Process parent nodes recursively
    if (isParentNode(node)) {
      const parentNode = node as ParentNode & ASTNode;
      
      // Process children
      fixStructure(parentNode.children);
      
      // For block nodes, ensure children are valid
      if (isBlockNode(node)) {
        // For paragraphs, flatten nested paragraphs
        if (node.type === 'Paragraph') {
          flattenNestedParagraphs(node);
        }
        
        // Ensure block nodes don't contain other block nodes (except for specific types)
        if (!['Document', 'Blockquote', 'ListItem'].includes(node.type)) {
          ensureNoBlockNodes(node);
        }
      }
      
      result.push(node);
    } else {
      // Include non-parent nodes
      result.push(node);
    }
  }
  
  return result;
}

/**
 * Flattens nested paragraphs
 * @param node The paragraph node to process
 */
function flattenNestedParagraphs(node: ParentNode & ASTNode): void {
  if (node.type !== 'Paragraph') return;
  
  const newChildren: ASTNode[] = [];
  
  for (const child of node.children) {
    if (child.type === 'Paragraph') {
      // Add the paragraph's children directly
      for (const nestedChild of (child as ParentNode).children) {
        nestedChild.parent = node;
        newChildren.push(nestedChild);
      }
    } else {
      newChildren.push(child);
    }
  }
  
  // Replace children while preserving relationships
  node.children = [];
  for (const child of newChildren) {
    node.appendChild(child);
  }
}

/**
 * Ensures a block node doesn't contain other block nodes
 * @param node The block node to process
 */
function ensureNoBlockNodes(node: ParentNode & ASTNode): void {
  const newChildren: ASTNode[] = [];
  
  for (const child of node.children) {
    if (isBlockNode(child)) {
      // If it's a block node in an inline context, extract its children
      if (isParentNode(child)) {
        for (const nestedChild of (child as ParentNode).children) {
          nestedChild.parent = node;
          newChildren.push(nestedChild);
        }
      }
    } else {
      newChildren.push(child);
    }
  }
  
  // Replace children while preserving relationships
  node.children = [];
  for (const child of newChildren) {
    node.appendChild(child);
  }
}

/**
 * Normalizes tables in an AST
 * @param ast The AST to process
 * @returns The AST with tables normalized
 */
function normalizeTables(ast: ASTNode[]): ASTNode[] {
  for (const node of ast) {
    if (node.type === 'Table') {
      // Normalize table
      normalizeTable(node as TableNode);
    } else if (isParentNode(node)) {
      // Process children recursively
      normalizeTables(node.children);
    }
  }
  
  return ast;
}

/**
 * Normalizes a table node
 * @param table The table node to normalize
 * @returns The normalized table node
 */
function normalizeTable(table: TableNode): TableNode {
  // Ensure we have rows
  if (!isParentNode(table) || table.children.length === 0) {
    return table;
  }
  
  // Process rows
  const rows = table.children as TableRowNode[];
  
  // Ensure we have a header row
  if (!rows.some(row => row.isHeader)) {
    // Convert first row to header
    if (rows.length > 0) {
      rows[0].isHeader = true;
    }
  }
  
  // Determine max cell count
  const maxCells = rows.reduce((max, row) => {
    if (isParentNode(row)) {
      return Math.max(max, row.children.length);
    }
    return max;
  }, 0);
  
  // Normalize cell count in each row
  for (const row of rows) {
    if (!isParentNode(row)) continue;
    
    const cells = row.children as TableCellNode[];
    
    // If we need to add cells
    if (cells.length < maxCells) {
      // Add empty cells
      for (let i = cells.length; i < maxCells; i++) {
        const newCell = builder.tableCell([], { parent: row });
        row.appendChild(newCell);
      }
    }
  }
  
  // Ensure alignments match cell count
  if (!table.align || table.align.length !== maxCells) {
    table.align = Array(maxCells).fill(null);
  }
  
  return table;
}

/**
 * Normalizes lists in an AST
 * @param ast The AST to process
 * @returns The AST with lists normalized
 */
function normalizeLists(ast: ASTNode[]): ASTNode[] {
  for (const node of ast) {
    if (node.type === 'List') {
      // Normalize list
      normalizeList(node as ListNode);
    } else if (isParentNode(node)) {
      // Process children recursively
      normalizeLists(node.children);
    }
  }
  
  return ast;
}

/**
 * Normalizes a list node
 * @param list The list node to normalize
 * @returns The normalized list node
 */
function normalizeList(list: ListNode): ListNode {
  // Ensure we have list items
  if (!isParentNode(list) || list.children.length === 0) {
    return list;
  }
  
  // Process list items
  const items = list.children as ListItemNode[];
  
  // Normalize list items
  for (const item of items) {
    if (!isParentNode(item)) continue;
    
    // Ensure each list item has a block-level wrapper
    const children = item.children;
    
    if (children.length === 0) {
      const paragraph = builder.paragraph([], { parent: item });
      item.appendChild(paragraph);
      continue;
    }
    
    // If all children are inline, wrap in a paragraph
    if (children.every(child => isInlineNode(child))) {
      // Create new paragraph to hold the inline nodes
      const paragraph = builder.paragraph([], { parent: item });
      
      // Move all children to paragraph
      const childrenCopy = [...children];
      item.children = [];
      
      // Add paragraph as first child
      item.appendChild(paragraph);
      
      // Move all original children to paragraph
      for (const child of childrenCopy) {
        paragraph.appendChild(child);
      }
    }
  }
  
  // Check if this is a task list (all items have checked property set)
  const isTaskList = items.every(item => item.checked !== null);
  
  // If not all items are tasks but some are, make them consistent
  if (!isTaskList && items.some(item => item.checked !== null)) {
    // Convert non-task items to unchecked tasks
    for (const item of items) {
      if (item.checked === null) {
        item.checked = false;
      }
    }
  }
  
  return list;
}