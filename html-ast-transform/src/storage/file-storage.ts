import { Buffer } from 'node:buffer';
import { mkdir, readdir, readFile, writeFile, rm, access } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { constants } from 'node:fs';
import { gzip, gunzip } from 'node:zlib';
import { promisify } from 'node:util';

import type { AstNode, AstStorage, StorageOptions } from '../types/index.js';

// Promisify zlib functions
const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

/**
 * File-based storage implementation for ASTs.
 * Uses Node.js v22+ features for improved file system operations.
 */
export class FileStorage implements AstStorage {
  private basePath: string;
  private options: Required<StorageOptions>;
  
  /**
   * Create a new file storage instance.
   * 
   * @param basePath Base directory path for storage
   * @param options Storage options
   */
  constructor(basePath: string, options: StorageOptions = {}) {
    this.basePath = resolve(basePath);
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
    // Ensure the directory exists
    await this.ensureDirectory();
    
    // Clone the AST to avoid storing references
    const clonedAst = structuredClone(ast);
    
    // Remove circular references (parent references)
    this.removeParentReferences(clonedAst);
    
    // Convert to JSON
    const jsonData = JSON.stringify(clonedAst);
    
    // Determine the file path
    const filePath = this.getFilePath(id);
    
    // Ensure the file's directory exists
    await mkdir(dirname(filePath), { recursive: true });
    
    // Compress if configured
    if (this.options.compressed) {
      const compressed = await gzipAsync(Buffer.from(jsonData, 'utf-8'));
      await writeFile(filePath, compressed);
    } else {
      await writeFile(filePath, jsonData, 'utf-8');
    }
  }
  
  /**
   * Retrieve an AST by its ID.
   * 
   * @param id ID of the AST to retrieve
   * @returns The AST, or null if not found
   */
  async retrieve(id: string): Promise<AstNode | null> {
    const filePath = this.getFilePath(id);
    
    try {
      // Check if the file exists
      await access(filePath, constants.R_OK);
      
      // Read the file
      const data = await readFile(filePath);
      
      // Decompress if needed
      const jsonData = this.options.compressed
        ? (await gunzipAsync(data)).toString('utf-8')
        : data.toString('utf-8');
      
      // Parse and restore parent references
      const ast = JSON.parse(jsonData) as AstNode;
      this.restoreParentReferences(ast);
      
      return ast;
    } catch (error) {
      // File doesn't exist or can't be read
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
    const filePath = this.getFilePath(id);
    
    try {
      await access(filePath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Delete an AST with the given ID.
   * 
   * @param id ID of the AST to delete
   * @returns True if the AST was deleted, false if it didn't exist
   */
  async delete(id: string): Promise<boolean> {
    const filePath = this.getFilePath(id);
    
    try {
      await access(filePath, constants.F_OK);
      await rm(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * List all stored AST IDs.
   * 
   * @returns Array of AST IDs
   */
  async list(): Promise<string[]> {
    try {
      await this.ensureDirectory();
      
      const files = await readdir(this.basePath, { recursive: true });
      
      return files
        .filter(file => {
          // Filter out non-JSON and non-compressed files
          return (
            (file.endsWith('.json') && !this.options.compressed) ||
            (file.endsWith('.json.gz') && this.options.compressed)
          );
        })
        .map(file => {
          // Remove extension to get the ID
          return file.replace(/\.json(\.gz)?$/, '');
        });
    } catch (error) {
      return [];
    }
  }
  
  /**
   * Ensure the base directory exists.
   */
  private async ensureDirectory(): Promise<void> {
    await mkdir(this.basePath, { recursive: true });
  }
  
  /**
   * Get the file path for an AST ID.
   * 
   * @param id AST ID
   * @returns Full file path
   */
  private getFilePath(id: string): string {
    // Sanitize the ID for file system use
    const sanitizedId = id.replace(/[\\/:*?"<>|]/g, '_');
    
    // Add appropriate extension
    const fileName = this.options.compressed
      ? `${sanitizedId}.json.gz`
      : `${sanitizedId}.json`;
    
    return join(this.basePath, fileName);
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
