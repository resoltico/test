/**
 * AST inline node creation utilities
 * Provides factory functions for creating inline AST nodes
 */

import {
  ASTNode,
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
} from '../types.js';
import { BaseNodeOptions, createParentNode } from './base.js';
import { debugLog } from '../../utils/debug.js';

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