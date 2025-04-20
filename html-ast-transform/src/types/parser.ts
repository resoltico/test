import type { AstNode } from './ast.js';

/**
 * Configuration options for HTML parser.
 */
export interface ParserOptions {
  /**
   * Whether to preserve whitespace nodes.
   * @default false
   */
  preserveWhitespace?: boolean;
  
  /**
   * Whether to collect parsing metrics.
   * @default false
   */
  collectMetrics?: boolean;
  
  /**
   * Whether to include source positions in nodes.
   * @default false
   */
  includePositions?: boolean;
  
  /**
   * Additional parser-specific options.
   */
  [key: string]: unknown;
}

/**
 * Result of the HTML parsing operation.
 */
export interface ParseResult {
  /**
   * The parsed AST.
   */
  ast: AstNode;
  
  /**
   * Metadata about the parsing operation.
   */
  meta: {
    /**
     * Time taken to parse the HTML in milliseconds.
     */
    parseTime?: number;
    
    /**
     * Number of nodes in the AST.
     */
    nodeCount?: number;
    
    /**
     * Any warnings generated during parsing.
     */
    warnings?: string[];
    
    /**
     * Additional metadata.
     */
    [key: string]: unknown;
  };
}

/**
 * Interface for HTML parsers.
 */
export interface Parser {
  /**
   * Parse HTML string into an AST.
   * 
   * @param html HTML string to parse
   * @param options Parsing options
   * @returns ParseResult containing the AST and metadata
   */
  parse(html: string, options?: ParserOptions): Promise<ParseResult>;
}
