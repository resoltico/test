import { HtmlParser } from './parser/html-parser.js';
import { AstTransformer, TransformOperation } from './transformer/ast-transformer.js';
import { HtmlSerializer, SerializeOptions } from './serializer/html-serializer.js';
import { MemoryStorage } from './storage/memory-storage.js';

import type {
  AstNode,
  AstStorage,
  ParserOptions,
  ParseResult,
  StorageOptions,
  TransformerOptions,
  TransformResult
} from './types/index.js';

/**
 * Options for the HtmlAstTransform class.
 */
export interface HtmlAstTransformOptions {
  /**
   * Parser options.
   */
  parser?: ParserOptions;
  
  /**
   * Transformer options.
   */
  transformer?: TransformerOptions;
  
  /**
   * Storage options.
   */
  storage?: StorageOptions;
  
  /**
   * Custom storage implementation.
   */
  storageImplementation?: AstStorage;
}

/**
 * Main class for HTML to AST transformation and storage.
 * Uses Node.js v22+ features for improved performance and capabilities.
 */
export class HtmlAstTransform {
  private parser: HtmlParser;
  private transformer: AstTransformer;
  private serializer: HtmlSerializer;
  private storage: AstStorage;
  
  /**
   * Create a new HTML AST transformer.
   * 
   * @param options Configuration options
   */
  constructor(options: HtmlAstTransformOptions = {}) {
    this.parser = new HtmlParser();
    this.transformer = new AstTransformer();
    this.serializer = new HtmlSerializer();
    
    // Use custom storage implementation or create a memory storage
    this.storage = options.storageImplementation || new MemoryStorage(options.storage);
  }
  
  /**
   * Parse HTML string into an AST.
   * 
   * @param html HTML string to parse
   * @param options Parsing options
   * @returns ParseResult containing the AST and metadata
   */
  async parse(html: string, options?: ParserOptions): Promise<ParseResult> {
    return this.parser.parse(html, options);
  }
  
  /**
   * Transform an AST.
   * 
   * @param ast AST to transform
   * @param options Transformation options
   * @returns TransformResult containing the transformed AST and metadata
   */
  async transform(ast: AstNode, options?: TransformerOptions): Promise<TransformResult> {
    return this.transformer.transform(ast, options);
  }
  
  /**
   * Add a transformation operation.
   * 
   * @param operation Operation to add
   */
  addTransformation(operation: TransformOperation): void {
    this.transformer.addOperation(operation);
  }
  
  /**
   * Remove a transformation operation by name.
   * 
   * @param name Name of the operation to remove
   * @returns True if the operation was removed, false if it wasn't found
   */
  removeTransformation(name: string): boolean {
    return this.transformer.removeOperation(name);
  }
  
  /**
   * Store an AST with the given ID.
   * 
   * @param id Unique identifier for the AST
   * @param ast The AST to store
   */
  async store(id: string, ast: AstNode): Promise<void> {
    await this.storage.store(id, ast);
  }
  
  /**
   * Retrieve an AST by its ID.
   * 
   * @param id ID of the AST to retrieve
   * @returns The AST, or null if not found
   */
  async retrieve(id: string): Promise<AstNode | null> {
    return this.storage.retrieve(id);
  }
  
  /**
   * Check if an AST with the given ID exists.
   * 
   * @param id ID to check
   * @returns True if the AST exists, false otherwise
   */
  async exists(id: string): Promise<boolean> {
    return this.storage.exists(id);
  }
  
  /**
   * Delete an AST with the given ID.
   * 
   * @param id ID of the AST to delete
   * @returns True if the AST was deleted, false if it didn't exist
   */
  async delete(id: string): Promise<boolean> {
    return this.storage.delete(id);
  }
  
  /**
   * List all stored AST IDs.
   * 
   * @returns Array of AST IDs
   */
  async list(): Promise<string[]> {
    return this.storage.list();
  }
  
  /**
   * Convert an AST back to HTML.
   * 
   * @param ast AST to convert
   * @param options Serialization options
   * @returns HTML string
   */
  toHtml(ast: AstNode, options?: SerializeOptions): string {
    return this.serializer.serialize(ast, options);
  }
  
  /**
   * Process HTML: parse, transform, and store.
   * 
   * @param html HTML string to process
   * @param id Optional ID for storage (if not provided, the AST won't be stored)
   * @param parserOptions Parsing options
   * @param transformerOptions Transformation options
   * @returns Processed AST
   */
  async process(
    html: string,
    id?: string,
    parserOptions?: ParserOptions,
    transformerOptions?: TransformerOptions
  ): Promise<AstNode> {
    // Parse
    const { ast } = await this.parse(html, parserOptions);
    
    // Transform
    const { ast: transformedAst } = await this.transform(ast, transformerOptions);
    
    // Store if ID is provided
    if (id) {
      await this.store(id, transformedAst);
    }
    
    return transformedAst;
  }
  
  /**
   * Get the storage implementation.
   * 
   * @returns Storage implementation
   */
  getStorage(): AstStorage {
    return this.storage;
  }
  
  /**
   * Set a new storage implementation.
   * 
   * @param storage New storage implementation
   */
  setStorage(storage: AstStorage): void {
    this.storage = storage;
  }
}
