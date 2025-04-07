#!/usr/bin/env node
// src/bin/web2json.ts
import { runCli } from '../cli.js';

// Run the CLI with process arguments
runCli(process.argv).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
