#!/usr/bin/env node

import { cli } from './cli/index.js';

/**
 * Main entry point for the web2md application
 */
async function main() {
  try {
    await cli();
  } catch (error) {
    console.error('An unexpected error occurred:', error);
    process.exit(1);
  }
}

main();
