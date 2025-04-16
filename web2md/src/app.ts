import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { AppOptions } from './types/core/config.js';
import { ConsoleLogger } from './shared/logger/console.js';
import { RuleRegistry } from './modules/rules/registry.js';
import { RuleValidator } from './modules/rules/validator.js';
import { ManifestLoader } from './modules/rules/manifest-loader.js';
import { YAMLRuleLoader } from './modules/rules/loaders/yaml-loader.js';
import { JSRuleLoader } from './modules/rules/loaders/js-loader.js';
import { ConfigLoader } from './modules/config/loader.js';
import { HTTPClient, HTTPDefaults } from './modules/http/index.js';
import { CompressionHandlerImpl } from './modules/decoder/compression.js';
import { CharsetHandlerImpl } from './modules/decoder/charset.js';
import { ContentDecoder } from './modules/decoder/content-decoder.js';
import { PatternDetector } from './modules/deobfuscator/patterns.js';
import { DecoderRegistry } from './modules/deobfuscator/decoder.js';
import { CloudflareEmailDecoder, Base64Decoder, ROT13Decoder } from './modules/deobfuscator/decoders/index.js';
import { Deobfuscator } from './modules/deobfuscator/deobfuscator.js';
import { RulesManager } from './modules/rules/manager.js';
import { Converter } from './modules/converter/converter.js';
import { MathProcessor } from './modules/math/processor.js';
import { FileReader, URLReader } from './modules/io/reader.js';
import { OutputWriter } from './modules/io/writer.js';
import { CLI } from './modules/cli/command.js';

/**
 * Create the application
 * @param options Application options
 * @returns The application
 */
export function createApp(options: AppOptions) {
  // Create the logger
  const logger = new ConsoleLogger();
  
  try {
    // Create rule registry
    const ruleRegistry = new RuleRegistry(options.rootDir);
    
    // Create rule validator
    const ruleValidator = new RuleValidator(logger);
    
    // Create manifest loader
    const manifestLoader = new ManifestLoader(logger);
    
    // Create rule loaders
    const yamlRuleLoader = new YAMLRuleLoader(logger);
    const jsRuleLoader = new JSRuleLoader(logger);
    
    // Create configuration loader
    const configLoader = new ConfigLoader(logger);
    
    // Create HTTP client with default options
    const httpClient = new HTTPClient(HTTPDefaults.getDefaultOptions(), logger);
    
    // Create content decoder components
    const compressionHandler = new CompressionHandlerImpl(logger);
    const charsetHandler = new CharsetHandlerImpl(logger);
    
    // Create content decoder
    const contentDecoder = new ContentDecoder(
      compressionHandler,
      charsetHandler,
      logger
    );
    
    // Create pattern detector
    const patternDetector = new PatternDetector(logger);
    
    // Create decoder registry
    const decoderRegistry = new DecoderRegistry();
    
    // Register decoders
    decoderRegistry.register(new CloudflareEmailDecoder(logger));
    decoderRegistry.register(new Base64Decoder(logger));
    decoderRegistry.register(new ROT13Decoder(logger));
    
    // Create deobfuscator
    const deobfuscator = new Deobfuscator(
      decoderRegistry, 
      patternDetector,
      logger
    );
    
    // Create rules manager with secure components
    const rulesManager = new RulesManager(
      ruleRegistry, 
      ruleValidator,
      manifestLoader,
      yamlRuleLoader,
      jsRuleLoader,
      logger
    );
    
    // Create math processor
    const mathProcessor = new MathProcessor(logger);
    
    // Create converter with math processor
    const converter = new Converter(logger, mathProcessor);
    
    // Create IO components
    const fileReader = new FileReader(logger);
    const urlReader = new URLReader(httpClient, contentDecoder, logger);
    const outputWriter = new OutputWriter(logger);
    
    // Create CLI
    const cli = new CLI(
      configLoader,
      httpClient,
      contentDecoder,
      deobfuscator,
      rulesManager,
      converter,
      fileReader,
      urlReader,
      outputWriter,
      logger
    );
    
    return {
      run: (argv: string[]) => cli.execute(argv)
    };
  } catch (error) {
    logger.error("Failed to initialize web2md application");
    if (error instanceof Error) {
      logger.error(`Error: ${error.message}`);
    }
    
    // Return a simple app that just logs the error
    return {
      run: () => {
        console.error("Critical error initializing web2md. Please check your installation.");
        process.exit(1);
      }
    };
  }
}

/**
 * Main entry point when running directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  // Calculate the root directory for rule loading
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const rootDir = resolve(__dirname, '..');
  
  // Create and run the application
  const app = createApp({ rootDir });
  app.run(process.argv).catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}