#!/usr/bin/env node

// CLI entry point for web2json
import { createCli } from '../cli.js';

// Ensure Node.js version requirement
const nodeVersion = process.versions.node;
const majorVersion = parseInt(nodeVersion.split('.')[0], 10);

if (majorVersion < 22) {
  console.error(`Error: web2json requires Node.js 22 or higher.`);
  console.error(`You are running Node.js ${nodeVersion}.`);
  console.error(`Please upgrade your Node.js version to use this tool.`);
  process.exit(1);
}

// Create and run CLI
const program = createCli();
program.parse(process.argv);
