import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fetchFromUrl, fetchFromFile, parseHtml } from './fetcher.js';
import { parseDocument } from './parser.js';
import { formatJson, validateJsonStructure } from './utils/json.js';
import { resolveOutputPath } from './utils/path.js';
import { logger } from './utils/logger.js';

// Package version and description
const packageInfo = {
  name: 'web2json',
  version: '1.0.0',
  description: 'Convert HTML webpages to structured JSON'
};

/**
 * Configure the command line interface
 */
export function createCli(): Command {
  const program = new Command();
  
  program
    .name(packageInfo.name)
    .version(packageInfo.version)
    .description(packageInfo.description);
  
  program
    .option('-u, --url <url>', 'URL of the webpage to convert')
    .option('-f, --file <filepath>', 'Path to local HTML file to convert')
    .option('-o, --output <directory>', 'Output directory for the converted JSON')
    .option('-d, --debug', 'Enable debug mode for additional logging')
    .option('-s, --silent', 'Suppress all output except errors');
  
  program.action(async (options) => {
    try {
      // Validate options
      if (!options.url && !options.file) {
        console.error(chalk.red('Error: You must provide either a URL or a file path.'));
        program.help();
        return;
      }
      
      if (options.url && options.file) {
        console.error(chalk.red('Error: Please provide either a URL or a file path, not both.'));
        program.help();
        return;
      }
      
      // Configure logger based on options
      if (options.debug) {
        Object.defineProperty(logger, 'debugMode', { value: true });
      }
      
      if (options.silent) {
        // Silence console output
        console.log = () => {};
        console.info = () => {};
      }
      
      // Process the input
      await processInput(options);
      
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });
  
  return program;
}

/**
 * Process the input based on the provided options
 */
async function processInput(options: any): Promise<void> {
  // Spinner for better user experience
  const spinner = ora('Processing...').start();
  
  try {
    let html: string;
    let inputSource: string;
    
    // Fetch HTML from URL or file
    if (options.url) {
      spinner.text = `Fetching HTML from URL: ${options.url}`;
      html = await fetchFromUrl(options.url);
      inputSource = options.url;
    } else {
      spinner.text = `Reading HTML from file: ${options.file}`;
      html = await fetchFromFile(options.file);
      inputSource = options.file;
    }
    
    // Parse HTML
    spinner.text = 'Parsing HTML content';
    const dom = parseHtml(html);
    
    // Convert to JSON structure
    spinner.text = 'Converting to JSON structure';
    const jsonData = parseDocument(dom);
    
    // Validate JSON structure
    spinner.text = 'Validating JSON structure';
    if (!validateJsonStructure(jsonData)) {
      throw new Error('Generated JSON structure is invalid');
    }
    
    // Format JSON
    spinner.text = 'Formatting JSON output';
    const jsonOutput = formatJson(jsonData);
    
    // Determine output path
    spinner.text = 'Determining output location';
    const outputPath = await resolveOutputPath(inputSource, options.output);
    
    // Write JSON file
    spinner.text = `Writing JSON to ${outputPath}`;
    await fs.writeFile(outputPath, jsonOutput, 'utf-8');
    
    // Success!
    spinner.succeed(`Conversion complete! Output saved to ${outputPath}`);
    
    if (!options.silent) {
      console.log();
      console.log(chalk.green('✨ Summary:'));
      console.log(chalk.green('  Input:'), options.url ? options.url : options.file);
      console.log(chalk.green('  Output:'), outputPath);
      console.log(chalk.green('  Size:'), `${(jsonOutput.length / 1024).toFixed(2)} KB`);
    }
    
  } catch (error) {
    spinner.fail('Conversion failed');
    throw error;
  }
}
