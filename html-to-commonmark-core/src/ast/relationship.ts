/**
 * Relationship management for AST nodes
 * Provides utilities for establishing and maintaining parent-child relationships
 */

import { ASTNode, ParentNode, isParentNode } from './types.js';

/**
 * Establishes parent-child relationships throughout an AST
 * @param nodes The AST nodes to process
 * @returns The same nodes with relationships established
 */
export function establishRelationships(nodes: ASTNode[]): ASTNode[] {
  // First pass: implement ParentNode interface methods on all parent nodes
  for (const node of nodes) {
    if (isParentNode(node)) {
      implementParentNodeMethods(node);
    }
  }

  // Second pass: establish parent-child relationships
  for (const node of nodes) {
    if (isParentNode(node)) {
      for (const child of node.children) {
        child.parent = node;
        
        // Recursively establish relationships for this child's children if it's a parent
        if (isParentNode(child)) {
          establishRelationships(child.children);
        }
      }
    }
  }
  
  return nodes;
}

/**
 * Implements the ParentNode interface methods on a node
 * @param node The node to implement methods on
 */
function implementParentNodeMethods(node: ParentNode & ASTNode): void {
  // Implement appendChild method
  node.appendChild = function(childNode: ASTNode): void {
    // Set parent reference
    childNode.parent = this;
    
    // Add to children array
    this.children.push(childNode);
  };
  
  // Implement removeChild method
  node.removeChild = function(childNode: ASTNode): boolean {
    const index = this.children.indexOf(childNode);
    
    if (index !== -1) {
      // Remove from children array
      this.children.splice(index, 1);
      
      // Clear parent reference
      childNode.parent = null;
      
      return true;
    }
    
    return false;
  };
  
  // Implement replaceChild method
  node.replaceChild = function(oldNode: ASTNode, newNode: ASTNode): boolean {
    const index = this.children.indexOf(oldNode);
    
    if (index !== -1) {
      // Replace in children array
      this.children[index] = newNode;
      
      // Clear old parent reference
      oldNode.parent = null;
      
      // Set new parent reference
      newNode.parent = this;
      
      return true;
    }
    
    return false;
  };
}

/**
 * Verifies parent-child relationships throughout an AST
 * @param nodes The AST nodes to verify
 * @returns True if all relationships are valid
 */
export function verifyRelationships(nodes: ASTNode[]): boolean {
  let valid = true;
  
  for (const node of nodes) {
    if (isParentNode(node)) {
      // Check that all children point back to this node as parent
      for (const child of node.children) {
        if (child.parent !== node) {
          console.error(`Parent-child relationship error: Child ${child.type} does not have correct parent reference`);
          valid = false;
        }
      }
      
      // Recursively check children
      if (!verifyRelationships(node.children)) {
        valid = false;
      }
    }
  }
  
  return valid;
}

/**
 * Fixes broken parent-child relationships throughout an AST
 * @param nodes The AST nodes to fix
 * @returns The same nodes with relationships fixed
 */
export function fixRelationships(nodes: ASTNode[]): ASTNode[] {
  for (const node of nodes) {
    if (isParentNode(node)) {
      // Make sure all children have correct parent reference
      for (const child of node.children) {
        child.parent = node;
      }
      
      // Recursively fix children
      fixRelationships(node.children);
    }
  }
  
  return nodes;
}

/**
 * Creates a deep clone of an AST with relationships preserved
 * @param nodes The AST nodes to clone
 * @returns A deep clone of the AST with relationships preserved
 */
export function cloneWithRelationships(nodes: ASTNode[]): ASTNode[] {
  // Create a map to store node mappings (original -> clone)
  const nodeMap = new Map<ASTNode, ASTNode>();
  
  // First pass: create all nodes without relationships
  function createNodeClone(node: ASTNode): ASTNode {
    // Create a shallow clone without children
    const clone = { ...node, parent: null } as ASTNode;
    
    // If it's a parent node, create an empty children array
    if (isParentNode(node)) {
      (clone as ParentNode).children = [];
    }
    
    // Store in map
    nodeMap.set(node, clone);
    
    return clone;
  }
  
  // Create all node clones first
  for (const node of nodes) {
    createNodeClone(node);
  }
  
  // Second pass: establish relationships
  for (const originalNode of nodes) {
    const clonedNode = nodeMap.get(originalNode)!;
    
    // Set children if it's a parent node
    if (isParentNode(originalNode) && isParentNode(clonedNode)) {
      // Clone all children
      for (const originalChild of originalNode.children) {
        // Get or create child clone
        let clonedChild = nodeMap.get(originalChild);
        
        if (!clonedChild) {
          clonedChild = createNodeClone(originalChild);
        }
        
        // Add child to parent
        clonedNode.children.push(clonedChild);
        
        // Set parent reference
        clonedChild.parent = clonedNode;
      }
    }
  }
  
  // Return the cloned nodes
  return nodes.map(node => nodeMap.get(node)!);
}

/**
 * Detaches a node from its parent
 * @param node The node to detach
 * @returns The detached node
 */
export function detachFromParent(node: ASTNode): ASTNode {
  if (node.parent) {
    node.parent.removeChild(node);
  }
  
  return node;
}

/**
 * Attaches a node to a new parent at a specific index
 * @param node The node to attach
 * @param parent The new parent
 * @param index Optional index to insert at (appends if not specified)
 * @returns The attached node
 */
export function attachToParent(node: ASTNode, parent: ParentNode & ASTNode, index?: number): ASTNode {
  // First detach from current parent if any
  detachFromParent(node);
  
  // Set new parent
  node.parent = parent;
  
  // Add to children array at specific index or append
  if (index !== undefined && index >= 0 && index <= parent.children.length) {
    parent.children.splice(index, 0, node);
  } else {
    parent.children.push(node);
  }
  
  return node;
}

/**
 * Replaces a node with another
 * @param oldNode The node to replace
 * @param newNode The replacement node
 * @returns True if replacement was successful
 */
export function replaceNode(oldNode: ASTNode, newNode: ASTNode): boolean {
  if (!oldNode.parent) {
    return false;
  }
  
  return oldNode.parent.replaceChild(oldNode, newNode);
}

/**
 * Inserts a node before a reference node
 * @param newNode The node to insert
 * @param referenceNode The reference node to insert before
 * @returns True if insertion was successful
 */
export function insertBefore(newNode: ASTNode, referenceNode: ASTNode): boolean {
  if (!referenceNode.parent) {
    return false;
  }
  
  const parent = referenceNode.parent;
  const index = parent.children.indexOf(referenceNode);
  
  if (index === -1) {
    return false;
  }
  
  // Detach from current parent if any
  detachFromParent(newNode);
  
  // Add to parent's children
  parent.children.splice(index, 0, newNode);
  
  // Set parent reference
  newNode.parent = parent;
  
  return true;
}

/**
 * Inserts a node after a reference node
 * @param newNode The node to insert
 * @param referenceNode The reference node to insert after
 * @returns True if insertion was successful
 */
export function insertAfter(newNode: ASTNode, referenceNode: ASTNode): boolean {
  if (!referenceNode.parent) {
    return false;
  }
  
  const parent = referenceNode.parent;
  const index = parent.children.indexOf(referenceNode);
  
  if (index === -1) {
    return false;
  }
  
  // Detach from current parent if any
  detachFromParent(newNode);
  
  // Add to parent's children
  parent.children.splice(index + 1, 0, newNode);
  
  // Set parent reference
  newNode.parent = parent;
  
  return true;
}