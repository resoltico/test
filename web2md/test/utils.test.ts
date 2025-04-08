import assert from 'assert';
import { sanitizePath } from '../src/utils/path-utils.js';

describe('Path utilities', function() {
  describe('sanitizePath', function() {
    it('should replace invalid characters in file paths', function() {
      const tests = [
        { input: 'file.md', expected: 'file.md' },
        { input: 'file/with:invalid*chars?.md', expected: 'file/with_invalid_chars_.md' },
        { input: 'file<>\\|".md', expected: 'file_____.md' }
      ];
      
      for (const test of tests) {
        const result = sanitizePath(test.input);
        assert.strictEqual(result, test.expected);
      }
    });
  });
});
