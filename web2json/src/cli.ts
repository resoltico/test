import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { readFile } from 'node:fs/promises';
import { convertUrlToJson, convertHtmlToJson, LogLevel } from './index.js';
import { logger } from './utils/logger.js';

interface CLIOptions {
  output?: string;
  verbose?: boolean;
  quiet?: boolean;
  preserveWhitespace?: boolean;
  decodeEntities?: boolean;
  timeout?: number;
  retries?: number;
}

export async function createCLI(): Promise<Command> {
  const program = new Command();
  
  program
    .name('web2json')
    .description('Convert HTML webpages to structured JSON')
    .version('1.0.0');
  
  program
    .argument('[url]', 'URL or file path to convert')
    .option('-o, --output <path>', 'Output file path')
    .option('-v, --verbose', 'Enable verbose logging')
    .option('-q, --quiet', 'Disable all logging except errors')
    .option('-p, --preserve-whitespace', 'Preserve whitespace in HTML')
    .option('-d, --decode-entities', 'Decode HTML entities')
    .option('-t, --timeout <ms>', 'Timeout for HTTP requests in milliseconds', '30000')
    .option('-r, --retries <count>', 'Number of retries for HTTP requests', '3')
    .action(async (url, options: CLIOptions) => {
      // Set log level based on options
      if (options.verbose) {
        logger.setLevel(LogLevel.DEBUG);
      } else if (options.quiet) {
        logger.setLevel(LogLevel.ERROR);
      }
      
      // No URL provided, show help
      if (!url) {
        program.outputHelp();
        return;
      }
      
      const spinner = ora('Processing...').start();
      
      try {
        // Determine if input is a URL or file path
        const isUrl = url.startsWith('http://') || url.startsWith('https://');
        
        if (isUrl) {
          spinner.text = `Fetching and converting URL: ${url}`;
          
          // Convert URL to JSON
          const outputPath = await convertUrlToJson(url, {
            outputPath: options.output,
            preserveWhitespace: options.preserveWhitespace,
            decodeEntities: options.decodeEntities,
            logLevel: options.verbose ? LogLevel.DEBUG : options.quiet ? LogLevel.ERROR : LogLevel.INFO,
            fetchOptions: {
              timeout: options.timeout ? parseInt(options.timeout, 10) : undefined,
              retries: options.retries ? parseInt(options.retries, 10) : undefined
            }
          });
          
          spinner.succeed(`Successfully converted URL to JSON: ${chalk.green(outputPath)}`);
        } else {
          spinner.text = `Reading and converting file: ${url}`;
          
          // Read HTML from file
          const html = await readFile(url, 'utf8');
          
          // Convert HTML to JSON
          const json = await convertHtmlToJson(html, {
            outputPath: options.output,
            preserveWhitespace: options.preserveWhitespace,
            decodeEntities: options.decodeEntities,
            logLevel: options.verbose ? LogLevel.DEBUG : options.quiet ? LogLevel.ERROR : LogLevel.INFO
          });
          
          if (options.output) {
            spinner.succeed(`Successfully converted file to JSON: ${chalk.green(options.output)}`);
          } else {
            spinner.succeed('Successfully converted file to JSON');
            // Output JSON to stdout
            console.log(json);
          }
        }
      } catch (error) {
        spinner.fail(chalk.red(`Conversion failed: ${error instanceof Error ? error.message : String(error)}`));
        process.exit(1);
      }
    });
  
  return program;
}
