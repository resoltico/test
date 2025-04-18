/**
 * Basic tests for the html-to-commonmark-core library
 */

import { describe, it, expect } from 'vitest';
import { convertHtmlToMarkdown, convertHtmlToAst, renderAstToMarkdown } from '../src/index.js';

describe('html-to-commonmark-core', () => {
  // Basic conversion tests
  describe('Basic HTML Conversion', () => {
    it('should convert headings correctly', async () => {
      const html = '<h1>Heading 1</h1><h2>Heading 2</h2><h3>Heading 3</h3>';
      const result = await convertHtmlToMarkdown(html);
      
      expect(result.markdown).toContain('# Heading 1');
      expect(result.markdown).toContain('## Heading 2');
      expect(result.markdown).toContain('### Heading 3');
    });
    
    it('should convert paragraphs correctly', async () => {
      const html = '<p>This is a paragraph.</p><p>This is another paragraph.</p>';
      const result = await convertHtmlToMarkdown(html);
      
      expect(result.markdown).toContain('This is a paragraph.');
      expect(result.markdown).toContain('This is another paragraph.');
    });
    
    it('should convert inline formatting correctly', async () => {
      const html = '<p><strong>Bold</strong> and <em>italic</em> text.</p>';
      const result = await convertHtmlToMarkdown(html);
      
      expect(result.markdown).toContain('**Bold** and *italic* text.');
    });
  });
  
  // List conversion tests
  describe('List Conversion', () => {
    it('should convert unordered lists correctly', async () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>';
      const result = await convertHtmlToMarkdown(html);
      
      expect(result.markdown).toContain('- Item 1');
      expect(result.markdown).toContain('- Item 2');
      expect(result.markdown).toContain('- Item 3');
    });
    
    it('should convert ordered lists correctly', async () => {
      const html = '<ol><li>Item 1</li><li>Item 2</li><li>Item 3</li></ol>';
      const result = await convertHtmlToMarkdown(html);
      
      expect(result.markdown).toContain('1. Item 1');
      expect(result.markdown).toContain('1. Item 2');
      expect(result.markdown).toContain('1. Item 3');
    });
    
    it('should convert nested lists correctly', async () => {
      const html = `
        <ul>
          <li>Item 1</li>
          <li>Item 2
            <ul>
              <li>Nested 1</li>
              <li>Nested 2</li>
            </ul>
          </li>
          <li>Item 3</li>
        </ul>
      `;
      const result = await convertHtmlToMarkdown(html);
      
      expect(result.markdown).toContain('- Item 1');
      expect(result.markdown).toContain('- Item 2');
      expect(result.markdown).toContain('  - Nested 1');
      expect(result.markdown).toContain('  - Nested 2');
      expect(result.markdown).toContain('- Item 3');
    });
  });
  
  // Link and image tests
  describe('Links and Images', () => {
    it('should convert links correctly', async () => {
      const html = '<p><a href="https://example.com">Example</a></p>';
      const result = await convertHtmlToMarkdown(html);
      
      expect(result.markdown).toContain('[Example](https://example.com)');
    });
    
    it('should convert links with titles correctly', async () => {
      const html = '<p><a href="https://example.com" title="Example Title">Example</a></p>';
      const result = await convertHtmlToMarkdown(html);
      
      expect(result.markdown).toContain('[Example](https://example.com "Example Title")');
    });
    
    it('should convert images correctly', async () => {
      const html = '<p><img src="image.jpg" alt="Alt Text"></p>';
      const result = await convertHtmlToMarkdown(html);
      
      expect(result.markdown).toContain('![Alt Text](image.jpg)');
    });
  });
  
  // Code block tests
  describe('Code Blocks', () => {
    it('should convert code blocks correctly', async () => {
      const html = '<pre><code>function example() {\n  return true;\n}</code></pre>';
      const result = await convertHtmlToMarkdown(html);
      
      expect(result.markdown).toContain('```\nfunction example() {\n  return true;\n}\n```');
    });
    
    it('should handle language hints in code blocks', async () => {
      const html = '<pre><code class="language-javascript">function example() {\n  return true;\n}</code></pre>';
      const result = await convertHtmlToMarkdown(html);
      
      expect(result.markdown).toContain('```javascript\nfunction example() {\n  return true;\n}\n```');
    });
  });
  
  // Blockquote tests
  describe('Blockquotes', () => {
    it('should convert blockquotes correctly', async () => {
      const html = '<blockquote><p>This is a blockquote.</p></blockquote>';
      const result = await convertHtmlToMarkdown(html);
      
      expect(result.markdown).toContain('> This is a blockquote.');
    });
    
    it('should handle nested blockquotes', async () => {
      const html = '<blockquote><p>Outer quote</p><blockquote><p>Inner quote</p></blockquote></blockquote>';
      const result = await convertHtmlToMarkdown(html);
      
      expect(result.markdown).toContain('> Outer quote');
      expect(result.markdown).toContain('> > Inner quote');
    });
  });
  
  // Table tests
  describe('Tables', () => {
    it('should convert tables correctly', async () => {
      const html = `
        <table>
          <thead>
            <tr>
              <th>Header 1</th>
              <th>Header 2</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Cell 1</td>
              <td>Cell 2</td>
            </tr>
            <tr>
              <td>Cell 3</td>
              <td>Cell 4</td>
            </tr>
          </tbody>
        </table>
      `;
      const result = await convertHtmlToMarkdown(html);
      
      expect(result.markdown).toContain('| Header 1 | Header 2 |');
      expect(result.markdown).toContain('| --- | --- |');
      expect(result.markdown).toContain('| Cell 1 | Cell 2 |');
      expect(result.markdown).toContain('| Cell 3 | Cell 4 |');
    });
  });
  
  // AST manipulation tests
  describe('AST Manipulation', () => {
    it('should allow AST manipulation before rendering', async () => {
      const html = '<h1>Original Heading</h1>';
      
      // Convert to AST
      const ast = await convertHtmlToAst(html);
      
      // Modify the AST (change the heading text)
      if (ast.length > 0 && ast[0].type === 'Heading' && ast[0].children.length > 0) {
        if (ast[0].children[0].type === 'Text') {
          ast[0].children[0].value = 'Modified Heading';
        }
      }
      
      // Render the modified AST
      const markdown = renderAstToMarkdown(ast);
      
      expect(markdown).toContain('# Modified Heading');
      expect(markdown).not.toContain('Original Heading');
    });
  });
  
  // Complex HTML tests
  describe('Complex HTML', () => {
    it('should handle complex nested HTML correctly', async () => {
      const html = `
        <div>
          <h1>Complex Document</h1>
          <p>This is a paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
          <ul>
            <li>Item with <a href="https://example.com">a link</a></li>
            <li>Item with <code>inline code</code></li>
            <li>Item with nested list
              <ol>
                <li>Nested item 1</li>
                <li>Nested item 2</li>
              </ol>
            </li>
          </ul>
          <blockquote>
            <p>A blockquote with a <a href="https://example.com">link</a>.</p>
          </blockquote>
          <pre><code class="language-javascript">
function example() {
  return true;
}
          </code></pre>
        </div>
      `;
      
      const result = await convertHtmlToMarkdown(html);
      const markdown = result.markdown;
      
      // Check headings
      expect(markdown).toContain('# Complex Document');
      
      // Check paragraph with formatting
      expect(markdown).toContain('This is a paragraph with **bold** and *italic* text.');
      
      // Check lists
      expect(markdown).toContain('- Item with [a link](https://example.com)');
      expect(markdown).toContain('- Item with `inline code`');
      
      // Check nested lists
      expect(markdown).toContain('- Item with nested list');
      expect(markdown).toContain('  1. Nested item 1');
      expect(markdown).toContain('  1. Nested item 2');
      
      // Check blockquote
      expect(markdown).toContain('> A blockquote with a [link](https://example.com).');
      
      // Check code block
      expect(markdown).toContain('```javascript');
      expect(markdown).toContain('function example() {');
      expect(markdown).toContain('  return true;');
      expect(markdown).toContain('```');
    });
  });
});