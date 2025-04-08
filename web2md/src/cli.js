import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fetchHtml } from './fetcher.js';
import { convertHtmlToMarkdown } from './converter.js';
import { determineOutputPath } from './utils.js';
import { convertToMarkdown, batchConvert, Web2MdError } from './index.js';

/**
 * Runs the CLI application
 */
export async function run() {
  const program = new Command();
  
  program
    .name('web2md')
    .description('Transform HTML webpages into structured markdown documents')
    .version('1.0.0');
  
  // Single conversion command
  program
    .command('convert')
    .description('Convert a single HTML source to Markdown')
    .argument('<source>', 'URL or file path to convert')
    .option('-o, --output <directory>', 'Output directory', '.')
    .option('-f, --force', 'Overwrite existing files', false)
    .option('-t, --timeout <ms>', 'Timeout in milliseconds', 30000)
    .option('-r, --retries <number>', 'Maximum number of retries', 3)
    .action(async (source, options) => {
      const spinner = ora('Processing...').start();
      
      try {
        // Convert to Markdown
        spinner.text = `Converting ${source} to Markdown...`;
        const outputPath = await convertToMarkdown(source, {
          outputDir: options.output,
          force: options.force,
          timeout: options.timeout,
          maxRetries: options.retries
        });
        
        // Success!
        spinner.succeed(`Successfully converted to ${chalk.green(outputPath)}`);
      } catch (error) {
        if (error instanceof Web2MdError && 
            error.code === Web2MdError.errorCodes.FILE_EXISTS_ERROR) {
          spinner.fail(error.message);
          spinner.info(`Use --force to overwrite existing files.`);
        } else {
          spinner.fail(`Error: ${error.message}`);
        }
        process.exit(1);
      }
    });
  
  // Batch conversion command
  program
    .command('batch')
    .description('Convert multiple HTML sources to Markdown')
    .argument('<file>', 'File containing a list of URLs or file paths, one per line')
    .option('-o, --output <directory>', 'Output directory', '.')
    .option('-f, --force', 'Overwrite existing files', false)
    .option('-t, --timeout <ms>', 'Timeout in milliseconds', 30000)
    .option('-r, --retries <number>', 'Maximum number of retries', 3)
    .option('-c, --concurrency <number>', 'Maximum number of concurrent conversions', 3)
    .action(async (file, options) => {
      const spinner = ora('Processing batch...').start();
      
      try {
        // Read the list of sources
        spinner.text = `Reading sources from ${file}...`;
        const sourcesContent = await fs.readFile(file, 'utf-8');
        const sources = sourcesContent
          .split('\n')
          .map(line => line.trim())
          .filter(Boolean);
        
        if (sources.length === 0) {
          spinner.warn(`No sources found in ${file}`);
          process.exit(0);
        }
        
        spinner.text = `Converting ${sources.length} sources...`;
        
        // Convert sources in batch
        const results = await batchConvert(sources, {
          outputDir: options.output,
          force: options.force,
          timeout: options.timeout,
          maxRetries: options.retries,
          concurrencyLimit: options.concurrency
        });
        
        // Report results
        if (results.successful.length > 0) {
          spinner.succeed(`Successfully converted ${results.successful.length} sources.`);
          results.successful.forEach(({ source, outputPath }) => {
            console.log(`  ${chalk.green('✓')} ${source} -> ${outputPath}`);
          });
        }
        
        if (results.failed.length > 0) {
          spinner.fail(`Failed to convert ${results.failed.length} sources.`);
          results.failed.forEach(({ source, error }) => {
            console.log(`  ${chalk.red('✗')} ${source}: ${error.message}`);
          });
          
          process.exit(1);
        }
      } catch (error) {
        spinner.fail(`Error: ${error.message}`);
        process.exit(1);
      }
    });
  
  // Default command (if no subcommand specified, convert command is used)
  program
    .argument('[source]', 'URL or file path to convert')
    .option('-o, --output <directory>', 'Output directory', '.')
    .option('-f, --force', 'Overwrite existing files', false)
    .option('-t, --timeout <ms>', 'Timeout in milliseconds', 30000)
    .option('-r, --retries <number>', 'Maximum number of retries', 3)
    .action(async (source, options) => {
      if (!source) {
        program.help();
        return;
      }
      
      const spinner = ora('Processing...').start();
      
      try {
        // Convert to Markdown
        spinner.text = `Converting ${source} to Markdown...`;
        const outputPath = await convertToMarkdown(source, {
          outputDir: options.output,
          force: options.force,
          timeout: options.timeout,
          maxRetries: options.retries
        });
        
        // Success!
        spinner.succeed(`Successfully converted to ${chalk.green(outputPath)}`);
      } catch (error) {
        if (error instanceof Web2MdError && 
            error.code === Web2MdError.errorCodes.FILE_EXISTS_ERROR) {
          spinner.fail(error.message);
          spinner.info(`Use --force to overwrite existing files.`);
        } else {
          spinner.fail(`Error: ${error.message}`);
        }
        process.exit(1);
      }
    });
  
  await program.parseAsync(process.argv);
}