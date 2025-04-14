/**
 * CLI implementation
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { Converter } from '../converter/converter.js';
import { ConfigLoader } from '../config/loader.js';
import { FileReader } from '../io/reader.js';
import { URLReader } from '../io/reader.js';
import { OutputWriter } from '../io/writer.js';
import { Logger } from '../../types.js';
import { CLIOptions } from './types.js';
import { CliError } from '../../shared/errors/index.js';

/**
 * Implements the command-line interface for the application
 */
export class CLI {
  private program: Command;
  
  constructor(
    private converter: Converter,
    private configLoader: ConfigLoader,
    private fileReader: FileReader,
    private urlReader: URLReader,
    private outputWriter: OutputWriter,
    private logger: Logger
  ) {
    this.program = new Command();
    this.setupProgram();
  }
  
  /**
   * Executes the CLI with the provided arguments
   */
  async execute(): Promise<void> {
    await this.program.parseAsync(process.argv);
  }
  
  /**
   * Sets up the command-line program
   */
  private setupProgram(): void {
    this.program
      .name('web2md')
      .description(chalk.bold('Convert HTML to Markdown with high fidelity'))
      .version('1.0.0')
      .option('-f, --file <path>', 'HTML file to convert')
      .option('-u, --url <url>', 'URL to convert')
      .option('-o, --output <file>', 'Output file (default: stdout)')
      .option('--rules-dir <directory>', 'Use rules from this directory (overrides config)')
      .option('--debug', 'Enable debug mode with detailed logging')
      .action(async (options: CLIOptions) => {
        try {
          await this.handleCommand(options);
        } catch (error) {
          console.error(chalk.red(`Error: ${(error as Error).message}`));
          if (options.debug) {
            console.error((error as Error).stack);
          }
          process.exit(1);
        }
      });
  }
  
  /**
   * Handles the command with the provided options
   */
  private async handleCommand(options: CLIOptions): Promise<void> {
    // Ensure either file or URL is provided
    if (!options.file && !options.url) {
      throw new CliError('You must specify either a file (-f) or URL (-u)');
    }
    
    // Load configuration
    const config = await this.configLoader.loadConfig();
    
    // Update configuration with CLI options
    if (options.debug !== undefined) {
      this.configLoader.updateConfig({ debug: options.debug });
    }
    
    // Process the content
    let content: string;
    const isUrl = Boolean(options.url);
    const sourcePath = options.file || options.url || '';
    
    try {
      if (isUrl) {
        this.logger.info(`Fetching content from URL: ${sourcePath}`);
        content = await this.urlReader.read(sourcePath);
      } else {
        this.logger.info(`Reading file: ${sourcePath}`);
        content = await this.fileReader.read(sourcePath);
      }
      
      // Convert the HTML to Markdown
      this.logger.info('Converting HTML to Markdown');
      const markdown = await this.converter.convert(content);
      
      // Write the output
      await this.outputWriter.write(markdown, sourcePath, isUrl, options.output);
      
      if (options.output) {
        console.log(chalk.green(`Conversion completed. Output written to ${options.output}`));
      }
    } catch (error) {
      throw new CliError(`Conversion failed: ${(error as Error).message}`);
    }
  }
}
