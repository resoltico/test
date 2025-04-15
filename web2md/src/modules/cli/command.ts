import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigLoader } from '../config/index.js';
import { RulesManager } from '../rules/index.js';
import { Converter } from '../converter/index.js';
import { FileReader, URLReader, OutputWriter } from '../io/index.js';
import { Logger } from '../../shared/logger/index.js';
import { CLICommandOptions } from './types.js';

export class CLI {
  private program: Command;
  
  constructor(
    private configLoader: ConfigLoader,
    private rulesManager: RulesManager,
    private converter: Converter,
    private fileReader: FileReader,
    private urlReader: URLReader,
    private outputWriter: OutputWriter,
    private logger: Logger
  ) {
    this.program = new Command();
    this.setupProgram();
  }
  
  /**
   * Execute the CLI
   */
  async execute(argv: string[]): Promise<void> {
    await this.program.parseAsync(argv);
  }
  
  /**
   * Set up the command-line program
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
      .action(async (options: CLICommandOptions) => {
        try {
          await this.handleCommand(options);
        } catch (error: any) {
          console.error(chalk.red(`Error: ${error.message}`));
          if (options.debug) {
            console.error(error.stack);
          }
          process.exit(1);
        }
      });
  }
  
  /**
   * Handle the command
   */
  private async handleCommand(options: CLICommandOptions): Promise<void> {
    // Ensure either file or URL is provided
    if (!options.file && !options.url) {
      throw new Error('You must specify either a file (-f) or URL (-u)');
    }
    
    // Enable debug mode if requested
    if (options.debug) {
      this.logger.setDebug(true);
    }
    
    // Load configuration
    const config = await this.configLoader.loadConfig();
    
    // Override debug setting from options
    if (options.debug !== undefined) {
      config.debug = options.debug;
    }
    
    // Load rules
    const rules = await this.rulesManager.loadRules(config, options.rulesDir);
    
    // Read input content
    let html: string;
    const sourcePath = options.file || options.url || '';
    const isUrl = Boolean(options.url);
    
    if (isUrl) {
      this.logger.info(`Fetching content from URL: ${sourcePath}`);
      html = await this.urlReader.read(sourcePath);
    } else {
      this.logger.info(`Reading file: ${sourcePath}`);
      html = await this.fileReader.read(sourcePath);
    }
    
    // Convert HTML to Markdown
    this.logger.info('Converting HTML to Markdown');
    const markdown = await this.converter.convert(html, rules, config);
    
    // Determine output path if not specified
    let outputPath = options.output;
    if (!outputPath && sourcePath) {
      outputPath = OutputWriter.determineOutputPath(sourcePath, isUrl);
      this.logger.info(`No output path specified, using ${outputPath}`);
    }
    
    // Write output
    await this.outputWriter.write(markdown, {
      sourcePath,
      isUrl,
      outputPath
    });
    
    if (outputPath) {
      console.log(chalk.green(`Conversion completed. Output written to ${outputPath}`));
    }
  }
}