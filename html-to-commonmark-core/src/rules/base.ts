/**
 * Base interfaces for HTML tag handling rules
 */

import { ASTNode, hasAncestor, getSiblings } from '../ast/types.js';
import { ElementNode, HtmlNode } from '../types/html.js';

/**
 * Interface for the rule context passed to rule implementations
 * Provides helper methods for traversing and analyzing the DOM
 */
export interface RuleContext {
  /**
   * Render the children of a node as AST nodes
   * @param node The HTML node whose children to render
   * @returns Array of AST nodes
   */
  renderChildrenAsAst(node: HtmlNode): ASTNode[];
  
  /**
   * Check if the current node is inside a specific tag
   * @param tagName The tag name to check for
   * @returns True if inside the specified tag, false otherwise
   */
  isInside(tagName: string): boolean;
  
  /**
   * Get the current list nesting depth
   * @returns The depth of list nesting
   */
  getListNestingDepth(): number;
  
  /**
   * Check if a node has siblings
   * @param node The node to check
   * @returns True if the node has siblings, false otherwise
   */
  hasSiblings(node: HtmlNode): boolean;
  
  /**
   * Check if a node is the first child of its parent
   * @param node The node to check
   * @returns True if the node is the first child, false otherwise
   */
  isFirstChild(node: HtmlNode): boolean;
  
  /**
   * Check if a node is the last child of its parent
   * @param node The node to check
   * @returns True if the node is the last child, false otherwise
   */
  isLastChild(node: HtmlNode): boolean;
  
  /**
   * Store a value in the context store
   * @param key The key to store the value under
   * @param value The value to store
   */
  store<T>(key: string, value: T): void;
  
  /**
   * Retrieve a value from the context store
   * @param key The key to retrieve
   * @returns The stored value, or undefined if not found
   */
  retrieve<T>(key: string): T | undefined;
  
  /**
   * Get the parent node of the current node
   * @returns The parent node, or null if none
   */
  getParentNode(): HtmlNode | null;
  
  /**
   * Get the depth of the current node in the DOM tree
   * @returns The depth
   */
  getDepth(): number;
  
  /**
   * Get the path of tags from the root to the current node
   * @returns Array of tag names
   */
  getTagPath(): string[];
  
  /**
   * Check if an AST node has an ancestor of a specific type
   * @param node The AST node to check
   * @param type The ancestor type to check for
   * @returns True if the node has an ancestor of the specified type
   */
  hasAncestor(node: ASTNode, type: string): boolean;
  
  /**
   * Check if an AST node has siblings
   * @param node The AST node to check
   * @returns True if the node has siblings, false otherwise
   */
  hasAstSiblings(node: ASTNode): boolean;
}

/**
 * Interface for HTML tag handling rules
 */
export interface TagRule {
  /**
   * Tag name this rule handles (uppercase)
   */
  tagName: string;
  
  /**
   * Process the node and emit AST nodes
   * @param node The HTML node to process
   * @param context The rule context
   * @returns AST node(s) or null if the node should be skipped
   */
  emit(node: ElementNode, context: RuleContext): ASTNode | ASTNode[] | null;
}

/**
 * Creates a basic implementation of the rule context
 * @param parentNodeStack Stack of parent nodes
 * @param walker Reference to the walker for rendering children
 * @returns A RuleContext implementation
 */
export function createRuleContext(
  parentNodeStack: HtmlNode[],
  walker: (node: HtmlNode) => ASTNode[],
): RuleContext {
  // Store for context data
  const store = new Map<string, unknown>();
  
  return {
    renderChildrenAsAst(node: HtmlNode): ASTNode[] {
      if ('childNodes' in node && Array.isArray((node as any).childNodes)) {
        const childNodes = (node as ElementNode).childNodes;
        const results: ASTNode[] = [];
        
        for (const child of childNodes) {
          const childResult = walker(child);
          results.push(...childResult);
        }
        
        return results;
      }
      
      return [];
    },
    
    isInside(tagName: string): boolean {
      const upperTagName = tagName.toUpperCase();
      
      return parentNodeStack.some(node => 
        'tagName' in node && 
        (node as ElementNode).tagName === upperTagName
      );
    },
    
    getListNestingDepth(): number {
      return parentNodeStack.filter(node => 
        'tagName' in node && 
        ['UL', 'OL'].includes((node as ElementNode).tagName)
      ).length;
    },
    
    hasSiblings(node: HtmlNode): boolean {
      if (!node.parentNode) return false;
      
      if ('childNodes' in node.parentNode) {
        return (node.parentNode as ElementNode).childNodes.length > 1;
      }
      
      return false;
    },
    
    isFirstChild(node: HtmlNode): boolean {
      if (!node.parentNode) return true;
      
      if ('childNodes' in node.parentNode) {
        const children = (node.parentNode as ElementNode).childNodes;
        return children[0] === node;
      }
      
      return false;
    },
    
    isLastChild(node: HtmlNode): boolean {
      if (!node.parentNode) return true;
      
      if ('childNodes' in node.parentNode) {
        const children = (node.parentNode as ElementNode).childNodes;
        return children[children.length - 1] === node;
      }
      
      return false;
    },
    
    store<T>(key: string, value: T): void {
      store.set(key, value);
    },
    
    retrieve<T>(key: string): T | undefined {
      return store.get(key) as T | undefined;
    },
    
    getParentNode(): HtmlNode | null {
      return parentNodeStack.length > 0 
        ? parentNodeStack[parentNodeStack.length - 1] 
        : null;
    },
    
    getDepth(): number {
      return parentNodeStack.length;
    },
    
    getTagPath(): string[] {
      return parentNodeStack
        .filter(node => 'tagName' in node)
        .map(node => (node as ElementNode).tagName);
    },
    
    hasAncestor(node: ASTNode, type: string): boolean {
      return hasAncestor(node, type);
    },
    
    hasAstSiblings(node: ASTNode): boolean {
      return getSiblings(node).length > 0;
    }
  };
}