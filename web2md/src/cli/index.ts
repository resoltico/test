import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import { convert } from '../converters/index.js';
import { fetchFromUrl, fetchFromFile } from '../fetchers/index.js';
import { determineOutputPath, expandTilde } from '../utils/path-utils.js';
import { analyzeCommand } from '../utils/output-analyzer.js';
// Fix: Changed 'assert' to 'with' for the import attribute
import pkg from '../../package.json' with { type: 'json' };
const { version } = pkg;

/**
 * Command line interface for web2md
 */
export async function cli() {
  const program = new Command();

  program
    .name('web2md')
    .description('Convert HTML webpages to Markdown with customizable schemas')
    .version(version);

  program
    .command('convert')
    .description('Convert HTML to Markdown')
    .option('-u, --url <url>', 'URL of the webpage to convert')
    .option('-f, --file <file>', 'Path to the local HTML file to convert')
    .option('-o, --output <path>', 'Output file path')
    .option('-s, --schema <path>', 'Path to custom conversion schema JSON file')
    .action(async (options) => {
      // Check if we have either a URL or a file but not both
      if (!options.url && !options.file) {
        console.error(chalk.red('Error: You must provide either a URL (-u) or a file path (-f)'));
        process.exit(1);
      }

      if (options.url && options.file) {
        console.error(chalk.red('Error: You cannot provide both a URL and a file path'));
        process.exit(1);
      }

      // Expand tilde in file paths
      if (options.file) {
        options.file = expandTilde(options.file);
      }
      
      if (options.output) {
        options.output = expandTilde(options.output);
      }
      
      if (options.schema) {
        options.schema = expandTilde(options.schema);
      }

      const spinner = ora('Starting conversion...').start();

      try {
        let html: string;
        let inputSource: string;

        // Fetch HTML content
        if (options.url) {
          spinner.text = `Fetching HTML from ${options.url}...`;
          html = await fetchFromUrl(options.url);
          inputSource = options.url;
        } else {
          spinner.text = `Reading HTML from ${options.file}...`;
          html = await fetchFromFile(options.file);
          inputSource = options.file;
        }

        // Convert HTML to Markdown
        spinner.text = 'Converting HTML to Markdown...';
        const markdown = await convert(html, options.schema);

        // Determine output path and save the Markdown
        const outputPath = await determineOutputPath(inputSource, options.output);
        spinner.text = `Saving Markdown to ${outputPath}...`;
        await fs.writeFile(outputPath, markdown, 'utf-8');
        
        spinner.succeed(`Conversion complete. Output saved to ${outputPath}`);
      } catch (error) {
        spinner.fail('Conversion failed');
        if (error instanceof Error) {
          console.error(chalk.red(`Error: ${error.message}`));
        } else {
          console.error(chalk.red('An unknown error occurred'));
        }
        process.exit(1);
      }
    });

  program
    .command('analyze')
    .description('Analyze differences between expected and actual Markdown output')
    .argument('<expected>', 'Path to the expected Markdown file')
    .argument('<actual>', 'Path to the actual generated Markdown file')
    .action(async (expected, actual) => {
      try {
        // Make sure to await the analysis
        await analyzeCommand(expandTilde(expected), expandTilde(actual));
      } catch (error) {
        console.error(chalk.red('Analysis failed:'), error);
        process.exit(1);
      }
    });

  // For backward compatibility, make 'convert' the default command
  if (process.argv.length <= 2 || !['convert', 'analyze'].includes(process.argv[2])) {
    // If the first argument isn't a command, assume it's for 'convert'
    const args = process.argv.slice(2);
    process.argv = [process.argv[0], process.argv[1], 'convert', ...args];
  }

  program.parse();
}
