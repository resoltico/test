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

import { implementParentNodeMethods } from './relationship.js';

/**
 * Base options for all AST nodes
 */
interface BaseNodeOptions {
  position?: Position;
  parent?: ParentNode & ASTNode;
  data?: Map<string, any>;
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
  const node: DocumentNode = {
    type: 'Document',
    children: [],
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  } as DocumentNode;
  
  // Implement parent node methods
  implementParentNodeMethods(node);
  
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
  const node: HeadingNode = {
    type: 'Heading',
    level,
    children: [],
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  } as HeadingNode;
  
  // Implement parent node methods
  implementParentNodeMethods(node);
  
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
  const node: ParagraphNode = {
    type: 'Paragraph',
    children: [],
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  } as ParagraphNode;
  
  // Implement parent node methods
  implementParentNodeMethods(node);
  
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
  const node: BlockquoteNode = {
    type: 'Blockquote',
    children: [],
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  } as BlockquoteNode;
  
  // Implement parent node methods
  implementParentNodeMethods(node);
  
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
  const node: ListNode = {
    type: 'List',
    ordered,
    start,
    tight,
    children: [],
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  } as ListNode;
  
  // Implement parent node methods
  implementParentNodeMethods(node);
  
  // Add children with proper parent references
  for (const child of children) {
    node.appendChild(child);
  }
  
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
  const node: ListItemNode = {
    type: 'ListItem',
    checked,
    children: [],
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  } as ListItemNode;
  
  // Implement parent node methods
  implementParentNodeMethods(node);
  
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
  return {
    type: 'CodeBlock',
    value,
    language,
    meta,
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  } as CodeBlockNode;
}

/**
 * Creates a thematic break node
 * @param options Additional options
 * @returns A thematic break node
 */
export function thematicBreak(
  options: BaseNodeOptions = {}
): ThematicBreakNode {
  return {
    type: 'ThematicBreak',
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  } as ThematicBreakNode;
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
  const node: TableNode = {
    type: 'Table',
    align,
    children: [],
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  } as TableNode;
  
  // Implement parent node methods
  implementParentNodeMethods(node);
  
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
  const node: TableRowNode = {
    type: 'TableRow',
    isHeader,
    children: [],
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  } as TableRowNode;
  
  // Implement parent node methods
  implementParentNodeMethods(node);
  
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
  const node: TableCellNode = {
    type: 'TableCell',
    children: [],
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  } as TableCellNode;
  
  // Implement parent node methods
  implementParentNodeMethods(node);
  
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
  return {
    type: 'HTML',
    value,
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  } as HTMLNode;
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
  return {
    type: 'Text',
    value,
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  } as TextNode;
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
  const node: EmphasisNode = {
    type: 'Emphasis',
    children: [],
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  } as EmphasisNode;
  
  // Implement parent node methods
  implementParentNodeMethods(node);
  
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
  const node: StrongNode = {
    type: 'Strong',
    children: [],
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  } as StrongNode;
  
  // Implement parent node methods
  implementParentNodeMethods(node);
  
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
  const node: LinkNode = {
    type: 'Link',
    url,
    title,
    children: [],
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  } as LinkNode;
  
  // Implement parent node methods
  implementParentNodeMethods(node);
  
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
 * @param children Child nodes
 * @param options Additional options
 * @returns An image node
 */
export function image(
  url: string,
  title: string | null = null,
  alt: string = '',
  children: ASTNode[] = [],
  options: BaseNodeOptions = {}
): ImageNode {
  const node: ImageNode = {
    type: 'Image',
    url,
    title,
    alt,
    children: [],
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  } as ImageNode;
  
  // Implement parent node methods
  implementParentNodeMethods(node);
  
  // Add children with proper parent references
  for (const child of children) {
    node.appendChild(child);
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
  return {
    type: 'InlineCode',
    value,
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  } as InlineCodeNode;
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
  return {
    type: 'Break',
    hard,
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  } as BreakNode;
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
  const node: StrikethroughNode = {
    type: 'Strikethrough',
    children: [],
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  } as StrikethroughNode;
  
  // Implement parent node methods
  implementParentNodeMethods(node);
  
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
  const node: FootnoteDefinitionNode = {
    type: 'FootnoteDefinition',
    identifier,
    label,
    children: [],
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  } as FootnoteDefinitionNode;
  
  // Implement parent node methods
  implementParentNodeMethods(node);
  
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
  return {
    type: 'FootnoteReference',
    identifier,
    label,
    parent: options.parent || null,
    position: options.position,
    data: options.data,
  } as FootnoteReferenceNode;
}