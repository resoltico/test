import assert from 'assert';
import path from 'path';
import os from 'os';
import { sanitizePath, sanitizeFilename, expandTilde } from '../src/utils/path-utils.js';

describe('Path utilities', function() {
  describe('sanitizeFilename', function() {
    it('should replace invalid characters in filenames', function() {
      const tests = [
        { input: 'file.md', expected: 'file.md' },
        { input: 'file:invalid*chars?.md', expected: 'file_invalid_chars_.md' },
        { input: 'file<>"|.md', expected: 'file____.md' }
      ];
      
      for (const test of tests) {
        const result = sanitizeFilename(test.input);
        assert.strictEqual(result, test.expected);
      }
    });
  });

  describe('sanitizePath', function() {
    it('should preserve path structure while sanitizing filename', function() {
      const tests = [
        { 
          input: '/path/to/file.md', 
          expected: path.join('/path/to', 'file.md') 
        },
        { 
          input: '/path/to/file:invalid*chars?.md', 
          expected: path.join('/path/to', 'file_invalid_chars_.md') 
        },
        { 
          input: '~/path/to/file<>"|.md', 
          expected: path.join(expandTilde('~/path/to'), 'file____.md') 
        }
      ];
      
      for (const test of tests) {
        const result = sanitizePath(test.input);
        assert.strictEqual(result, test.expected);
      }
    });
  });

  describe('expandTilde', function() {
    it('should expand tilde to home directory', function() {
      const homeDir = os.homedir();
      
      const tests = [
        { input: '~', expected: homeDir },
        { input: '~/Downloads', expected: path.join(homeDir, 'Downloads') },
        { input: '/absolute/path', expected: '/absolute/path' },
        { input: 'relative/path', expected: 'relative/path' },
        { input: 'file~with~tildes', expected: 'file~with~tildes' }
      ];
      
      for (const test of tests) {
        const result = expandTilde(test.input);
        assert.strictEqual(result, test.expected);
      }
    });
  });
});
