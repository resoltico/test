/**
 * Schema Tests
 * 
 * Tests for the schema validation and processing.
 */

import { describe, it } from 'mocha';
import assert from 'assert';
import { validateSchema } from '../src/schema/validation.js';
import { convert } from '../src/core/pipeline.js';

describe('Schema validation', function() {
  it('should validate a valid schema', function() {
    const schema = {
      rules: [
        {
          selector: "div.code-example",
          action: "codeBlock",
          options: {
            language: "javascript"
          }
        }
      ],
      global: {
        headingStyle: "atx",
        bulletListMarker: "-"
      }
    };
    
    const validated = validateSchema(schema);
    assert.deepStrictEqual(validated, schema);
  });
  
  it('should throw on an invalid schema', function() {
    const invalidSchema = {
      rules: [
        {
          selector: "div.code-example",
          action: "invalidAction", // Invalid action
          options: {
            language: "javascript"
          }
        }
      ]
    };
    
    assert.throws(() => validateSchema(invalidSchema), /invalidAction/);
  });
});

describe('Schema application', function() {
  it('should apply rules to transform elements', async function() {
    const html = '<div class="code-example">console.log("Hello");</div>';
    const schema = {
      rules: [
        {
          selector: "div.code-example",
          action: "codeBlock",
          options: {
            language: "javascript"
          }
        }
      ]
    };
    
    const markdown = await convert(html, schema);
    
    // Check for code block with specified language
    assert.match(markdown, /```javascript/);
    assert.match(markdown, /console\.log\("Hello"\);/);
    assert.match(markdown, /```\s*$/);
  });
  
  it('should apply global formatting options', async function() {
    const html = '<h1>Title</h1><ul><li>Item 1</li><li>Item 2</li></ul>';
    const schema = {
      global: {
        bulletListMarker: "*",
        headingStyle: "setext"
      }
    };
    
    const markdown = await convert(html, schema);
    
    // Check for setext heading style and star bullets
    assert.match(markdown, /Title\n=+/);
    assert.match(markdown, /\* Item 1/);
    assert.match(markdown, /\* Item 2/);
  });
  
  it('should remove elements specified in remove patterns', async function() {
    const html = '<div><p>Keep this</p><div class="ad">Remove this</div></div>';
    const schema = {
      remove: ["div.ad"]
    };
    
    const markdown = await convert(html, schema);
    
    // Check that the ad content is removed
    assert.match(markdown, /Keep this/);
    assert.doesNotMatch(markdown, /Remove this/);
  });
});
