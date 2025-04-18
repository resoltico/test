/**
 * AST normalization utilities
 * Cleans up and validates AST nodes for consistency
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
      
      // Create a new node with the processed children
      const newNode = { ...node, children };
      result.push(newNode);
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
  const result: ASTNode[] = [];
  
  let lastNode: ASTNode | null = null;
  
  for (const node of ast) {
    // Process parent nodes recursively
    if (isParentNode(node)) {
      const parentNode = node as ParentNode & ASTNode;
      const children = mergeAdjacentTextNodes(parentNode.children);
      
      // Create a new node with the processed children
      const newNode = { ...node, children };
      
      // Add the node to the result
      lastNode = newNode;
      result.push(newNode);
    } else if (node.type === 'Text' && lastNode?.type === 'Text') {
      // Merge with previous text node
      const lastTextNode = lastNode as TextNode;
      const currentTextNode = node as TextNode;
      
      // Create a new text node with the merged content
      const mergedNode = builder.text(lastTextNode.value + currentTextNode.value);
      
      // Replace the last node with the merged one
      result[result.length - 1] = mergedNode;
      lastNode = mergedNode;
    } else {
      // Add non-text nodes or first text node
      lastNode = node;
      result.push(node);
    }
  }
  
  return result;
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
      let children = fixStructure(parentNode.children);
      
      // For block nodes, ensure children are valid
      if (isBlockNode(node)) {
        // For paragraphs, flatten nested paragraphs
        if (node.type === 'Paragraph') {
          children = flattenNestedParagraphs(children);
        }
        
        // Ensure block nodes don't contain other block nodes (except for specific types)
        if (!['Document', 'Blockquote', 'ListItem'].includes(node.type)) {
          children = ensureNoBlockNodes(children);
        }
      }
      
      // Create a new node with the processed children
      const newNode = { ...node, children };
      result.push(newNode);
    } else {
      // Include non-parent nodes
      result.push(node);
    }
  }
  
  return result;
}

/**
 * Flattens nested paragraphs
 * @param ast The AST to process
 * @returns The AST with nested paragraphs flattened
 */
function flattenNestedParagraphs(ast: ASTNode[]): ASTNode[] {
  const result: ASTNode[] = [];
  
  for (const node of ast) {
    if (node.type === 'Paragraph') {
      // Flatten nested paragraph
      result.push(...(node as ParentNode & ASTNode).children);
    } else {
      result.push(node);
    }
  }
  
  return result;
}

/**
 * Ensures an AST doesn't contain block nodes
 * @param ast The AST to process
 * @returns The AST with block nodes removed or transformed
 */
function ensureNoBlockNodes(ast: ASTNode[]): ASTNode[] {
  const result: ASTNode[] = [];
  
  for (const node of ast) {
    if (isBlockNode(node)) {
      // If it's a block node in an inline context, flatten its children
      if (isParentNode(node)) {
        result.push(...(node as ParentNode & ASTNode).children);
      }
    } else {
      result.push(node);
    }
  }
  
  return result;
}

/**
 * Normalizes tables in an AST
 * @param ast The AST to process
 * @returns The AST with tables normalized
 */
function normalizeTables(ast: ASTNode[]): ASTNode[] {
  const result: ASTNode[] = [];
  
  for (const node of ast) {
    if (node.type === 'Table') {
      // Normalize table
      result.push(normalizeTable(node as TableNode));
    } else if (isParentNode(node)) {
      // Process children recursively
      const parentNode = node as ParentNode & ASTNode;
      const children = normalizeTables(parentNode.children);
      
      // Create a new node with the processed children
      const newNode = { ...node, children };
      result.push(newNode);
    } else {
      // Include non-parent nodes
      result.push(node);
    }
  }
  
  return result;
}

/**
 * Normalizes a table node
 * @param table The table node to normalize
 * @returns The normalized table node
 */
function normalizeTable(table: TableNode): TableNode {
  // Clone the node
  const newTable = { ...table };
  
  // Ensure we have rows
  if (!isParentNode(newTable) || newTable.children.length === 0) {
    return newTable;
  }
  
  // Process rows
  const rows = newTable.children as TableRowNode[];
  
  // Ensure we have a header row
  if (!rows.some(row => row.isHeader)) {
    // Convert first row to header
    if (rows.length > 0) {
      rows[0] = { ...rows[0], isHeader: true };
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
  const normalizedRows = rows.map(row => {
    if (!isParentNode(row)) {
      return row;
    }
    
    const cells = row.children as TableCellNode[];
    
    // If we need to add cells
    if (cells.length < maxCells) {
      const newCells = [...cells];
      
      // Add empty cells
      for (let i = cells.length; i < maxCells; i++) {
        newCells.push(builder.tableCell([]));
      }
      
      return { ...row, children: newCells };
    }
    
    return row;
  });
  
  // Ensure alignments match cell count
  if (!newTable.align || newTable.align.length !== maxCells) {
    newTable.align = Array(maxCells).fill(null);
  }
  
  // Update the rows
  newTable.children = normalizedRows;
  
  return newTable;
}

/**
 * Normalizes lists in an AST
 * @param ast The AST to process
 * @returns The AST with lists normalized
 */
function normalizeLists(ast: ASTNode[]): ASTNode[] {
  const result: ASTNode[] = [];
  
  for (const node of ast) {
    if (node.type === 'List') {
      // Normalize list
      result.push(normalizeList(node as ListNode));
    } else if (isParentNode(node)) {
      // Process children recursively
      const parentNode = node as ParentNode & ASTNode;
      const children = normalizeLists(parentNode.children);
      
      // Create a new node with the processed children
      const newNode = { ...node, children };
      result.push(newNode);
    } else {
      // Include non-parent nodes
      result.push(node);
    }
  }
  
  return result;
}

/**
 * Normalizes a list node
 * @param list The list node to normalize
 * @returns The normalized list node
 */
function normalizeList(list: ListNode): ListNode {
  // Clone the node
  const newList = { ...list };
  
  // Ensure we have list items
  if (!isParentNode(newList) || newList.children.length === 0) {
    return newList;
  }
  
  // Process list items
  const items = newList.children as ListItemNode[];
  
  // Normalize list items
  const normalizedItems = items.map(item => {
    if (!isParentNode(item)) {
      return item;
    }
    
    // Ensure each list item has a block-level wrapper
    const children = item.children;
    
    if (children.length === 0) {
      return { ...item, children: [builder.paragraph([])] };
    }
    
    // If all children are inline, wrap in a paragraph
    if (children.every(child => isInlineNode(child))) {
      return { ...item, children: [builder.paragraph(children)] };
    }
    
    return item;
  });
  
  // Check if this is a task list (all items have checked property set)
  const isTaskList = normalizedItems.every(item => item.checked !== null);
  
  // If not all items are tasks but some are, make them consistent
  if (!isTaskList && normalizedItems.some(item => item.checked !== null)) {
    // Convert non-task items to unchecked tasks
    normalizedItems.forEach(item => {
      if (item.checked === null) {
        item.checked = false;
      }
    });
  }
  
  // Update the list items
  newList.children = normalizedItems;
  
  return newList;
}