import { expect, describe, it, beforeEach, afterEach } from 'vitest';
import { HtmlAstTransform, MemoryStorage, FileStorage, RemoveCommentsOperation } from '../src/index.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('HtmlAstTransform', () => {
  let transformer: HtmlAstTransform;
  let tempDir: string;
  
  beforeEach(async () => {
    transformer = new HtmlAstTransform();
    // Create a temporary directory for file storage tests
    tempDir = await mkdtemp(join(tmpdir(), 'html-ast-transform-'));
  });
  
  afterEach(async () => {
    // Clean up temporary directory
    await rm(tempDir, { recursive: true, force: true });
  });
  
  describe('Parsing HTML', () => {
    it('should parse basic HTML into AST', async () => {
      const html = '<html><head><title>Test</title></head><body><h1>Hello World</h1></body></html>';
      const { ast } = await transformer.parse(html);
      
      expect(ast).toBeDefined();
      expect(ast.type).toBe('document');
      expect(ast.children?.[0]?.type).toBe('element');
      expect(ast.children?.[0]?.name).toBe('html');
    });
    
    it('should handle special characters in HTML', async () => {
      const html = '<div>&lt;script&gt;alert(&quot;test&quot;);&lt;/script&gt;</div>';
      const { ast } = await transformer.parse(html);
      
      const divNode = ast.children?.[0];
      expect(divNode?.type).toBe('element');
      expect(divNode?.name).toBe('div');
      
      const textNode = divNode?.children?.[0];
      expect(textNode?.type).toBe('text');
      expect(textNode?.value).toBe('<script>alert("test");</script>');
    });
    
    it('should handle HTML comments', async () => {
      const html = '<div><!-- This is a comment --></div>';
      const { ast } = await transformer.parse(html);
      
      const divNode = ast.children?.[0];
      expect(divNode?.type).toBe('element');
      
      const commentNode = divNode?.children?.[0];
      expect(commentNode?.type).toBe('comment');
      expect(commentNode?.value).toBe(' This is a comment ');
    });
  });
  
  describe('Transforming AST', () => {
    it('should apply transformations to AST', async () => {
      const html = '<div><!-- Comment --><p>Text</p></div>';
      const { ast } = await transformer.parse(html);
      
      // Add transformation to remove comments
      transformer.addTransformation(new RemoveCommentsOperation());
      
      const { ast: transformedAst } = await transformer.transform(ast);
      
      const divNode = transformedAst.children?.[0];
      expect(divNode?.children?.length).toBe(1);
      expect(divNode?.children?.[0]?.type).toBe('element');
      expect(divNode?.children?.[0]?.name).toBe('p');
    });
  });
  
  describe('Serializing AST to HTML', () => {
    it('should convert AST back to HTML', async () => {
      const html = '<div><p>Hello World</p></div>';
      const { ast } = await transformer.parse(html);
      
      const serialized = transformer.toHtml(ast);
      
      // The serialized HTML might have different whitespace, normalize for comparison
      const normalizedInput = html.replace(/\s+/g, '');
      const normalizedOutput = serialized.replace(/\s+/g, '');
      
      expect(normalizedOutput).toBe(normalizedInput);
    });
    
    it('should respect serialization options', async () => {
      const html = '<div><p>Hello World</p></div>';
      const { ast } = await transformer.parse(html);
      
      const serialized = transformer.toHtml(ast, { pretty: true, indent: '  ' });
      
      expect(serialized).toContain('\n');
      expect(serialized).toContain('  <p>');
    });
  });
  
  describe('Storing and retrieving AST', () => {
    it('should store and retrieve AST with MemoryStorage', async () => {
      const html = '<div><p>Hello World</p></div>';
      const { ast } = await transformer.parse(html);
      
      const id = 'test-ast';
      await transformer.store(id, ast);
      
      const retrieved = await transformer.retrieve(id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.type).toBe('document');
      expect(retrieved?.children?.[0]?.name).toBe('div');
    });
    
    it('should store and retrieve AST with FileStorage', async () => {
      // Create a transformer with FileStorage
      const fileStorage = new FileStorage(tempDir);
      const fileTransformer = new HtmlAstTransform({
        storageImplementation: fileStorage
      });
      
      const html = '<div><p>Hello World</p></div>';
      const { ast } = await fileTransformer.parse(html);
      
      const id = 'test-ast';
      await fileTransformer.store(id, ast);
      
      const retrieved = await fileTransformer.retrieve(id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.type).toBe('document');
      expect(retrieved?.children?.[0]?.name).toBe('div');
    });
    
    it('should list stored ASTs', async () => {
      const html1 = '<div>Test 1</div>';
      const html2 = '<div>Test 2</div>';
      
      const { ast: ast1 } = await transformer.parse(html1);
      const { ast: ast2 } = await transformer.parse(html2);
      
      await transformer.store('id1', ast1);
      await transformer.store('id2', ast2);
      
      const list = await transformer.list();
      
      expect(list).toContain('id1');
      expect(list).toContain('id2');
    });
    
    it('should delete stored ASTs', async () => {
      const html = '<div>Test</div>';
      const { ast } = await transformer.parse(html);
      
      await transformer.store('test-id', ast);
      
      // Check it exists
      expect(await transformer.exists('test-id')).toBe(true);
      
      // Delete it
      const deleted = await transformer.delete('test-id');
      
      expect(deleted).toBe(true);
      expect(await transformer.exists('test-id')).toBe(false);
    });
  });
  
  describe('End-to-end processing', () => {
    it('should process HTML through parse, transform, and store', async () => {
      const html = '<div><!-- Comment --><p>Text</p></div>';
      
      // Add transformation to remove comments
      transformer.addTransformation(new RemoveCommentsOperation());
      
      // Process HTML
      const processedAst = await transformer.process(html, 'processed-ast');
      
      // Check transformation worked
      const divNode = processedAst.children?.[0];
      expect(divNode?.children?.length).toBe(1);
      expect(divNode?.children?.[0]?.type).toBe('element');
      
      // Check storage worked
      const retrieved = await transformer.retrieve('processed-ast');
      expect(retrieved).toBeDefined();
      
      // Check serialization
      const serialized = transformer.toHtml(processedAst);
      expect(serialized).toContain('<p>Text</p>');
      expect(serialized).not.toContain('<!-- Comment -->');
    });
  });
});
