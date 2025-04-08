#!/usr/bin/env node

import { run } from '../src/cli.js';

run().catch(error => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});