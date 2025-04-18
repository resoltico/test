/**
 * Abstract Syntax Tree (AST) type definitions for the CommonMark representation
 * Based on CommonMark spec version 0.31.2
 */

/**
 * Position information for AST nodes
 */
export interface Position {
  start: LinePosition;
  end: LinePosition;
}

/**
 * Line position information
 */
export interface LinePosition {
  line: number;
  column: number;
  offset: number;
}

/**
 * Base AST node interface that all node types extend
 */
export interface BaseNode {
  type: string;
  position?: Position;
  parent: (ParentNode & ASTNode) | null;  // Reference to parent node
  data?: Map<string, any>;    // Optional metadata
}

/**
 * Base interface for block nodes that contain children
 */
export interface ParentNode extends BaseNode {
  children: ASTNode[];
  
  // Helper methods for relationship management
  appendChild(node: ASTNode): void;
  removeChild(node: ASTNode): boolean;
  replaceChild(oldNode: ASTNode, newNode: ASTNode): boolean;
}

/**
 * Document node - root container for all other nodes
 */
export interface DocumentNode extends ParentNode {
  type: 'Document';
}

/**
 * Heading node - represents h1-h6 elements
 */
export interface HeadingNode extends ParentNode {
  type: 'Heading';
  level: 1 | 2 | 3 | 4 | 5 | 6;
}

/**
 * Paragraph node - represents p elements and other block-level text
 */
export interface ParagraphNode extends ParentNode {
  type: 'Paragraph';
}

/**
 * Blockquote node - represents blockquote elements
 */
export interface BlockquoteNode extends ParentNode {
  type: 'Blockquote';
}

/**
 * List node - represents ul or ol elements
 */
export interface ListNode extends ParentNode {
  type: 'List';
  ordered: boolean;
  start: number | null;
  tight: boolean;
}

/**
 * List item node - represents li elements
 */
export interface ListItemNode extends ParentNode {
  type: 'ListItem';
  checked: boolean | null;
}

/**
 * Code block node - represents pre/code blocks
 */
export interface CodeBlockNode extends BaseNode {
  type: 'CodeBlock';
  value: string;
  language: string | null;
  meta: string | null;
}

/**
 * Thematic break node - represents hr elements
 */
export interface ThematicBreakNode extends BaseNode {
  type: 'ThematicBreak';
}

/**
 * Table node (GFM extension) - represents table elements
 */
export interface TableNode extends ParentNode {
  type: 'Table';
  align: Array<'left' | 'right' | 'center' | null>;
}

/**
 * Table row node (GFM extension) - represents tr elements
 */
export interface TableRowNode extends ParentNode {
  type: 'TableRow';
  isHeader: boolean;
}

/**
 * Table cell node (GFM extension) - represents th/td elements
 */
export interface TableCellNode extends ParentNode {
  type: 'TableCell';
}

/**
 * HTML node - represents embedded HTML in markdown
 */
export interface HTMLNode extends BaseNode {
  type: 'HTML';
  value: string;
}

/**
 * Text node - represents plain text content
 */
export interface TextNode extends BaseNode {
  type: 'Text';
  value: string;
}

/**
 * Emphasis node - represents em elements
 */
export interface EmphasisNode extends ParentNode {
  type: 'Emphasis';
}

/**
 * Strong node - represents strong elements
 */
export interface StrongNode extends ParentNode {
  type: 'Strong';
}

/**
 * Link node - represents a elements
 */
export interface LinkNode extends ParentNode {
  type: 'Link';
  url: string;
  title: string | null;
}

/**
 * Image node - represents img elements
 */
export interface ImageNode extends ParentNode {
  type: 'Image';
  url: string;
  title: string | null;
  alt: string;
}

/**
 * Inline code node - represents inline code elements
 */
export interface InlineCodeNode extends BaseNode {
  type: 'InlineCode';
  value: string;
}

/**
 * Break node - represents br elements or soft line breaks
 */
export interface BreakNode extends BaseNode {
  type: 'Break';
  hard: boolean;
}

/**
 * Strikethrough node (GFM extension) - represents del or s elements
 */
export interface StrikethroughNode extends ParentNode {
  type: 'Strikethrough';
}

/**
 * Footnote definition node (GFM extension)
 */
export interface FootnoteDefinitionNode extends ParentNode {
  type: 'FootnoteDefinition';
  identifier: string;
  label: string;
}

/**
 * Footnote reference node (GFM extension)
 */
export interface FootnoteReferenceNode extends BaseNode {
  type: 'FootnoteReference';
  identifier: string;
  label: string;
}

/**
 * Union type of all possible AST nodes
 */
export type ASTNode =
  | DocumentNode
  | HeadingNode
  | ParagraphNode
  | BlockquoteNode
  | ListNode
  | ListItemNode
  | CodeBlockNode
  | ThematicBreakNode
  | TableNode
  | TableRowNode
  | TableCellNode
  | HTMLNode
  | TextNode
  | EmphasisNode
  | StrongNode
  | LinkNode
  | ImageNode
  | InlineCodeNode
  | BreakNode
  | StrikethroughNode
  | FootnoteDefinitionNode
  | FootnoteReferenceNode;

/**
 * Type guard to check if a node is a parent node
 */
export function isParentNode(node: ASTNode | ParentNode | null): node is ParentNode & ASTNode {
  return node !== null &&
    'children' in node &&
    Array.isArray((node as ParentNode).children);
}

/**
 * Type guard to check if a node is a block node
 */
export function isBlockNode(node: ASTNode): boolean {
  return [
    'Document',
    'Paragraph',
    'Heading',
    'Blockquote',
    'List',
    'ListItem',
    'CodeBlock',
    'ThematicBreak',
    'Table',
    'TableRow',
    'FootnoteDefinition'
  ].includes(node.type);
}

/**
 * Type guard to check if a node is an inline node
 */
export function isInlineNode(node: ASTNode): boolean {
  return [
    'Text',
    'Emphasis',
    'Strong',
    'Link',
    'Image',
    'InlineCode',
    'Break',
    'Strikethrough',
    'FootnoteReference',
    'HTML'
  ].includes(node.type);
}

/**
 * Gets the ancestors of a node
 * @param node The node to get ancestors for
 * @returns Array of ancestor nodes from immediate parent to root
 */
export function getAncestors(node: ASTNode): ASTNode[] {
  const ancestors: ASTNode[] = [];
  let current = node.parent;
  
  while (current) {
    ancestors.push(current);
    current = current.parent;
  }
  
  return ancestors;
}

/**
 * Checks if a node has an ancestor of a specific type
 * @param node The node to check
 * @param type The ancestor type to look for
 * @returns True if the node has an ancestor of the specified type
 */
export function hasAncestor(node: ASTNode, type: string): boolean {
  let current = node.parent;
  
  while (current) {
    if (current.type === type) {
      return true;
    }
    current = current.parent;
  }
  
  return false;
}

/**
 * Gets the root node of a tree
 * @param node Any node in the tree
 * @returns The root node
 */
export function getRoot(node: ASTNode): ASTNode {
  let current = node;
  
  while (current.parent) {
    current = current.parent;
  }
  
  return current;
}

/**
 * Gets siblings of a node
 * @param node The node to get siblings for
 * @returns Array of sibling nodes or empty array if no parent
 */
export function getSiblings(node: ASTNode): ASTNode[] {
  if (!node.parent) {
    return [];
  }
  
  return node.parent.children.filter(child => child !== node);
}

/**
 * Gets the previous sibling of a node
 * @param node The node to get the previous sibling for
 * @returns The previous sibling or null if none
 */
export function getPreviousSibling(node: ASTNode): ASTNode | null {
  if (!node.parent) {
    return null;
  }
  
  const siblings = node.parent.children;
  const index = siblings.indexOf(node);
  
  if (index <= 0) {
    return null;
  }
  
  return siblings[index - 1];
}

/**
 * Gets the next sibling of a node
 * @param node The node to get the next sibling for
 * @returns The next sibling or null if none
 */
export function getNextSibling(node: ASTNode): ASTNode | null {
  if (!node.parent) {
    return null;
  }
  
  const siblings = node.parent.children;
  const index = siblings.indexOf(node);
  
  if (index === -1 || index >= siblings.length - 1) {
    return null;
  }
  
  return siblings[index + 1];
}