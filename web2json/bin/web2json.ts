#!/usr/bin/env node

import { createCLI } from '../cli.js';

async function main() {
  try {
    const program = await createCLI();
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main();
