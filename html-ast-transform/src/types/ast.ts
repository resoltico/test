/**
 * Represents a position in the source HTML document.
 */
export interface SourcePosition {
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
}

/**
 * Represents a DOCTYPE declaration in HTML.
 */
export interface Doctype {
  name: string;
  publicId: string;
  systemId: string;
}

/**
 * Base interface for all AST nodes.
 */
export interface AstNode {
  /** Type of the node (e.g., 'element', 'text', 'comment', 'document') */
  type: string;
  
  /** Element name (for element nodes) */
  name?: string;
  
  /** Text content (for text and comment nodes) */
  value?: string;
  
  /** Element attributes (for element nodes) */
  attributes?: Record<string, string>;
  
  /** Child nodes */
  children?: AstNode[];
  
  /** Parent node reference */
  parent?: AstNode;
  
  /** Position in source document */
  sourcePosition?: SourcePosition;
  
  /** Additional metadata */
  meta?: Record<string, unknown>;
}

/**
 * Represents an element node (e.g., <div>, <p>, <span>).
 */
export interface ElementNode extends AstNode {
  type: 'element';
  name: string;
  attributes: Record<string, string>;
  children: AstNode[];
  selfClosing?: boolean;
}

/**
 * Represents a text node.
 */
export interface TextNode extends AstNode {
  type: 'text';
  value: string;
}

/**
 * Represents a comment node (e.g., <!-- comment -->).
 */
export interface CommentNode extends AstNode {
  type: 'comment';
  value: string;
}

/**
 * Represents the root document node.
 */
export interface DocumentNode extends AstNode {
  type: 'document';
  children: AstNode[];
  doctype?: Doctype;
}

/**
 * Type guard for ElementNode.
 */
export function isElementNode(node: AstNode): node is ElementNode {
  return node.type === 'element';
}

/**
 * Type guard for TextNode.
 */
export function isTextNode(node: AstNode): node is TextNode {
  return node.type === 'text';
}

/**
 * Type guard for CommentNode.
 */
export function isCommentNode(node: AstNode): node is CommentNode {
  return node.type === 'comment';
}

/**
 * Type guard for DocumentNode.
 */
export function isDocumentNode(node: AstNode): node is DocumentNode {
  return node.type === 'document';
}
