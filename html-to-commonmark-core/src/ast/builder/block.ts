/**
 * AST block node creation utilities
 * Provides factory functions for creating block-level AST nodes
 */

import {
  ASTNode,
  HeadingNode,
  ParagraphNode,
  BlockquoteNode,
  ListNode,
  ListItemNode,
  CodeBlockNode,
  ThematicBreakNode,
  TableNode,
  TableRowNode,
  TableCellNode,
  HTMLNode,
} from '../types.js';
import { BaseNodeOptions, createParentNode } from './base.js';
import { debugLog } from '../../utils/debug.js';

/**
 * Creates a heading node
 * @param level Heading level (1-6)
 * @param children Child nodes
 * @param options Additional options
 * @returns A heading node
 */
export function heading(
  level: 1 | 2 | 3 | 4 | 5 | 6,
  children: ASTNode[] = [],
  options: BaseNodeOptions = {}
): HeadingNode {
  debugLog(`Creating heading node level ${level}`, "info");
  
  const node = createParentNode<HeadingNode>({
    type: 'Heading',
    level,
    children: [],
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  });
  
  // Add children with proper parent references
  for (const child of children) {
    node.appendChild(child);
  }
  
  return node;
}

/**
 * Creates a paragraph node
 * @param children Child nodes
 * @param options Additional options
 * @returns A paragraph node
 */
export function paragraph(
  children: ASTNode[] = [],
  options: BaseNodeOptions = {}
): ParagraphNode {
  debugLog("Creating paragraph node", "info");
  
  const node = createParentNode<ParagraphNode>({
    type: 'Paragraph',
    children: [],
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  });
  
  // Add children with proper parent references
  for (const child of children) {
    node.appendChild(child);
  }
  
  return node;
}

/**
 * Creates a blockquote node
 * @param children Child nodes
 * @param options Additional options
 * @returns A blockquote node
 */
export function blockquote(
  children: ASTNode[] = [],
  options: BaseNodeOptions = {}
): BlockquoteNode {
  debugLog("Creating blockquote node", "info");
  
  const node = createParentNode<BlockquoteNode>({
    type: 'Blockquote',
    children: [],
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  });
  
  // Add children with proper parent references
  for (const child of children) {
    node.appendChild(child);
  }
  
  return node;
}

/**
 * Creates a list node
 * @param ordered Whether the list is ordered
 * @param start Starting number for ordered lists
 * @param tight Whether the list is tight (no paragraph breaks)
 * @param children Child nodes
 * @param options Additional options
 * @returns A list node
 */
export function list(
  ordered: boolean = false,
  start: number | null = null,
  tight: boolean = true,
  children: ASTNode[] = [],
  options: BaseNodeOptions = {}
): ListNode {
  debugLog(`Creating ${ordered ? 'ordered' : 'unordered'} list with ${children.length} items`, "info");
  
  const node = createParentNode<ListNode>({
    type: 'List',
    ordered,
    start,
    tight,
    children: [],
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  });
  
  // Add children with proper parent references
  for (const child of children) {
    node.appendChild(child);
  }
  
  // Log for debugging - ensure ordered property is set correctly
  debugLog(`Created list with ordered=${node.ordered}`, "info");
  
  return node;
}

/**
 * Creates a list item node
 * @param children Child nodes
 * @param checked Whether the item is checked (for task lists)
 * @param options Additional options
 * @returns A list item node
 */
export function listItem(
  children: ASTNode[] = [],
  checked: boolean | null = null,
  options: BaseNodeOptions = {}
): ListItemNode {
  debugLog(`Creating list item node${checked !== null ? ` (checked=${checked})` : ''}`, "info");
  
  const node = createParentNode<ListItemNode>({
    type: 'ListItem',
    checked,
    children: [],
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  });
  
  // Add children with proper parent references
  for (const child of children) {
    node.appendChild(child);
  }
  
  return node;
}

/**
 * Creates a code block node
 * @param value Code content
 * @param language Programming language
 * @param meta Additional metadata
 * @param options Additional options
 * @returns A code block node
 */
export function codeBlock(
  value: string,
  language: string | null = null,
  meta: string | null = null,
  options: BaseNodeOptions = {}
): CodeBlockNode {
  debugLog(`Creating code block node ${language ? `with language ${language}` : 'without language'}`, "info");
  
  return {
    type: 'CodeBlock',
    value,
    language,
    meta,
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  };
}

/**
 * Creates a thematic break node
 * @param options Additional options
 * @returns A thematic break node
 */
export function thematicBreak(
  options: BaseNodeOptions = {}
): ThematicBreakNode {
  debugLog("Creating thematic break node", "info");
  
  return {
    type: 'ThematicBreak',
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  };
}

/**
 * Creates a table node
 * @param align Column alignments
 * @param children Child nodes (rows)
 * @param options Additional options
 * @returns A table node
 */
export function table(
  align: Array<'left' | 'right' | 'center' | null> = [],
  children: ASTNode[] = [],
  options: BaseNodeOptions = {}
): TableNode {
  debugLog(`Creating table node with ${children.length} rows and ${align.length} alignments`, "info");
  
  const node = createParentNode<TableNode>({
    type: 'Table',
    align,
    children: [],
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  });
  
  // Add children with proper parent references
  for (const child of children) {
    node.appendChild(child);
  }
  
  return node;
}

/**
 * Creates a table row node
 * @param isHeader Whether this is a header row
 * @param children Child nodes (cells)
 * @param options Additional options
 * @returns A table row node
 */
export function tableRow(
  isHeader: boolean = false,
  children: ASTNode[] = [],
  options: BaseNodeOptions = {}
): TableRowNode {
  debugLog(`Creating table row node (isHeader=${isHeader}) with ${children.length} cells`, "info");
  
  const node = createParentNode<TableRowNode>({
    type: 'TableRow',
    isHeader,
    children: [],
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  });
  
  // Add children with proper parent references
  for (const child of children) {
    node.appendChild(child);
  }
  
  return node;
}

/**
 * Creates a table cell node
 * @param children Child nodes
 * @param options Additional options
 * @returns A table cell node
 */
export function tableCell(
  children: ASTNode[] = [],
  options: BaseNodeOptions = {}
): TableCellNode {
  debugLog("Creating table cell node", "info");
  
  const node = createParentNode<TableCellNode>({
    type: 'TableCell',
    children: [],
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  });
  
  // Add children with proper parent references
  for (const child of children) {
    node.appendChild(child);
  }
  
  return node;
}

/**
 * Creates an HTML node
 * @param value HTML content
 * @param options Additional options
 * @returns An HTML node
 */
export function html(
  value: string,
  options: BaseNodeOptions = {}
): HTMLNode {
  debugLog("Creating HTML node", "info");
  
  return {
    type: 'HTML',
    value,
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  };
}