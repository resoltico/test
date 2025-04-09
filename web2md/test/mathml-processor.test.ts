import assert from 'assert';
import { processMathML } from '../src/converters/mathml-processor.js';

describe('MathML processor', function() {
  it('should process HTML with MathML without errors', async function() {
    const html = `
      <div>
        <math xmlns="http://www.w3.org/1998/Math/MathML">
          <mrow>
            <mi>a</mi>
            <mo>+</mo>
            <mi>b</mi>
          </mrow>
        </math>
      </div>
    `;
    
    // This should not throw an error
    const processed = await processMathML(html);
    
    // Should return some form of HTML string
    assert.strictEqual(typeof processed, 'string');
    assert.ok(processed.includes('<div>'));
  });
  
  it('should handle HTML without MathML', async function() {
    const html = '<p>This is a paragraph without any math.</p>';
    
    const processed = await processMathML(html);
    
    // Should return the original HTML
    assert.strictEqual(processed, html);
  });
  
  it('should handle HTML with invalid MathML', async function() {
    const html = `
      <div>
        <math xmlns="http://www.w3.org/1998/Math/MathML">
          <invalid>This is not valid MathML</invalid>
        </math>
      </div>
    `;
    
    // This should not throw an error
    const processed = await processMathML(html);
    
    // Should return some form of HTML string
    assert.strictEqual(typeof processed, 'string');
  });
});
