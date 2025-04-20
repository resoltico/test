import { expect, describe, it, beforeEach, afterEach } from 'vitest';
import { MemoryStorage, FileStorage } from '../src/index.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('Storage Implementations', () => {
  let memoryStorage: MemoryStorage;
  let fileStorage: FileStorage;
  let tempDir: string;
  
  beforeEach(async () => {
    memoryStorage = new MemoryStorage();
    
    // Create a temporary directory for file storage tests
    tempDir = await mkdtemp(join(tmpdir(), 'html-ast-transform-'));
    fileStorage = new FileStorage(tempDir);
  });
  
  afterEach(async () => {
    // Clean up temporary directory
    await rm(tempDir, { recursive: true, force: true });
  });
  
  describe('MemoryStorage', () => {
    it('should store and retrieve AST nodes', async () => {
      const node = {
        type: 'element',
        name: 'div',
        attributes: { id: 'test' },
        children: [
          {
            type: 'text',
            value: 'Hello World'
          }
        ]
      };
      
      await memoryStorage.store('test-id', node);
      const retrieved = await memoryStorage.retrieve('test-id');
      
      expect(retrieved).toEqual(node);
    });
    
    it('should handle circular references', async () => {
      const node: any = {
        type: 'element',
        name: 'div',
        attributes: {},
        children: []
      };
      
      const childNode: any = {
        type: 'text',
        value: 'Hello World',
        parent: node
      };
      
      node.children.push(childNode);
      
      await memoryStorage.store('circular-test', node);
      const retrieved = await memoryStorage.retrieve('circular-test');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.type).toBe('element');
      expect(retrieved?.children?.[0]?.type).toBe('text');
      
      // Parent reference should be restored
      expect(retrieved?.children?.[0]?.parent).toBe(retrieved);
    });
    
    it('should handle compressed storage', async () => {
      const compressedStorage = new MemoryStorage({ compressed: true });
      
      const node = {
        type: 'element',
        name: 'div',
        attributes: {},
        children: [
          {
            type: 'text',
            value: 'Hello World'.repeat(100) // Create a larger payload to test compression
          }
        ]
      };
      
      await compressedStorage.store('compressed-test', node);
      const retrieved = await compressedStorage.retrieve('compressed-test');
      
      expect(retrieved).toEqual(node);
    });
    
    it('should list all stored IDs', async () => {
      const node1 = { type: 'element', name: 'div' };
      const node2 = { type: 'element', name: 'span' };
      
      await memoryStorage.store('id1', node1);
      await memoryStorage.store('id2', node2);
      
      const ids = await memoryStorage.list();
      
      expect(ids).toContain('id1');
      expect(ids).toContain('id2');
      expect(ids.length).toBe(2);
    });
    
    it('should delete stored nodes', async () => {
      const node = { type: 'element', name: 'div' };
      
      await memoryStorage.store('delete-test', node);
      expect(await memoryStorage.exists('delete-test')).toBe(true);
      
      const deleted = await memoryStorage.delete('delete-test');
      expect(deleted).toBe(true);
      expect(await memoryStorage.exists('delete-test')).toBe(false);
      
      // Deleting non-existent node should return false
      const deletedAgain = await memoryStorage.delete('delete-test');
      expect(deletedAgain).toBe(false);
    });
    
    it('should handle complex AST structures', async () => {
      const complexNode = {
        type: 'document',
        children: [
          {
            type: 'element',
            name: 'html',
            attributes: {},
            children: [
              {
                type: 'element',
                name: 'head',
                attributes: {},
                children: [
                  {
                    type: 'element',
                    name: 'title',
                    attributes: {},
                    children: [
                      {
                        type: 'text',
                        value: 'Test Document'
                      }
                    ]
                  }
                ]
              },
              {
                type: 'element',
                name: 'body',
                attributes: { class: 'main' },
                children: [
                  {
                    type: 'element',
                    name: 'h1',
                    attributes: { id: 'title' },
                    children: [
                      {
                        type: 'text',
                        value: 'Hello World'
                      }
                    ]
                  },
                  {
                    type: 'element',
                    name: 'p',
                    attributes: {},
                    children: [
                      {
                        type: 'text',
                        value: 'This is a test.'
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      };
      
      await memoryStorage.store('complex-test', complexNode);
      const retrieved = await memoryStorage.retrieve('complex-test');
      
      expect(retrieved).toEqual(complexNode);
    });
  });
  
  describe('FileStorage', () => {
    it('should store and retrieve AST nodes', async () => {
      const node = {
        type: 'element',
        name: 'div',
        attributes: { id: 'test' },
        children: [
          {
            type: 'text',
            value: 'Hello World'
          }
        ]
      };
      
      await fileStorage.store('test-id', node);
      const retrieved = await fileStorage.retrieve('test-id');
      
      expect(retrieved).toEqual(node);
    });
    
    it('should handle circular references', async () => {
      const node: any = {
        type: 'element',
        name: 'div',
        attributes: {},
        children: []
      };
      
      const childNode: any = {
        type: 'text',
        value: 'Hello World',
        parent: node
      };
      
      node.children.push(childNode);
      
      await fileStorage.store('circular-test', node);
      const retrieved = await fileStorage.retrieve('circular-test');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.type).toBe('element');
      expect(retrieved?.children?.[0]?.type).toBe('text');
      
      // Parent reference should be restored
      expect(retrieved?.children?.[0]?.parent).toBe(retrieved);
    });
    
    it('should handle compressed storage', async () => {
      const compressedStorage = new FileStorage(tempDir, { compressed: true });
      
      const node = {
        type: 'element',
        name: 'div',
        attributes: {},
        children: [
          {
            type: 'text',
            value: 'Hello World'.repeat(100) // Create a larger payload to test compression
          }
        ]
      };
      
      await compressedStorage.store('compressed-test', node);
      const retrieved = await compressedStorage.retrieve('compressed-test');
      
      expect(retrieved).toEqual(node);
    });
    
    it('should list all stored IDs', async () => {
      const node1 = { type: 'element', name: 'div' };
      const node2 = { type: 'element', name: 'span' };
      
      await fileStorage.store('id1', node1);
      await fileStorage.store('id2', node2);
      
      const ids = await fileStorage.list();
      
      expect(ids).toContain('id1');
      expect(ids).toContain('id2');
    });
    
    it('should delete stored nodes', async () => {
      const node = { type: 'element', name: 'div' };
      
      await fileStorage.store('delete-test', node);
      expect(await fileStorage.exists('delete-test')).toBe(true);
      
      const deleted = await fileStorage.delete('delete-test');
      expect(deleted).toBe(true);
      expect(await fileStorage.exists('delete-test')).toBe(false);
      
      // Deleting non-existent node should return false
      const deletedAgain = await fileStorage.delete('delete-test');
      expect(deletedAgain).toBe(false);
    });
    
    it('should handle special characters in ID', async () => {
      const node = { type: 'element', name: 'div' };
      const specialId = 'test/file:with?special<chars>';
      
      await fileStorage.store(specialId, node);
      expect(await fileStorage.exists(specialId)).toBe(true);
      
      const retrieved = await fileStorage.retrieve(specialId);
      expect(retrieved).toEqual(node);
    });
  });
});
