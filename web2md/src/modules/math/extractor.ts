/**
 * This file is a barrel file that exports the modularized extractor components
 * The implementation has been split into smaller, focused modules in the ./extractor/ directory
 */

export { MathExtractor } from './extractor/index.js';
export { 
  PLACEHOLDER_FORMAT, 
  PLACEHOLDER_PATTERN_REGEX, 
  UNFORMATTED_PLACEHOLDER_PATTERN 
} from './extractor/placeholder.js';

// Re-export utility functions that might be used by other modules
export { detectDisplayMode } from './extractor/display-detector.js';
export { extractContent } from './extractor/content-extractor.js';