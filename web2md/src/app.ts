import { AppOptions } from './types.js';
import { ConfigLoader } from './modules/config/index.js';
import { YAMLRuleLoader, JSRuleLoader, RulesManager, BuiltInSource, CustomSource, CLISource } from './modules/rules/index.js';
import { Converter } from './modules/converter/index.js';
import { FileReader, URLReader, OutputWriter } from './modules/io/index.js';
import { CLI } from './modules/cli/index.js';
import { ConsoleLogger } from './shared/logger/index.js';

/**
 * Create the application
 */
export function createApp(options: AppOptions) {
  // Create the logger
  const logger = new ConsoleLogger();
  
  // Create rule loaders
  const yamlRuleLoader = new YAMLRuleLoader(logger);
  const jsRuleLoader = new JSRuleLoader(logger);
  
  // Create rule sources
  const builtInSource = new BuiltInSource(
    options.rootDir,
    yamlRuleLoader,
    jsRuleLoader,
    logger
  );
  const customSource = new CustomSource(
    yamlRuleLoader,
    jsRuleLoader,
    logger
  );
  const cliSource = new CLISource(
    yamlRuleLoader,
    jsRuleLoader,
    logger
  );
  
  // Create rules manager
  const rulesManager = new RulesManager(
    builtInSource,
    customSource,
    cliSource,
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