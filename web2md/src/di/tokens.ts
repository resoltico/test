/**
 * Dependency injection tokens used to identify services in the container
 */
export const DITokens = {
  // Core services
  CLI: Symbol('CLI'),
  ConfigLoader: Symbol('ConfigLoader'),
  RulesManager: Symbol('RulesManager'),
  Converter: Symbol('Converter'),
  
  // Adapters and utilities
  Logger: Symbol('Logger'),
  FSAdapter: Symbol('FSAdapter'),
  HTTPAdapter: Symbol('HTTPAdapter'),
  
  // Loaders and processors
  FileReader: Symbol('FileReader'),
  URLReader: Symbol('URLReader'),
  OutputWriter: Symbol('OutputWriter'),
  
  // Turndown-specific
  TurndownService: Symbol('TurndownService'),
  
  // Rule sources
  BuiltInRulesSource: Symbol('BuiltInRulesSource'),
  ConfigRulesSource: Symbol('ConfigRulesSource'),
  CLIRulesSource: Symbol('CLIRulesSource'),
  
  // Rule loaders
  JSRuleLoader: Symbol('JSRuleLoader'),
  YAMLRuleLoader: Symbol('YAMLRuleLoader')
};
