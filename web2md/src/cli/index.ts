/**
 * CLI implementation for web2md
 * 
 * Handles command-line arguments, displays help information,
 * and initiates the conversion process.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { convert } from '../core/pipeline.js';
import { fetchFromUrl } from '../fetchers/url.js';
import { readFromFile } from '../fetchers/file.js';
import { loadSchema } from '../schema/index.js';
import { sanitizePath } from '../utils/paths.js';
import { handleError } from '../utils/errors.js';

// Get proper __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Run the CLI application
 */
export async function run(): Promise<void> {
  const program = new Command();

  // Try to get package version
  let version = '1.0.0';
  try {
    // Get package info - using dynamic import with type assertion
    const packageJsonPath = path.join(__dirname, '../../package.json');
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContent);
    version = packageJson.version;
  } catch (error) {
    // Use default version if package.json cannot be read
  }

  program
    .name('web2md')
    .description('Transform HTML webpages into structured Markdown documents')
    .version(version)
    .option('-u, --url <url>', 'URL of the webpage to convert')
    .option('-f, --file <path>', 'Path to the HTML file to convert')
    .option('-o, --output <path>', 'Path to the output Markdown file')
    .option('-s, --schema <path>', 'Path to the schema file')
    .action(async (options) => {
      try {
        // Validate that either URL or file is provided, but not both
        if (!options.url && !options.file) {
          console.error(chalk.red('Error: Either URL or file path must be provided.'));
          program.help();
          return;
        }

        if (options.url && options.file) {
          console.error(chalk.red('Error: Cannot provide both URL and file path. Choose one.'));
          program.help();
          return;
        }

        // Sanitize output path if provided
        let outputPath: string | undefined;
        if (options.output) {
          outputPath = sanitizePath(options.output);
        }

        // Load schema if provided
        let schema;
        if (options.schema) {
          const schemaPath = sanitizePath(options.schema);
          const spinner = ora('Loading schema...').start();
          try {
            schema = await loadSchema(schemaPath);
            spinner.succeed('Schema loaded successfully');
          } catch (error) {
            spinner.fail('Failed to load schema');
            handleError(error);
            return;
          }
        }

        // Fetch HTML content
        let html: string;
        if (options.url) {
          const spinner = ora(`Fetching HTML from ${options.url}...`).start();
          try {
            html = await fetchFromUrl(options.url);
            spinner.succeed(`HTML fetched from ${options.url}`);
          } catch (error) {
            spinner.fail(`Failed to fetch HTML from ${options.url}`);
            handleError(error);
            return;
          }
        } else {
          // Must be file path at this point
          const filePath = sanitizePath(options.file);
          const spinner = ora(`Reading HTML from ${filePath}...`).start();
          try {
            html = await readFromFile(filePath);
            spinner.succeed(`HTML read from ${filePath}`);
          } catch (error) {
            spinner.fail(`Failed to read HTML from ${filePath}`);
            handleError(error);
            return;
          }
        }

        // Convert HTML to Markdown
        const spinner = ora('Converting HTML to Markdown...').start();
        try {
          const markdown = await convert(html, schema);
          spinner.succeed('HTML converted to Markdown');

          // Either write to file or print to console
          if (outputPath) {
            await fs.writeFile(outputPath, markdown);
            console.log(chalk.green(`Markdown saved to ${outputPath}`));
          } else {
            console.log('\n' + chalk.cyan('Markdown Output:'));
            console.log(markdown);
          }
        } catch (error) {
          spinner.fail('Failed to convert HTML to Markdown');
          handleError(error);
        }
      } catch (error) {
        handleError(error);
      }
    });

  // Parse command-line arguments
  await program.parseAsync(process.argv);
}