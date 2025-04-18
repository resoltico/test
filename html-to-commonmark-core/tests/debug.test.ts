/**
 * Debug test for the html-to-commonmark-core library
 */

import { describe, it, expect } from 'vitest';
import { convertHtmlToMarkdown, renderAstToMarkdown, convertHtmlToAst } from '../src/index.js';

describe('Debug Tests', () => {
  it('should convert a simple heading correctly', async () => {
    const html = '<h1>Test Heading</h1>';
    const result = await convertHtmlToMarkdown(html);
    
    console.log('Output markdown:', JSON.stringify(result.markdown));
    expect(result.markdown).toContain('# Test Heading');
  });
  
  it('should convert a paragraph with formatting', async () => {
    const html = '<p>This is a <strong>bold</strong> and <em>italic</em> text.</p>';
    const result = await convertHtmlToMarkdown(html);
    
    console.log('Output markdown:', JSON.stringify(result.markdown));
    expect(result.markdown).toContain('This is a **bold** and *italic* text.');
  });
  
  it('should handle document as root node', async () => {
    // First convert HTML to AST
    const html = '<h1>Original Heading</h1>';
    const ast = await convertHtmlToAst(html);
    
    // The first node should be a Document node
    expect(ast.length).toBeGreaterThan(0);
    expect(ast[0].type).toBe('Document');
    
    // Document should contain a Heading
    const document = ast[0];
    expect('children' in document).toBe(true);
    
    if ('children' in document && document.children.length > 0) {
      const heading = document.children[0];
      expect(heading.type).toBe('Heading');
      
      // Find the text node and modify it
      if ('children' in heading && heading.children.length > 0) {
        const textNode = heading.children[0];
        if (textNode.type === 'Text') {
          // Change the text
          textNode.value = 'Modified Heading';
        }
      }
    }
    
    // Render the modified AST to markdown
    const markdown = renderAstToMarkdown(ast);
    console.log('Modified markdown:', JSON.stringify(markdown));
    
    // Verify the modification worked
    expect(markdown).toContain('# Modified Heading');
    expect(markdown).not.toContain('Original Heading');
  });
});