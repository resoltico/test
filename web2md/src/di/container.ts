/**
 * Simple dependency injection container implementation
 */
import { DITokens } from './tokens.js';
import { ConsoleLogger } from '../shared/logger/console-logger.js';
import { NullLogger } from '../shared/logger/null-logger.js';
import { ConfigLoader } from '../modules/config/loader.js';
import { RulesManager } from '../modules/rules/manager.js';
import { CLI } from '../modules/cli/cli.js';
import { Converter } from '../modules/converter/converter.js';
import { FileSystemAdapter } from '../modules/io/adapters/fs-adapter.js';
import { HttpAdapter } from '../modules/io/adapters/http-adapter.js';
import { FileReader } from '../modules/io/reader.js';
import { URLReader } from '../modules/io/reader.js';
import { OutputWriter } from '../modules/io/writer.js';
import { TurndownAdapter } from '../modules/converter/adapters/turndown-adapter.js';
import { BuiltInRulesSource } from '../modules/rules/sources/built-in.js';
import { ConfigRulesSource } from '../modules/rules/sources/config.js';
import { CLIRulesSource } from '../modules/rules/sources/cli.js';
import { JSRuleLoader } from '../modules/rules/loaders/js-loader.js';
import { YAMLRuleLoader } from '../modules/rules/loaders/yaml-loader.js';
import { Logger } from '../types.js';
import { FileSystemInterface, HttpInterface } from '../modules/io/types.js';
import { TurndownServiceInterface } from '../modules/converter/types.js';
import { RuleSource } from '../modules/rules/types.js';

// Simple DI container
class Container {
  private services = new Map<symbol, any>();
  private factories = new Map<symbol, () => any>();

  // Register a singleton service with the container
  register<T>(token: symbol, instance: T): void {
    this.services.set(token, instance);
  }

  // Register a factory function that will be called to create the service
  registerFactory<T>(token: symbol, factory: () => T): void {
    this.factories.set(token, factory);
  }

  // Resolve a service from the container
  resolve<T>(token: symbol): T {
    // Check if we already have an instance
    if (this.services.has(token)) {
      return this.services.get(token) as T;
    }

    // Check if we have a factory for this token
    if (this.factories.has(token)) {
      const factory = this.factories.get(token)!;
      const instance = factory();
      this.services.set(token, instance);
      return instance as T;
    }

    throw new Error(`Service not registered: ${token.toString()}`);
  }
}

// Create and configure the container
const container = new Container();

// Register core services with lazy initialization
container.registerFactory(DITokens.Logger, () => {
  // Logger is initialized based on the config, but we need it before config is loaded
  // Start with console logger and potentially swap later
  return new ConsoleLogger();
});

container.registerFactory(DITokens.ConfigLoader, () => {
  const logger = container.resolve<Logger>(DITokens.Logger);
  return new ConfigLoader(logger);
});

container.registerFactory(DITokens.FSAdapter, () => {
  const logger = container.resolve<Logger>(DITokens.Logger);
  return new FileSystemAdapter(logger);
});

container.registerFactory(DITokens.HTTPAdapter, () => {
  const logger = container.resolve<Logger>(DITokens.Logger);
  return new HttpAdapter(logger);
});

container.registerFactory(DITokens.FileReader, () => {
  const fsAdapter = container.resolve<FileSystemInterface>(DITokens.FSAdapter);
  const logger = container.resolve<Logger>(DITokens.Logger);
  return new FileReader(fsAdapter, logger);
});

container.registerFactory(DITokens.URLReader, () => {
  const httpAdapter = container.resolve<HttpInterface>(DITokens.HTTPAdapter);
  const logger = container.resolve<Logger>(DITokens.Logger);
  return new URLReader(httpAdapter, logger);
});

container.registerFactory(DITokens.OutputWriter, () => {
  const fsAdapter = container.resolve<FileSystemInterface>(DITokens.FSAdapter);
  const logger = container.resolve<Logger>(DITokens.Logger);
  return new OutputWriter(fsAdapter, logger);
});

container.registerFactory(DITokens.BuiltInRulesSource, () => {
  const fsAdapter = container.resolve<FileSystemInterface>(DITokens.FSAdapter);
  const logger = container.resolve<Logger>(DITokens.Logger);
  return new BuiltInRulesSource(fsAdapter, logger);
});

container.registerFactory(DITokens.ConfigRulesSource, () => {
  const configLoader = container.resolve<ConfigLoader>(DITokens.ConfigLoader);
  const fsAdapter = container.resolve<FileSystemInterface>(DITokens.FSAdapter);
  const logger = container.resolve<Logger>(DITokens.Logger);
  return new ConfigRulesSource(configLoader, fsAdapter, logger);
});

container.registerFactory(DITokens.CLIRulesSource, () => {
  const fsAdapter = container.resolve<FileSystemInterface>(DITokens.FSAdapter);
  const logger = container.resolve<Logger>(DITokens.Logger);
  return new CLIRulesSource(fsAdapter, logger);
});

container.registerFactory(DITokens.JSRuleLoader, () => {
  const logger = container.resolve<Logger>(DITokens.Logger);
  return new JSRuleLoader(logger);
});

container.registerFactory(DITokens.YAMLRuleLoader, () => {
  const logger = container.resolve<Logger>(DITokens.Logger);
  return new YAMLRuleLoader(logger);
});

container.registerFactory(DITokens.RulesManager, () => {
  const builtInSource = container.resolve<RuleSource>(DITokens.BuiltInRulesSource);
  const configSource = container.resolve<RuleSource>(DITokens.ConfigRulesSource);
  const cliSource = container.resolve<RuleSource>(DITokens.CLIRulesSource);
  const jsLoader = container.resolve<JSRuleLoader>(DITokens.JSRuleLoader);
  const yamlLoader = container.resolve<YAMLRuleLoader>(DITokens.YAMLRuleLoader);
  const logger = container.resolve<Logger>(DITokens.Logger);
  
  return new RulesManager(
    builtInSource, 
    configSource, 
    cliSource, 
    jsLoader, 
    yamlLoader, 
    logger
  );
});

container.registerFactory(DITokens.TurndownService, () => {
  return new TurndownAdapter();
});

container.registerFactory(DITokens.Converter, () => {
  const rulesManager = container.resolve<RulesManager>(DITokens.RulesManager);
  const turndownService = container.resolve<TurndownServiceInterface>(DITokens.TurndownService);
  const configLoader = container.resolve<ConfigLoader>(DITokens.ConfigLoader);
  const logger = container.resolve<Logger>(DITokens.Logger);
  
  return new Converter(rulesManager, turndownService, configLoader, logger);
});

container.registerFactory(DITokens.CLI, () => {
  const converter = container.resolve<Converter>(DITokens.Converter);
  const configLoader = container.resolve<ConfigLoader>(DITokens.ConfigLoader);
  const fileReader = container.resolve<FileReader>(DITokens.FileReader);
  const urlReader = container.resolve<URLReader>(DITokens.URLReader);
  const outputWriter = container.resolve<OutputWriter>(DITokens.OutputWriter);
  const logger = container.resolve<Logger>(DITokens.Logger);
  
  return new CLI(
    converter, 
    configLoader, 
    fileReader, 
    urlReader, 
    outputWriter, 
    logger
  );
});

// After initial configuration, initialize and potentially update services
// This is called when we first use the container
async function initializeContainer() {
  // Load configuration
  const configLoader = container.resolve<ConfigLoader>(DITokens.ConfigLoader);
  const config = await configLoader.loadConfig();
  
  // If debug mode is disabled, replace logger with null logger
  if (!config.debug) {
    container.register(DITokens.Logger, new NullLogger());
  }
}

// Initialize the container
initializeContainer().catch(error => {
  console.error('Failed to initialize container:', error);
  process.exit(1);
});

export { container };
