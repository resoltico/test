// src/cli.ts
import { Command } from 'commander';
import { processUrl, processFile } from './index.js';
import { logger } from './utils/logger.js';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

// Get package info
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(resolve(__dirname, '../package.json'), 'utf-8')
);

/**
 * Initialize and run the CLI
 */
export async function runCli(args: string[]): Promise<void> {
  const program = new Command();
  
  program
    .name('web2json')
    .description('Convert HTML websites to structured JSON')
    .version(packageJson.version);
  
  program
    .argument('<source>', 'URL or local file path to process')
    .argument('[output]', 'Output JSON file path', determineDefaultOutput)
    .option('-f, --file', 'Force treating source as local file')
    .option('-u, --url', 'Force treating source as URL')
    .action(async (source, output, options) => {
      try {
        // Determine if source is a URL or local file
        if (options.url || (!options.file && isUrl(source))) {
          await processUrl(source, output);
        } else {
          await processFile(source, output);
        }
        
        logger.success(`JSON output written to ${output}`);
      } catch (error) {
        logger.error(`Error: ${(error as Error).message}`);
        process.exit(1);
      }
    });
  
  await program.parseAsync(args);
}

/**
 * Determine if the source is a URL
 */
function isUrl(source: string): boolean {
  try {
    new URL(source);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Determine default output path based on input source
 */
function determineDefaultOutput(source: string): string {
  // Remove protocol and special characters for URL
  if (isUrl(source)) {
    try {
      const url = new URL(source);
      const hostname = url.hostname.replace(/[^a-zA-Z0-9]/g, '-');
      const pathname = url.pathname.replace(/[^a-zA-Z0-9]/g, '-');
      return `${hostname}${pathname === '/' ? '' : pathname}.json`;
    } catch (error) {
      return 'output.json';
    }
  }
  
  // For local file, change extension
  if (source.toLowerCase().endsWith('.html') || source.toLowerCase().endsWith('.htm')) {
    return source.replace(/\.html?$/i, '.json');
  }
  
  return `${source}.json`;
}
