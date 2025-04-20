import type {
  AstNode,
  ElementNode,
  TextNode,
  CommentNode,
  DocumentNode,
  isElementNode,
  isTextNode,
  isCommentNode,
  isDocumentNode
} from '../types/index.js';

/**
 * Utility functions for working with AST nodes.
 */

/**
 * Find all nodes in the AST that match a predicate function.
 * 
 * @param node Root node to search from
 * @param predicate Function that returns true for matching nodes
 * @returns Array of matching nodes
 */
export function findNodes(node: AstNode, predicate: (node: AstNode) => boolean): AstNode[] {
  const results: AstNode[] = [];
  
  // Check if current node matches
  if (predicate(node)) {
    results.push(node);
  }
  
  // Check children
  if (node.children) {
    for (const child of node.children) {
      results.push(...findNodes(child, predicate));
    }
  }
  
  return results;
}

/**
 * Find all element nodes with a specific tag name.
 * 
 * @param node Root node to search from
 * @param tagName Tag name to search for (case-insensitive)
 * @returns Array of matching element nodes
 */
export function findElementsByTagName(node: AstNode, tagName: string): ElementNode[] {
  const normalizedTagName = tagName.toLowerCase();
  
  return findNodes(node, (n) => 
    isElementNode(n) && n.name.toLowerCase() === normalizedTagName
  ) as ElementNode[];
}

/**
 * Find all element nodes with a specific class name.
 * 
 * @param node Root node to search from
 * @param className Class name to search for
 * @returns Array of matching element nodes
 */
export function findElementsByClassName(node: AstNode, className: string): ElementNode[] {
  return findNodes(node, (n) => {
    if (!isElementNode(n)) return false;
    
    const classes = n.attributes.class ? n.attributes.class.split(/\s+/) : [];
    return classes.includes(className);
  }) as ElementNode[];
}

/**
 * Find all element nodes with a specific attribute.
 * 
 * @param node Root node to search from
 * @param attributeName Attribute name to search for
 * @param attributeValue Optional attribute value to match
 * @returns Array of matching element nodes
 */
export function findElementsByAttribute(
  node: AstNode, 
  attributeName: string, 
  attributeValue?: string
): ElementNode[] {
  return findNodes(node, (n) => {
    if (!isElementNode(n)) return false;
    
    if (attributeValue === undefined) {
      return attributeName in n.attributes;
    }
    
    return n.attributes[attributeName] === attributeValue;
  }) as ElementNode[];
}

/**
 * Find an element by its ID attribute.
 * 
 * @param node Root node to search from
 * @param id ID to search for
 * @returns Matching element node, or undefined if not found
 */
export function getElementById(node: AstNode, id: string): ElementNode | undefined {
  const results = findElementsByAttribute(node, 'id', id);
  return results.length > 0 ? results[0] : undefined;
}

/**
 * Create a new element node.
 * 
 * @param name Element tag name
 * @param attributes Element attributes
 * @param children Child nodes
 * @param parent Parent node
 * @returns New element node
 */
export function createElement(
  name: string,
  attributes: Record<string, string> = {},
  children: AstNode[] = [],
  parent?: AstNode
): ElementNode {
  const element: ElementNode = {
    type: 'element',
    name: name.toLowerCase(),
    attributes,
    children,
    parent,
    selfClosing: [
      'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
      'link', 'meta', 'param', 'source', 'track', 'wbr'
    ].includes(name.toLowerCase())
  };
  
  // Set parent reference in children
  for (const child of children) {
    child.parent = element;
  }
  
  return element;
}

/**
 * Create a new text node.
 * 
 * @param value Text content
 * @param parent Parent node
 * @returns New text node
 */
export function createTextNode(value: string, parent?: AstNode): TextNode {
  return {
    type: 'text',
    value,
    parent
  };
}

/**
 * Create a new comment node.
 * 
 * @param value Comment content
 * @param parent Parent node
 * @returns New comment node
 */
export function createCommentNode(value: string, parent?: AstNode): CommentNode {
  return {
    type: 'comment',
    value,
    parent
  };
}

/**
 * Get all text content from a node and its descendants.
 * 
 * @param node Node to get text from
 * @returns Combined text content
 */
export function getTextContent(node: AstNode): string {
  if (isTextNode(node)) {
    return node.value;
  }
  
  if (!node.children) {
    return '';
  }
  
  return node.children
    .map(child => getTextContent(child))
    .join('');
}

/**
 * Clone an AST node deeply.
 * 
 * @param node Node to clone
 * @param parent Optional parent for the cloned node
 * @returns Cloned node
 */
export function cloneNode(node: AstNode, parent?: AstNode): AstNode {
  // Use structuredClone for a deep copy without circular references
  const clonedNode = structuredClone({ ...node, parent: undefined, children: undefined });
  
  // Set parent reference
  if (parent) {
    clonedNode.parent = parent;
  }
  
  // Clone children if they exist
  if (node.children) {
    clonedNode.children = node.children.map(child => cloneNode(child, clonedNode));
  }
  
  return clonedNode;
}

/**
 * Insert a node before another node in its parent's children array.
 * 
 * @param newNode Node to insert
 * @param referenceNode Node to insert before
 * @returns True if the insertion was successful, false otherwise
 */
export function insertBefore(newNode: AstNode, referenceNode: AstNode): boolean {
  const parent = referenceNode.parent;
  
  if (!parent || !parent.children) {
    return false;
  }
  
  const index = parent.children.indexOf(referenceNode);
  
  if (index === -1) {
    return false;
  }
  
  // Set parent reference
  newNode.parent = parent;
  
  // Insert at the specified index
  parent.children.splice(index, 0, newNode);
  
  return true;
}

/**
 * Append a node as a child of another node.
 * 
 * @param parent Parent node
 * @param child Child node to append
 * @returns True if the append was successful, false otherwise
 */
export function appendChild(parent: AstNode, child: AstNode): boolean {
  if (!parent.children) {
    parent.children = [];
  }
  
  // Set parent reference
  child.parent = parent;
  
  // Append to children
  parent.children.push(child);
  
  return true;
}

/**
 * Remove a node from its parent.
 * 
 * @param node Node to remove
 * @returns True if the removal was successful, false otherwise
 */
export function removeNode(node: AstNode): boolean {
  const parent = node.parent;
  
  if (!parent || !parent.children) {
    return false;
  }
  
  const index = parent.children.indexOf(node);
  
  if (index === -1) {
    return false;
  }
  
  // Remove from parent's children
  parent.children.splice(index, 1);
  
  // Clear parent reference
  node.parent = undefined;
  
  return true;
}

/**
 * Replace a node with another node.
 * 
 * @param oldNode Node to replace
 * @param newNode Replacement node
 * @returns True if the replacement was successful, false otherwise
 */
export function replaceNode(oldNode: AstNode, newNode: AstNode): boolean {
  const parent = oldNode.parent;
  
  if (!parent || !parent.children) {
    return false;
  }
  
  const index = parent.children.indexOf(oldNode);
  
  if (index === -1) {
    return false;
  }
  
  // Set parent reference
  newNode.parent = parent;
  
  // Replace in parent's children
  parent.children[index] = newNode;
  
  // Clear parent reference in old node
  oldNode.parent = undefined;
  
  return true;
}

/**
 * Check if a node is a descendant of another node.
 * 
 * @param node Node to check
 * @param ancestor Potential ancestor node
 * @returns True if node is a descendant of ancestor, false otherwise
 */
export function isDescendantOf(node: AstNode, ancestor: AstNode): boolean {
  let current = node.parent;
  
  while (current) {
    if (current === ancestor) {
      return true;
    }
    current = current.parent;
  }
  
  return false;
}
