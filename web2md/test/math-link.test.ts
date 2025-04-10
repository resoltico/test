/**
 * Math and Link Tests
 * 
 * Tests specifically for math and link processing.
 */

import { describe, it } from 'mocha';
import assert from 'assert';
import { convert } from '../src/core/pipeline.js';

describe('Math processing', function() {
  it('should convert MathML to LaTeX correctly', async function() {
    const html = `
      <math xmlns="http://www.w3.org/1998/Math/MathML">
        <mrow>
          <mi>J</mi>
          <mo>=</mo>
          <mi>T</mi>
          <mo>×</mo>
          <msqrt>
            <mi>S</mi>
          </msqrt>
          <mo>×</mo>
          <mfrac>
            <mi>P</mi>
            <mrow>
              <mi>log</mi>
              <mo>(</mo>
              <mi>audience</mi>
              <mo>)</mo>
            </mrow>
          </mfrac>
        </mrow>
      </math>
    `;
    const markdown = await convert(html);
    
    // The formula should be properly converted to LaTeX
    assert.match(markdown, /\$\$\s*J = T \\times \\sqrt\{S\} \\times \\frac\{P\}\{log\(audience\)\}\s*\$\$/);
  });
  
  it('should handle inline math correctly', async function() {
    const html = '<p>The formula <span class="math math-inline">a^2 + b^2 = c^2</span> is the Pythagorean theorem.</p>';
    const markdown = await convert(html);
    
    assert.match(markdown, /The formula \$a\^2 \+ b\^2 = c\^2\$ is the Pythagorean theorem\./);
  });
  
  it('should handle display math correctly', async function() {
    const html = '<div class="math math-display">E = mc^2</div>';
    const markdown = await convert(html);
    
    assert.match(markdown, /\$\$\s*E = mc\^2\s*\$\$/);
  });
});

describe('Link preservation', function() {
  it('should preserve exact links including query parameters', async function() {
    const html = '<a href="https://example.com?param=value&another=true">Link with query params</a>';
    const markdown = await convert(html);
    
    assert.strictEqual(markdown.trim(), '[Link with query params](https://example.com?param=value&another=true)');
  });
  
  it('should preserve email links correctly', async function() {
    const html = '<a href="mailto:user@example.com">Email Link</a>';
    const markdown = await convert(html);
    
    assert.strictEqual(markdown.trim(), '[Email Link](mailto:user@example.com)');
  });
  
  it('should handle relative links correctly', async function() {
    const html = '<a href="/path/to/page.html">Relative Link</a>';
    const markdown = await convert(html);
    
    assert.strictEqual(markdown.trim(), '[Relative Link](/path/to/page.html)');
  });
  
  it('should preserve links with special characters', async function() {
    const html = '<a href="https://example.com/search?q=special+chars%20&page=1">Special Chars</a>';
    const markdown = await convert(html);
    
    assert.strictEqual(markdown.trim(), '[Special Chars](https://example.com/search?q=special+chars%20&page=1)');
  });
});
