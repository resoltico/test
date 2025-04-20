import { performance } from 'node:perf_hooks';

import type {
  AstNode,
  ElementNode,
  TextNode,
  Transformer,
  TransformerOptions,
  TransformResult,
  isElementNode,
  isTextNode
} from '../types/index.js';

/**
 * Interface for individual transformation operations.
 */
export interface TransformOperation {
  /**
   * Name of the operation for identification.
   */
  name: string;
  
  /**
   * Transform a node according to operation-specific rules.
   * 
   * @param node Node to transform
   * @param context Context information for the transformation
   * @returns Transformed node, or null to remove the node
   */
  transform(node: AstNode, context: TransformContext): AstNode | null;
  
  /**
   * Check if the operation should be applied to the given node.
   * 
   * @param node Node to check
   * @returns True if the operation should be applied, false otherwise
   */
  shouldApply(node: AstNode): boolean;
}

/**
 * Context information for transformation operations.
 */
export interface TransformContext {
  /**
   * The path of nodes from the root to the current node.
   */
  path: AstNode[];
  
  /**
   * Operation-specific context data.
   */
  data: Record<string, unknown>;
}

/**
 * AST transformer implementation that applies a sequence of transformation operations.
 * Uses Node.js v22+ features for improved performance.
 */
export class AstTransformer implements Transformer {
  private operations: TransformOperation[];
  
  /**
   * Create a new AST transformer with the given operations.
   * 
   * @param operations Transformation operations to apply
   */
  constructor(operations: TransformOperation[] = []) {
    this.operations = structuredClone(operations);
  }
  
  /**
   * Add a transformation operation.
   * 
   * @param operation Operation to add
   */
  addOperation(operation: TransformOperation): void {
    this.operations.push(operation);
  }
  
  /**
   * Remove a transformation operation by name.
   * 
   * @param name Name of the operation to remove
   * @returns True if the operation was removed, false if it wasn't found
   */
  removeOperation(name: string): boolean {
    const initialLength = this.operations.length;
    this.operations = this.operations.filter(op => op.name !== name);
    return this.operations.length !== initialLength;
  }
  
  /**
   * Transform an AST by applying all registered operations.
   * 
   * @param ast AST to transform
   * @param options Transformation options
   * @returns TransformResult containing the transformed AST and metadata
   */
  async transform(ast: AstNode, options: TransformerOptions = {}): Promise<TransformResult> {
    const startTime = options.collectMetrics ? performance.now() : 0;
    const context: TransformContext = { path: [], data: {} };
    
    // Deep clone the AST to avoid modifying the original
    const clonedAst = structuredClone(ast);
    
    // Track transformation metrics
    const transformedNodeCount = { value: 0 };
    
    // Apply transformations
    const transformedAst = this.transformNode(clonedAst, context, transformedNodeCount);
    
    // Create metadata
    const meta: TransformResult['meta'] = {};
    
    if (options.collectMetrics) {
      meta.transformTime = performance.now() - startTime;
      meta.nodesTransformed = transformedNodeCount.value;
    }
    
    return {
      ast: transformedAst || clonedAst,
      meta
    };
  }
  
  /**
   * Transform a single node by applying all applicable operations.
   * 
   * @param node Node to transform
   * @param context Transformation context
   * @param transformedNodeCount Counter for transformed nodes
   * @returns Transformed node, or null to remove the node
   */
  private transformNode(
    node: AstNode,
    context: TransformContext,
    transformedNodeCount: { value: number }
  ): AstNode | null {
    // Push current node to the path
    context.path.push(node);
    
    // Apply operations to the current node
    let transformedNode = node;
    let nodeWasTransformed = false;
    
    for (const operation of this.operations) {
      if (operation.shouldApply(transformedNode)) {
        const result = operation.transform(transformedNode, context);
        
        if (result !== transformedNode) {
          nodeWasTransformed = true;
          transformedNode = result;
          
          // Node was removed
          if (result === null) {
            transformedNodeCount.value++;
            context.path.pop();
            return null;
          }
        }
      }
    }
    
    if (nodeWasTransformed) {
      transformedNodeCount.value++;
    }
    
    // Transform children if they exist
    if (transformedNode && transformedNode.children) {
      const transformedChildren: AstNode[] = [];
      
      for (const child of transformedNode.children) {
        const transformedChild = this.transformNode(child, { ...context, path: [...context.path] }, transformedNodeCount);
        
        if (transformedChild !== null) {
          // Update parent reference
          transformedChild.parent = transformedNode;
          transformedChildren.push(transformedChild);
        }
      }
      
      transformedNode.children = transformedChildren;
    }
    
    // Pop current node from the path
    context.path.pop();
    
    return transformedNode;
  }
}

/**
 * Operation that removes HTML comments.
 */
export class RemoveCommentsOperation implements TransformOperation {
  name = 'removeComments';
  
  shouldApply(node: AstNode): boolean {
    return node.type === 'comment';
  }
  
  transform(_node: AstNode, _context: TransformContext): AstNode | null {
    return null;
  }
}

/**
 * Operation that removes specific HTML elements by tag name.
 */
export class RemoveElementsOperation implements TransformOperation {
  name = 'removeElements';
  private tagNames: Set<string>;
  
  /**
   * Create a new operation to remove specific elements.
   * 
   * @param tagNames Tag names to remove (case-insensitive)
   */
  constructor(tagNames: string[]) {
    this.tagNames = new Set(tagNames.map(name => name.toLowerCase()));
  }
  
  shouldApply(node: AstNode): boolean {
    return isElementNode(node) && this.tagNames.has(node.name.toLowerCase());
  }
  
  transform(_node: AstNode, _context: TransformContext): AstNode | null {
    return null;
  }
}

/**
 * Operation that collapses whitespace in text nodes.
 */
export class CollapseWhitespaceOperation implements TransformOperation {
  name = 'collapseWhitespace';
  
  shouldApply(node: AstNode): boolean {
    return isTextNode(node);
  }
  
  transform(node: AstNode, _context: TransformContext): AstNode | null {
    const textNode = node as TextNode;
    const collapsedText = textNode.value.replace(/\s+/g, ' ').trim();
    
    if (collapsedText === '') {
      return null;
    }
    
    return {
      ...textNode,
      value: collapsedText
    };
  }
}

/**
 * Operation that removes all attributes from elements.
 */
export class RemoveAttributesOperation implements TransformOperation {
  name = 'removeAttributes';
  private attributeNames: Set<string>;
  
  /**
   * Create a new operation to remove specific attributes.
   * 
   * @param attributeNames Attribute names to remove (case-sensitive)
   */
  constructor(attributeNames: string[] = []) {
    this.attributeNames = new Set(attributeNames);
  }
  
  shouldApply(node: AstNode): boolean {
    return isElementNode(node) && Object.keys(node.attributes).length > 0;
  }
  
  transform(node: AstNode, _context: TransformContext): AstNode | null {
    const elementNode = node as ElementNode;
    const newAttributes: Record<string, string> = {};
    
    // If no specific attributes are specified, remove all attributes
    if (this.attributeNames.size === 0) {
      return {
        ...elementNode,
        attributes: {}
      };
    }
    
    // Otherwise, remove only the specified attributes
    for (const [name, value] of Object.entries(elementNode.attributes)) {
      if (!this.attributeNames.has(name)) {
        newAttributes[name] = value;
      }
    }
    
    return {
      ...elementNode,
      attributes: newAttributes
    };
  }
}
