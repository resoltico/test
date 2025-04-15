#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createApp } from '../dist/app.js';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve paths
const rootDir = resolve(__dirname, '..');

// Create and run the application
const app = createApp({
  rootDir
});

app.run(process.argv)
  .catch(error => {
    console.error(error);
    process.exit(1);
  });