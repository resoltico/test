/**
 * Export vendor type declarations 
 * This helps TypeScript recognize third-party libraries
 */

// Explicitly import all vendor type declarations
// Note: We use .ts extension here for TypeScript development
// The build process will convert to .js for the compiled code
import './turndown.d';
import './zstd-napi.d';
import './mathjax-node.d';

// No exports needed - just used for TypeScript recognition