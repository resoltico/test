import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AppOptions } from './types/modules/cli.js';
import { ConsoleLogger } from './shared/logger/console.js';
import { ConfigLoader } from './modules/config/loader.js';
import { RuleRegistry, RuleValidator, ManifestLoader, YAMLRuleLoader, JSRuleLoader, RulesManager } from './modules/rules/index.js';
import { Converter } from './modules/converter/converter.js';
import { FileReader, URLReader, OutputWriter } from './modules/io/index.js';
import { CLI } from './modules/cli/command.js';

/**
 * Create application instance
 */
export function createApp(options: AppOptions) {
  // Create the logger
  const logger = new ConsoleLogger();

  // Create rule registry
  const ruleRegistry = new RuleRegistry(options.rootDir);

  // Create rule validator
  const ruleValidator = new RuleValidator(logger);

  // Create manifest loader
  const manifestLoader = new ManifestLoader(logger);

  // Create rule loaders
  const yamlRuleLoader = new YAMLRuleLoader(logger);
  const jsRuleLoader = new JSRuleLoader(logger);

  // Create rules manager with secure components
  const rulesManager = new RulesManager(
    ruleRegistry,
    ruleValidator,
    manifestLoader,
    yamlRuleLoader,
    jsRuleLoader,
    logger
  );

  // Create config loader
  const configLoader = new ConfigLoader(logger);

  // Create converter
  const converter = new Converter(logger);

  // Create IO components
  const fileReader = new FileReader(logger);
  const urlReader = new URLReader(logger);
  const outputWriter = new OutputWriter(logger);

  // Create CLI
  const cli = new CLI(
    configLoader,
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
}

/**
 * Main entry point when running directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  // Calculate the root directory for rule loading
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const rootDir = path.resolve(__dirname, '../rules');

  // Create and run the application
  const app = createApp({ rootDir });
  app.run(process.argv).catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}
