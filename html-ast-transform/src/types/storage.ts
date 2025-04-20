import type { AstNode } from './ast.js';

/**
 * Configuration options for AST storage.
 */
export interface StorageOptions {
  /**
   * Whether to compress the stored AST.
   * @default false
   */
  compressed?: boolean;
  
  /**
   * Additional storage-specific options.
   */
  [key: string]: unknown;
}

/**
 * Interface for AST storage implementations.
 */
export interface AstStorage {
  /**
   * Store an AST with the given ID.
   * 
   * @param id Unique identifier for the AST
   * @param ast The AST to store
   * @returns Promise that resolves when the storage operation completes
   */
  store(id: string, ast: AstNode): Promise<void>;
  
  /**
   * Retrieve an AST by its ID.
   * 
   * @param id ID of the AST to retrieve
   * @returns Promise that resolves to the AST, or null if not found
   */
  retrieve(id: string): Promise<AstNode | null>;
  
  /**
   * Check if an AST with the given ID exists.
   * 
   * @param id ID to check
   * @returns Promise that resolves to true if the AST exists, false otherwise
   */
  exists(id: string): Promise<boolean>;
  
  /**
   * Delete an AST with the given ID.
   * 
   * @param id ID of the AST to delete
   * @returns Promise that resolves to true if the AST was deleted, false if it didn't exist
   */
  delete(id: string): Promise<boolean>;
  
  /**
   * List all stored AST IDs.
   * 
   * @returns Promise that resolves to an array of AST IDs
   */
  list(): Promise<string[]>;
}
