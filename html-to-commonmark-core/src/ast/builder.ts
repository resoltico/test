/**
 * AST node creation utilities
 * Provides factory functions for creating AST nodes with proper parent-child relationships
 */

import {
  ASTNode,
  DocumentNode,
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
  TextNode,
  EmphasisNode,
  StrongNode,
  LinkNode,
  ImageNode,
  InlineCodeNode,
  BreakNode,
  StrikethroughNode,
  FootnoteDefinitionNode,
  FootnoteReferenceNode,
  Position,
  ParentNode,
} from './types.js';
import { debugLog } from '../utils/debug.js';

/**
 * Base options for all AST nodes
 */
interface BaseNodeOptions {
  position?: Position;
  parent?: (ParentNode & ASTNode) | null;
  data?: Map<string, any>;
}

/**
 * Create a basic parent node with properly implemented methods
 * @param props The properties of the node
 * @returns A node with parent methods implemented
 */
function createParentNode<T extends ParentNode & ASTNode>(props: Omit<T, 'appendChild' | 'removeChild' | 'replaceChild'>): T {
  const node = props as unknown as T;
  
  // Add required methods
  node.appendChild = function(childNode: ASTNode): void {
    debugLog(`Appending child of type ${childNode.type} to parent of type ${this.type}`, "info");
    childNode.parent = this;
    this.children.push(childNode);
  };
  
  node.removeChild = function(childNode: ASTNode): boolean {
    const index = this.children.indexOf(childNode);
    if (index !== -1) {
      this.children.splice(index, 1);
      childNode.parent = null;
      return true;
    }
    return false;
  };
  
  node.replaceChild = function(oldNode: ASTNode, newNode: ASTNode): boolean {
    const index = this.children.indexOf(oldNode);
    if (index !== -1) {
      this.children[index] = newNode;
      oldNode.parent = null;
      newNode.parent = this;
      return true;
    }
    return false;
  };
  
  return node;
}

/**
 * Creates a document node
 * @param children Child nodes
 * @param options Additional options
 * @returns A document node
 */
export function document(
  children: ASTNode[] = [],
  options: BaseNodeOptions = {}
): DocumentNode {
  debugLog("Creating document node", "info");
  
  const node = createParentNode<DocumentNode>({
    type: 'Document',
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

/**
 * Creates a text node
 * @param value Text content
 * @param options Additional options
 * @returns A text node
 */
export function text(
  value: string,
  options: BaseNodeOptions = {}
): TextNode {
  debugLog(`Creating text node: "${value.length > 30 ? value.substring(0, 27) + '...' : value}"`, "info");
  
  return {
    type: 'Text',
    value,
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  };
}

/**
 * Creates an emphasis node
 * @param children Child nodes
 * @param options Additional options
 * @returns An emphasis node
 */
export function emphasis(
  children: ASTNode[] = [],
  options: BaseNodeOptions = {}
): EmphasisNode {
  debugLog("Creating emphasis node", "info");
  
  const node = createParentNode<EmphasisNode>({
    type: 'Emphasis',
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
 * Creates a strong node
 * @param children Child nodes
 * @param options Additional options
 * @returns A strong node
 */
export function strong(
  children: ASTNode[] = [],
  options: BaseNodeOptions = {}
): StrongNode {
  debugLog("Creating strong node", "info");
  
  const node = createParentNode<StrongNode>({
    type: 'Strong',
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
 * Creates a link node
 * @param url Link URL
 * @param title Link title
 * @param children Child nodes
 * @param options Additional options
 * @returns A link node
 */
export function link(
  url: string,
  title: string | null = null,
  children: ASTNode[] = [],
  options: BaseNodeOptions = {}
): LinkNode {
  debugLog(`Creating link node: url=${url}`, "info");
  
  const node = createParentNode<LinkNode>({
    type: 'Link',
    url,
    title,
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
 * Creates an image node
 * @param url Image URL
 * @param title Image title
 * @param alt Alt text
 * @param options Additional options
 * @returns An image node
 */
export function image(
  url: string,
  title: string | null = null,
  alt: string = '',
  options: BaseNodeOptions = {}
): ImageNode {
  debugLog(`Creating image node: url=${url}, alt=${alt}`, "info");
  
  // Create the image node properly
  const node = createParentNode<ImageNode>({
    type: 'Image',
    url,
    title,
    alt,
    children: [],
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  });
  
  // Double-check that required properties are set
  if (!node.url) {
    debugLog(`WARNING: Image node created without URL!`, "warn");
  }
  
  return node;
}

/**
 * Creates an inline code node
 * @param value Code content
 * @param options Additional options
 * @returns An inline code node
 */
export function inlineCode(
  value: string,
  options: BaseNodeOptions = {}
): InlineCodeNode {
  debugLog("Creating inline code node", "info");
  
  return {
    type: 'InlineCode',
    value,
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  };
}

/**
 * Creates a break node
 * @param hard Whether it's a hard break
 * @param options Additional options
 * @returns A break node
 */
export function lineBreak(
  hard: boolean = false,
  options: BaseNodeOptions = {}
): BreakNode {
  debugLog(`Creating ${hard ? 'hard' : 'soft'} break node`, "info");
  
  return {
    type: 'Break',
    hard,
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  };
}

/**
 * Creates a strikethrough node
 * @param children Child nodes
 * @param options Additional options
 * @returns A strikethrough node
 */
export function strikethrough(
  children: ASTNode[] = [],
  options: BaseNodeOptions = {}
): StrikethroughNode {
  debugLog("Creating strikethrough node", "info");
  
  const node = createParentNode<StrikethroughNode>({
    type: 'Strikethrough',
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
 * Creates a footnote definition node
 * @param identifier Footnote identifier
 * @param label Footnote label
 * @param children Child nodes
 * @param options Additional options
 * @returns A footnote definition node
 */
export function footnoteDefinition(
  identifier: string,
  label: string,
  children: ASTNode[] = [],
  options: BaseNodeOptions = {}
): FootnoteDefinitionNode {
  debugLog(`Creating footnote definition node: ${identifier}`, "info");
  
  const node = createParentNode<FootnoteDefinitionNode>({
    type: 'FootnoteDefinition',
    identifier,
    label,
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
 * Creates a footnote reference node
 * @param identifier Footnote identifier
 * @param label Footnote label
 * @param options Additional options
 * @returns A footnote reference node
 */
export function footnoteReference(
  identifier: string,
  label: string,
  options: BaseNodeOptions = {}
): FootnoteReferenceNode {
  debugLog(`Creating footnote reference node: ${identifier}`, "info");
  
  return {
    type: 'FootnoteReference',
    identifier,
    label,
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  };
}