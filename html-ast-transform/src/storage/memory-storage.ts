import { Buffer } from 'node:buffer';
import { gzip, gunzip } from 'node:zlib';
import { promisify } from 'node:util';

import type { AstNode, AstStorage, StorageOptions } from '../types/index.js';

// Promisify zlib functions
const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

/**
 * In-memory storage implementation for ASTs.
 * Uses Node.js v22+ features for improved buffer handling and compression.
 */
export class MemoryStorage implements AstStorage {
  private storage: Map<string, Buffer>;
  private options: Required<StorageOptions>;
  
  /**
   * Create a new in-memory storage instance.
   * 
   * @param options Storage options
   */
  constructor(options: StorageOptions = {}) {
    this.storage = new Map();
    this.options = {
      compressed: options.compressed ?? false,
      ...options
    };
  }
  
  /**
   * Store an AST with the given ID.
   * 
   * @param id Unique identifier for the AST
   * @param ast The AST to store
   */
  async store(id: string, ast: AstNode): Promise<void> {
    // Clone the AST to avoid storing references
    const clonedAst = structuredClone(ast);
    
    // Remove circular references (parent references)
    this.removeParentReferences(clonedAst);
    
    // Convert to JSON
    const jsonData = JSON.stringify(clonedAst);
    
    // Compress if configured
    if (this.options.compressed) {
      const compressed = await gzipAsync(Buffer.from(jsonData, 'utf-8'));
      this.storage.set(id, compressed);
    } else {
      this.storage.set(id, Buffer.from(jsonData, 'utf-8'));
    }
  }
  
  /**
   * Retrieve an AST by its ID.
   * 
   * @param id ID of the AST to retrieve
   * @returns The AST, or null if not found
   */
  async retrieve(id: string): Promise<AstNode | null> {
    const data = this.storage.get(id);
    
    if (!data) {
      return null;
    }
    
    try {
      // Decompress if needed
      const jsonData = this.options.compressed
        ? (await gunzipAsync(data)).toString('utf-8')
        : data.toString('utf-8');
      
      // Parse and restore parent references
      const ast = JSON.parse(jsonData) as AstNode;
      this.restoreParentReferences(ast);
      
      return ast;
    } catch (error) {
      console.error('Error retrieving AST:', error);
      return null;
    }
  }
  
  /**
   * Check if an AST with the given ID exists.
   * 
   * @param id ID to check
   * @returns True if the AST exists, false otherwise
   */
  async exists(id: string): Promise<boolean> {
    return this.storage.has(id);
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
    return Array.from(this.storage.keys());
  }
  
  /**
   * Clear all stored ASTs.
   */
  async clear(): Promise<void> {
    this.storage.clear();
  }
  
  /**
   * Remove parent references from an AST to avoid circular references.
   * 
   * @param node Root node of the AST
   */
  private removeParentReferences(node: AstNode): void {
    // Remove parent reference
    delete node.parent;
    
    // Process children
    if (node.children) {
      for (const child of node.children) {
        this.removeParentReferences(child);
      }
    }
  }
  
  /**
   * Restore parent references in an AST.
   * 
   * @param node Root node of the AST
   * @param parent Parent node (undefined for the root)
   */
  private restoreParentReferences(node: AstNode, parent?: AstNode): void {
    // Set parent reference
    if (parent) {
      node.parent = parent;
    }
    
    // Process children
    if (node.children) {
      for (const child of node.children) {
        this.restoreParentReferences(child, node);
      }
    }
  }
}
