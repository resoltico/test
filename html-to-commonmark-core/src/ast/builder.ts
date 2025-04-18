/**
 * AST node creation utilities
 * Provides factory functions for creating AST nodes
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
} from './types.js';

/**
 * Base options for all AST nodes
 */
interface BaseNodeOptions {
  position?: Position;
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
  return {
    type: 'Document',
    children,
    ...options,
  };
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
  return {
    type: 'Heading',
    level,
    children,
    ...options,
  };
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
  return {
    type: 'Paragraph',
    children,
    ...options,
  };
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
  return {
    type: 'Blockquote',
    children,
    ...options,
  };
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
  return {
    type: 'List',
    ordered,
    start,
    tight,
    children,
    ...options,
  };
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
  return {
    type: 'ListItem',
    checked,
    children,
    ...options,
  };
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
    ...options,
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
  return {
    type: 'ThematicBreak',
    ...options,
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
  return {
    type: 'Table',
    align,
    children,
    ...options,
  };
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
  return {
    type: 'TableRow',
    isHeader,
    children,
    ...options,
  };
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
  return {
    type: 'TableCell',
    children,
    ...options,
  };
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
    ...options,
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
  return {
    type: 'Text',
    value,
    ...options,
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
  return {
    type: 'Emphasis',
    children,
    ...options,
  };
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
  return {
    type: 'Strong',
    children,
    ...options,
  };
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
  return {
    type: 'Link',
    url,
    title,
    children,
    ...options,
  };
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
  return {
    type: 'Image',
    url,
    title,
    alt,
    children,
    ...options,
  };
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
    ...options,
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
  return {
    type: 'Break',
    hard,
    ...options,
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
  return {
    type: 'Strikethrough',
    children,
    ...options,
  };
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
  return {
    type: 'FootnoteDefinition',
    identifier,
    label,
    children,
    ...options,
  };
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
    ...options,
  };
}