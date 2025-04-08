import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import TurndownService from 'turndown';
import { convertHtmlToMarkdown, convertHtmlToMarkdownWithSchema } from '../src/converter.js';
import { loadSchema } from '../src/schema-loader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Schema Implementation Verification Tests
 * 
 * These tests verify that our custom schema implementation correctly
 * overrides Turndown's default behavior and produces the expected
 * markdown output based on our defined conversion rules.
 */
describe('Schema Implementation', () => {
  const sampleHtml = `
    <h1>Sample <mark>Title</mark></h1>
    <p>This is a <em>test</em> with <ruby>漢字<rt>kanji</rt></ruby> characters.</p>
    <table>
      <tr><th>Header 1</th><th>Header 2</th></tr>
      <tr><td>Value 1</td><td>Value 2</td></tr>
    </table>
  `;
  
  describe('Rule Precedence', () => {
    it('should override Turndown default behavior with custom rules', () => {
      // Create a TurndownService with default rules
      const turndownService = new TurndownService();
      
      // Add a custom rule that conflicts with a default rule
      turndownService.addRule('customEmphasis', {
        filter: 'em',
        replacement: function(content) {
          return '~' + content + '~'; // Use tilde instead of underscores/asterisks
        }
      });
      
      // Test HTML that uses the element our custom rule targets
      const html = `<p>This is <em>emphasized</em> text.</p>`;
      
      // Convert using Turndown with our custom rule
      const result = turndownService.turndown(html);
      
      // If rule precedence works correctly, our custom rule should be used
      // Expected: "This is ~emphasized~ text." instead of "This is _emphasized_ text."
      assert.strictEqual(
        result.includes('~emphasized~'), 
        true, 
        'Custom emphasis rule should override Turndown default'
      );
    });
  });
  
  describe('Standard Schema', () => {
    it('should format ruby annotations with parentheses', () => {
      const html = `<p><ruby>漢字<rt>kanji</rt></ruby></p>`;
      const markdown = convertHtmlToMarkdown(html);
      
      assert.strictEqual(
        markdown.includes('漢字 (kanji)'),
        true,
        'Ruby annotations should be formatted with parentheses'
      );
    });
    
    it('should format tables with proper alignment', () => {
      const html = `
        <table>
          <tr><th>Header 1</th><th>Header 2</th></tr>
          <tr><td>Value 1</td><td>Value 2</td></tr>
        </table>
      `;
      const markdown = convertHtmlToMarkdown(html);
      
      assert(
        markdown.includes('| Header 1 | Header 2 |') &&
        markdown.includes('|----------|----------|') &&
        markdown.includes('| Value 1 | Value 2 |'),
        'Tables should be formatted with proper column alignment'
      );
    });
    
    it('should format mark elements as bold', () => {
      const html = `<p>This is <mark>highlighted</mark> text.</p>`;
      const markdown = convertHtmlToMarkdown(html);
      
      assert.strictEqual(
        markdown.includes('**highlighted**'),
        true,
        'Mark elements should be formatted as bold'
      );
    });
  });
  
  describe('Custom Schema', () => {
    it('should load and apply custom schema configurations', async () => {
      // Create a temporary schema file
      const schemaFilePath = path.join(__dirname, 'temp-schema.json');
      const customSchema = {
        preserveStructure: true,
        flattenContainers: false,
        handleSpecialElements: true,
        cleanupOutput: true,
        elementRules: {
          "ruby": {
            filter: "ruby",
            replacement: "function(content, node) { const rtElement = node.querySelector('rt'); if (!rtElement) return content; const baseText = node.textContent.replace(rtElement.textContent, '').trim(); const rtText = rtElement.textContent.trim(); return `${baseText}「${rtText}」`; }"
          }
        }
      };
      
      await fs.writeFile(
        schemaFilePath,
        JSON.stringify(customSchema, null, 2),
        'utf-8'
      );
      
      try {
        // Load the schema
        const schema = await loadSchema('custom', schemaFilePath);
        
        // Test with the loaded schema
        const html = `<p><ruby>漢字<rt>kanji</rt></ruby></p>`;
        const markdown = convertHtmlToMarkdownWithSchema(html, schema);
        
        assert.strictEqual(
          markdown.includes('漢字「kanji」'),
          true,
          'Custom ruby formatting should be applied with custom schema'
        );
      } finally {
        // Clean up the temporary file
        await fs.unlink(schemaFilePath).catch(() => {});
      }
    });
  });
  
  describe('Complete Conversion', () => {
    it('should process a complex HTML document according to our schema', () => {
      const html = `
        <article>
          <h1>Test Document</h1>
          <p>This is a <strong>test</strong> with various <em>elements</em>.</p>
          <section id="special">
            <h2>Special Section</h2>
            <blockquote>
              <p>This is a quote</p>
              <footer>— <cite>Author</cite></footer>
            </blockquote>
            <ruby>漢字<rt>kanji</rt></ruby>
          </section>
        </article>
      `;
      
      const markdown = convertHtmlToMarkdown(html);
      
      // Check that the output follows our schema rules
      assert(
        markdown.includes('# Test Document') &&
        markdown.includes('This is a **test** with various *elements*') &&
        markdown.includes('## Special Section') &&
        markdown.includes('> This is a quote') &&
        markdown.includes('> — *Author*') &&
        markdown.includes('漢字 (kanji)'),
        'Complex HTML should be converted according to our schema rules'
      );
    });
  });
});
