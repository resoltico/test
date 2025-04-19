/**
 * AST node base creation utilities
 * Provides factory functions for creating basic AST nodes with proper parent-child relationships
 */

import {
  ASTNode,
  ParentNode,
  Position,
  DocumentNode,
} from '../types.js';
import { debugLog } from '../../utils/debug.js';

/**
 * Base options for all AST nodes
 */
export interface BaseNodeOptions {
  position?: Position;
  parent?: (ParentNode & ASTNode) | null;
  data?: Map<string, any>;
}

/**
 * Create a basic parent node with properly implemented methods
 * @param props The properties of the node
 * @returns A node with parent methods implemented
 */
export function createParentNode<T extends ParentNode & ASTNode>(props: Omit<T, 'appendChild' | 'removeChild' | 'replaceChild'>): T {
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