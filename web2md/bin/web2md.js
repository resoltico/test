#!/usr/bin/env node

// This is an ultra-lightweight entry point that delegates to the app
import '../dist/app.js';

// If this file is run directly during development, use tsx for fast iteration
if (process.argv[1] === import.meta.url) {
  console.warn('Running in development mode with tsx');
  await import('tsx/cjs').then(tsx => tsx.run('../src/app.ts'));
}
