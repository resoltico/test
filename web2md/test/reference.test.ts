/**
 * Reference Tests
 * 
 * Tests conversion against reference examples.
 */

import { describe, it } from 'mocha';
import assert from 'assert';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { convert } from '../src/core/pipeline.js';

// Get proper __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Reference examples', function() {
  it('converts complex HTML according to expectations', async function() {
    const html = await fs.readFile(path.join(__dirname, 'fixtures/input.html'), 'utf8');
    const expected = await fs.readFile(path.join(__dirname, 'fixtures/expected.md'), 'utf8');
    
    const result = await convert(html);
    
    // Compare, allowing for whitespace differences
    const normalizedResult = normalizeWhitespace(result);
    const normalizedExpected = normalizeWhitespace(expected);
    
    assert.strictEqual(normalizedResult, normalizedExpected);
  });
});

/**
 * Normalize whitespace in a string for comparison
 * 
 * @param text - The text to normalize
 * @returns The normalized text
 */
function normalizeWhitespace(text: string): string {
  return text
    .trim()
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    // Replace multiple blank lines with a single blank line
    .replace(/\n{3,}/g, '\n\n')
    // Normalize spaces at the beginning of lines
    .replace(/^[ \t]+/gm, '')
    // Normalize spaces at the end of lines
    .replace(/[ \t]+$/gm, '');
}