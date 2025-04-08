import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { convertToMarkdown } from '../src/index.js';
import { sanitizeFilename, determineOutputPath, isUrl } from '../src/utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_OUTPUT_DIR = path.join(__dirname, 'output');

describe('web2md', () => {
  before(async () => {
    // Create test output directory
    await fs.mkdir(TEST_OUTPUT_DIR, { recursive: true });
    
    // Create a test HTML file
    const testHtmlPath = path.join(__dirname, 'test.html');
    const testHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Test Page</title>
      </head>
      <body>
        <h1>Test Heading</h1>
        <p>This is a test paragraph.</p>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
          <li>Item 3</li>
        </ul>
      </body>
    </html>
    `;
    await fs.writeFile(testHtmlPath, testHtml);
  });
  
  after(async () => {
    // Clean up test files
    await fs.rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
    await fs.unlink(path.join(__dirname, 'test.html')).catch(() => {});
  });
  
  describe('utils', () => {
    it('should sanitize filenames correctly', () => {
      assert.strictEqual(
        sanitizeFilename('file name.txt'),
        'file_name.txt'
      );
      
      assert.strictEqual(
        sanitizeFilename('file/with/invalid?chars*.txt'),
        'file_with_invalid_chars_.txt'
      );
      
      assert.strictEqual(
        sanitizeFilename('..hidden..'),
        'hidden'
      );
    });
    
    it('should determine if a string is a URL', () => {
      assert.strictEqual(isUrl('https://example.com'), true);
      assert.strictEqual(isUrl('http://example.com/page.html'), true);
      assert.strictEqual(isUrl('not a url'), false);
      assert.strictEqual(isUrl('file.html'), false);
    });
    
    it('should determine the output path correctly', async () => {
      const urlOutputPath = await determineOutputPath(
        'https://example.com/page.html',
        TEST_OUTPUT_DIR
      );
      
      assert.strictEqual(
        path.basename(urlOutputPath),
        'example.com_page.html.md'
      );
      
      const fileOutputPath = await determineOutputPath(
        'test.html',
        TEST_OUTPUT_DIR
      );
      
      assert.strictEqual(
        path.basename(fileOutputPath),
        'test.md'
      );
    });
  });
  
  describe('conversion', () => {
    it('should convert a local HTML file to Markdown', async () => {
      const testHtmlPath = path.join(__dirname, 'test.html');
      const outputPath = await convertToMarkdown(testHtmlPath, {
        outputDir: TEST_OUTPUT_DIR,
        force: true
      });
      
      // Verify output file exists
      const exists = await fs.access(outputPath).then(() => true).catch(() => false);
      assert.strictEqual(exists, true);
      
      // Verify content
      const content = await fs.readFile(outputPath, 'utf-8');
      assert(content.includes('# Test Heading'));
      assert(content.includes('This is a test paragraph.'));
      assert(content.includes('- Item 1'));
      assert(content.includes('- Item 2'));
      assert(content.includes('- Item 3'));
    });
  });
});