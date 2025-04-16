import { Command } from 'commander';
import chalk from 'chalk';
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
  private async handleCommand(options: CLICommandOptions): Promise<void> {
    // Ensure either file or URL is provided
    if (!options.file && !options.url) {
      throw new Error('You must specify either a file (-f) or URL (-u)');
    }
    
    // Enable debug mode if requested
    if (options.debug) {
      this.logger.setDebug(true);
    }
    
    // Load configurations
    const config = await this.configLoader.loadConfig();
    
    // Override configurations from CLI options
    if (options.debug !== undefined) {
      config.debug = options.debug;
    }
    
    if (options.deobfuscate !== undefined) {
      config.deobfuscation.enabled = options.deobfuscate;
    }
    
    if (options.userAgent && config.http) {
      config.http.userAgent = options.userAgent;
    }
    
    // Configure the HTTP client with options from config
    const httpOptions = config.http || this.httpClient.getDefaultOptions();
    this.httpClient.configure(httpOptions);
    
    // Configure the deobfuscator
    this.deobfuscator.configure(config.deobfuscation);
    
    // Load rules using the secure rules manager
    const rules = await this.rulesManager.loadRules(config, options.rulesDir);
    
    // Read input content
    let html: string;
    const sourcePath = options.file || options.url || '';
    const isUrl = Boolean(options.url);
    
    if (isUrl) {
      this.logger.info(`Fetching content from URL: ${sourcePath}`);
      
      // URLReader now uses HTTP client with custom options
      html = await this.urlReader.read(sourcePath);
    } else {
      this.logger.info(`Reading file: ${sourcePath}`);
      html = await this.fileReader.read(sourcePath);
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
}
