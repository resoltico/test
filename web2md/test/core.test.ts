/**
 * Core Pipeline Tests
 * 
 * Tests for the main conversion pipeline.
 */

import { describe, it } from 'mocha';
import assert from 'assert';
import { convert } from '../src/core/pipeline.js';

describe('Core HTML to Markdown pipeline', function() {
  it('should convert basic HTML to Markdown', async function() {
    const html = '<h1>Title</h1><p>This is a paragraph.</p>';
    const markdown = await convert(html);
    
    assert.strictEqual(markdown.trim(), '# Title\n\nThis is a paragraph.');
  });
  
  it('should preserve links correctly', async function() {
    const html = '<a href="https://example.com?q=test&p=1">Link</a>';
    const markdown = await convert(html);
    
    assert.strictEqual(markdown.trim(), '[Link](https://example.com?q=test&p=1)');
  });
  
  it('should handle email links correctly', async function() {
    const html = '<a href="mailto:user@example.com">Email</a>';
    const markdown = await convert(html);
    
    assert.strictEqual(markdown.trim(), '[Email](mailto:user@example.com)');
  });
  
  it('should convert lists correctly', async function() {
    const html = '<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>';
    const markdown = await convert(html);
    
    assert.strictEqual(markdown.trim(), '- Item 1\n- Item 2\n- Item 3');
  });
  
  it('should convert tables correctly', async function() {
    const html = `
      <table>
        <thead>
          <tr>
            <th>Col 1</th>
            <th>Col 2</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Value 1</td>
            <td>Value 2</td>
          </tr>
        </tbody>
      </table>
    `;
    const markdown = await convert(html);
    
    // Check table structure (not exact formatting)
    assert.match(markdown, /\| Col 1 \| Col 2 \|/);
    assert.match(markdown, /\| Value 1 \| Value 2 \|/);
  });
  
  it('should convert code blocks correctly', async function() {
    const html = `
      <pre><code class="language-javascript">
        function example() {
          return "Hello, world!";
        }
      </code></pre>
    `;
    const markdown = await convert(html);
    
    // Check code block markers and language
    assert.match(markdown, /```javascript/);
    assert.match(markdown, /function example\(\)/);
    assert.match(markdown, /```\s*$/);
  });
  
  it('should convert math expressions correctly', async function() {
    const html = '<div class="math math-display">E = mc^2</div>';
    const markdown = await convert(html);
    
    assert.match(markdown, /\$\$[\s\S]*E = mc\^2[\s\S]*\$\$/);
  });
});
