import assert from 'assert';
import { convert } from '../src/converters/index.js';

describe('HTML to Markdown conversion', function() {
  it('should convert basic HTML to Markdown', async function() {
    const html = '<h1>Hello World</h1><p>This is a test</p>';
    const markdown = await convert(html);
    
    assert.strictEqual(markdown.trim(), '# Hello World\n\nThis is a test');
  });
  
  it('should handle inline formatting', async function() {
    const html = '<p>This is <strong>bold</strong> and <em>italic</em> text.</p>';
    const markdown = await convert(html);
    
    assert.strictEqual(markdown.trim(), 'This is **bold** and *italic* text.');
  });
  
  it('should convert links properly', async function() {
    const html = '<p>Check out <a href="https://example.com">this link</a>.</p>';
    const markdown = await convert(html);
    
    assert.strictEqual(markdown.trim(), 'Check out [this link](https://example.com).');
  });
  
  it('should handle lists', async function() {
    const html = `
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
        <li>Item 3</li>
      </ul>
    `;
    const markdown = await convert(html);
    
    // Remove extra whitespace and check if the content is correct
    const cleanedMarkdown = markdown.trim().replace(/\s+/g, ' ');
    assert.ok(cleanedMarkdown.includes('- Item 1'));
    assert.ok(cleanedMarkdown.includes('- Item 2'));
    assert.ok(cleanedMarkdown.includes('- Item 3'));
  });
  
  it('should handle code blocks', async function() {
    const html = `
      <pre><code>function test() {
  console.log('Hello, world!');
}</code></pre>
    `;
    const markdown = await convert(html);
    
    assert.ok(markdown.includes('```'));
    assert.ok(markdown.includes('function test()'));
  });
});
