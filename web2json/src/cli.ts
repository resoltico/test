import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fetchFromUrl, fetchFromFile, parseHtml } from './fetcher.js';
import { parseDocument } from './parser.js';
import { formatJson, validateJsonStructure, cleanupJson, ensureDocumentStructure } from './utils/json.js';
import { resolveOutputPath } from './utils/path.js';
import { logger } from './utils/logger.js';

// Load package version from package.json
let packageVersion = '1.0.0';
try {
  const packagePath = new URL('../package.json', import.meta.url);
  const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf-8'));
  packageVersion = packageJson.version;
} catch (e) {
  // Use default version if package.json can't be read
}

// Package info
const packageInfo = {
  name: 'web2json',
  version: packageVersion,
  description: 'Convert HTML webpages to structured JSON while preserving semantic structure'
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
    .option('-s, --silent', 'Suppress all output except errors')
    .option('-p, --preserve-html', 'Preserve HTML formatting in content fields')
    .option('-r, --recursive', 'Process all nested HTML files (for local file mode)')
    .option('--skip-validation', 'Skip JSON validation (faster but less safe)')
    .option('--save-raw', 'Save raw parsed JSON before validation/cleanup');
  
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
        logger.enableDebug();
      }
      
      if (options.silent) {
        // Silence console output (except errors)
        const originalLogMethods = {
          log: console.log,
          info: console.info
        };
        
        console.log = () => {};
        console.info = () => {};
        
        // Restore original methods when process exits
        process.on('exit', () => {
          console.log = originalLogMethods.log;
          console.info = originalLogMethods.info;
        });
      }
      
      // Process the input
      await processInput(options);
      
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
      
      // Show stack trace in debug mode
      if (options.debug && error instanceof Error && error.stack) {
        console.error(chalk.gray(error.stack));
      }
      
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
  let spinner = ora('Processing...').start();
  
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
    
    // Convert to JSON structure using new parser
    spinner.text = 'Converting to JSON structure with improved hierarchy handling';
    let jsonData = parseDocument(dom);
    
    // Save raw JSON if requested
    if (options.saveRaw) {
      spinner.text = 'Saving raw JSON before cleanup';
      const rawPath = await resolveOutputPath(inputSource + '.raw', options.output);
      const rawJson = formatJson(jsonData);
      await fs.writeFile(rawPath, rawJson, 'utf-8');
      spinner.succeed(`Raw JSON saved to ${rawPath}`);
      spinner = ora('Processing...').start();
    }
    
    // Cleanup JSON to match expected format
    spinner.text = 'Cleaning up and structuring JSON output';
    jsonData = cleanupJson(jsonData);
    
    // Ensure document structure matches expected output
    jsonData = ensureDocumentStructure(jsonData);
    
    // Validate JSON structure (unless skipped)
    if (!options.skipValidation) {
      spinner.text = 'Validating JSON structure';
      if (!validateJsonStructure(jsonData)) {
        throw new Error('Generated JSON structure is invalid');
      }
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
      console.log(chalk.green('  Structure:'), `Document with ${jsonData.content.length} top-level elements`);
    }
    
    // Handle recursive processing if enabled
    if (options.recursive && options.file) {
      await processNestedHtmlFiles(options, path.dirname(options.file));
    }
    
  } catch (error) {
    spinner.fail('Conversion failed');
    throw error;
  }
}

/**
 * Process nested HTML files recursively
 */
async function processNestedHtmlFiles(options: any, baseDir: string): Promise<void> {
  // Only applicable when processing local files
  if (!options.file) {
    return;
  }
  
  try {
    // Find all HTML files in the directory
    const files = await fs.readdir(baseDir);
    const htmlFiles = files.filter(file => 
      file.toLowerCase().endsWith('.html') || 
      file.toLowerCase().endsWith('.htm')
    );
    
    // Skip the already processed file
    const originalFilename = path.basename(options.file);
    const filesToProcess = htmlFiles.filter(file => file !== originalFilename);
    
    if (filesToProcess.length === 0) {
      logger.info('No additional HTML files found for recursive processing');
      return;
    }
    
    logger.info(`Found ${filesToProcess.length} additional HTML files to process`);
    
    // Process each file
    for (const file of filesToProcess) {
      const filePath = path.join(baseDir, file);
      logger.info(`Processing additional file: ${filePath}`);
      
      // Create modified options for this file
      const fileOptions = {
        ...options,
        file: filePath,
        recursive: false // Prevent further recursion
      };
      
      try {
        await processInput(fileOptions);
      } catch (error) {
        logger.error(`Failed to process ${filePath}`, error as Error);
        // Continue with next file despite error
      }
    }
    
  } catch (error) {
    logger.error('Error during recursive processing', error as Error);
    // Don't propagate the error to allow main process to complete
  }
}