#!/usr/bin/env node

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createApp } from '../dist/app.js';

// Calculate the root directory for rule loading
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

// Create and run the application
const app = createApp({ rootDir });
app.run(process.argv).catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
