import { Command } from 'commander';
import chalk from 'chalk';
import { promises as fs } from 'node:fs';
import { CLICommandOptions, Config } from '../../types/core/config.js';
import { ConfigLoader } from '../config/loader.js';
import { HTTPClient } from '../http/client.js';
import { ContentDecoder } from '../decoder/content-decoder.js';
import { Deobfuscator } from '../deobfuscator/deobfuscator.js';
import { RulesManager } from '../rules/manager.js';
import { Converter } from '../converter/converter.js';
import { FileReader, URLReader } from '../io/reader.js';
import { OutputWriter } from '../io/writer.js';
import { Logger } from '../../shared/logger/console.js';

/**
 * Command Line Interface for web2md
 */
export class CLI {
  private program: Command;
  
  constructor(
    private configLoader: ConfigLoader,
    private httpClient: HTTPClient,
    private contentDecoder: ContentDecoder,
    private deobfuscator: Deobfuscator,
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
   * @param argv Command line arguments
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
      .option('--user-agent <string>', 'Custom user agent string (overrides config)')
      .option('--rules-dir <directory>', 'Use rules from directory manifest (overrides config)')
      .option('--deobfuscate', 'Force enable deobfuscation (overrides config)')
      .option('--no-deobfuscate', 'Disable deobfuscation (overrides config)')
      .option('--debug', 'Enable debug mode with detailed logging')
      .option('--save-original', 'Save original HTML content to file before processing')
      .option('--no-compression', 'Disable support for compressed responses')
      .option('--math-inline-delimiter <string>', 'Set delimiter for inline math (default: $)')
      .option('--math-block-delimiter <string>', 'Set delimiter for block math (default: $$)')
      .option('--no-math', 'Disable math processing')
      .action(async (options) => {
        try {
          await this.handleCommand(options);
        } catch (error) {
          if (error instanceof Error) {
            console.error(chalk.red(`Error: ${error.message}`));
            if (options.debug) {
              console.error(error.stack);
            }
          }
          process.exit(1);
        }
      });
  }
  
  /**
   * Handle the command
   * @param options Command options
   */
  private async handleCommand(options: CLICommandOptions & { 
    saveOriginal?: boolean; 
    compression?: boolean;
    math?: boolean;
    mathInlineDelimiter?: string;
    mathBlockDelimiter?: string;
  }): Promise<void> {
    // Ensure either file or URL is provided
    if (!this.validateInputOptions(options)) {
      throw new Error('You must specify either a file (-f) or URL (-u)');
    }
    
    // Enable debug mode if requested
    if (options.debug) {
      this.logger.setDebug(true);
      this.logger.debug('Debug mode enabled');
    }
    
    // Load configurations
    const config = await this.configLoader.loadConfig();
    
    // Apply CLI overrides to configuration
    this.applyConfigOverrides(config, options);
    
    // Configure the HTTP client with options from config
    const httpOptions = config.http || this.httpClient.getDefaultOptions();
    this.httpClient.configure(httpOptions);
    
    // Configure the deobfuscator
    this.deobfuscator.configure(config.deobfuscation);
    
    // Handle math option
    if (options.math === false) {
      config.math.enabled = false;
      this.logger.debug('Math processing disabled via command line option');
    }
    
    // Load rules using the secure rules manager
    const rules = await this.rulesManager.loadRules(config, options.rulesDir);
    
    // Read input content
    let html: string;
    const sourcePath = options.file || options.url || '';
    const isUrl = Boolean(options.url);
    
    if (isUrl) {
      // Let the URLReader handle logging the fetch operation
      html = await this.urlReader.read(sourcePath);
    } else {
      this.logger.info(`Reading file: ${sourcePath}`);
      html = await this.fileReader.read(sourcePath);
    }
    
    // Save original HTML if requested
    if (options.saveOriginal) {
      await this.saveOriginalHtml(sourcePath, html);
    }
    
    // Apply deobfuscation if enabled
    if (this.deobfuscator.isEnabled()) {
      this.logger.info('Deobfuscating HTML content');
      html = await this.deobfuscator.process(html);
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
      outputPath,
      createDirs: true
    });
    
    if (outputPath) {
      console.log(chalk.green(`Conversion completed. Output written to ${outputPath}`));
    }
  }
  
  /**
   * Validate that required input options are provided
   */
  private validateInputOptions(options: CLICommandOptions): boolean {
    return Boolean(options.file || options.url);
  }
  
  /**
   * Apply CLI option overrides to configuration
   */
  private applyConfigOverrides(config: Config, options: CLICommandOptions & {
    compression?: boolean;
    mathInlineDelimiter?: string;
    mathBlockDelimiter?: string;
  }): void {
    if (options.debug !== undefined) {
      config.debug = options.debug;
    }
    
    if (options.deobfuscate !== undefined) {
      config.deobfuscation.enabled = options.deobfuscate;
    }
    
    if (options.userAgent && config.http) {
      config.http.userAgent = options.userAgent;
    }
    
    // Handle compression option
    if (options.compression === false && config.http) {
      config.http.compression.enabled = false;
      this.logger.debug('Compression support disabled via command line option');
    }
    
    // Handle math delimiter options
    if (options.mathInlineDelimiter) {
      config.math.inlineDelimiter = options.mathInlineDelimiter;
      this.logger.debug(`Math inline delimiter set to ${options.mathInlineDelimiter}`);
    }
    
    if (options.mathBlockDelimiter) {
      config.math.blockDelimiter = options.mathBlockDelimiter;
      this.logger.debug(`Math block delimiter set to ${options.mathBlockDelimiter}`);
    }
  }
  
  /**
   * Save original HTML content to file
   */
  private async saveOriginalHtml(sourcePath: string, html: string): Promise<void> {
    const originalFilePath = `${sourcePath.replace(/\/$/, '')}.original.html`;
    try {
      await fs.writeFile(originalFilePath, html, 'utf-8');
      this.logger.info(`Original HTML content saved to ${originalFilePath}`);
    } catch (error) {
      this.logger.error(`Failed to save original HTML: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}