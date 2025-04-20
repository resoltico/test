import type { AstNode } from './ast.js';

/**
 * Configuration options for AST transformers.
 */
export interface TransformerOptions {
  /**
   * Whether to collect transformation metrics.
   * @default false
   */
  collectMetrics?: boolean;
  
  /**
   * Additional transformer-specific options.
   */
  [key: string]: unknown;
}

/**
 * Result of the AST transformation operation.
 */
export interface TransformResult {
  /**
   * The transformed AST.
   */
  ast: AstNode;
  
  /**
   * Metadata about the transformation operation.
   */
  meta: {
    /**
     * Time taken to transform the AST in milliseconds.
     */
    transformTime?: number;
    
    /**
     * Number of nodes transformed.
     */
    nodesTransformed?: number;
    
    /**
     * Any warnings generated during transformation.
     */
    warnings?: string[];
    
    /**
     * Additional metadata.
     */
    [key: string]: unknown;
  };
}

/**
 * Interface for AST transformers.
 */
export interface Transformer {
  /**
   * Transform an AST according to implementation-specific rules.
   * 
   * @param ast The AST to transform
   * @param options Transformation options
   * @returns TransformResult containing the transformed AST and metadata
   */
  transform(ast: AstNode, options?: TransformerOptions): Promise<TransformResult>;
}
