import { extname, resolve } from 'node:path';
import { Config } from '../../types/core/config.js';
import { Rule } from '../../types/core/rule.js';
import { RuleRegistry } from './registry.js';
import { RuleValidator } from './validator.js';
import { ManifestLoader } from './manifest-loader.js';
import { YAMLRuleLoader } from './loaders/yaml-loader.js';
import { JSRuleLoader } from './loaders/js-loader.js';
import { Logger } from '../../shared/logger/console.js';

/**
 * Manages rule loading and resolution
 */
export class RulesManager {
  constructor(
    private registry: RuleRegistry,
    private validator: RuleValidator,
    private manifestLoader: ManifestLoader,
    private yamlLoader: YAMLRuleLoader,
    private jsLoader: JSRuleLoader,
    private logger: Logger
  ) {}
  
  /**
   * Load rules based on configuration and CLI options
   * @param config The application configuration
   * @param rulesDir Optional directory to override config
   * @returns Array of loaded rules
   */
  async loadRules(config: Config, rulesDir?: string): Promise<Rule[]> {
    // Check for CLI rules directory override
    if (rulesDir) {
      return this.loadRulesFromDirectory(rulesDir);
    }
    
    // Load rules based on configuration
    return this.loadRulesFromConfig(config);
  }
  
  /**
   * Load rules from a directory using a manifest
   * @param directoryPath Path to the directory
   * @returns Array of loaded rules
   */
  private async loadRulesFromDirectory(directoryPath: string): Promise<Rule[]> {
    this.logger.info(`Loading rules from directory: ${directoryPath}`);
    
    // Load the manifest
    const manifest = await this.manifestLoader.loadManifest(directoryPath);
    
    if (!manifest) {
      this.logger.error(`No valid manifest found in ${directoryPath}`);
      return [];
    }
    
    // Load rules from the manifest
    return this.loadRulesFromPaths(manifest.rules);
  }
  
  /**
   * Load rules based on configuration
   * @param config The application configuration
   * @returns Array of loaded rules
   */
  private async loadRulesFromConfig(config: Config): Promise<Rule[]> {
    const rules: Rule[] = [];
    
    // Determine which built-in rules to load
    if (config.useBuiltInRules !== false) {
      // If useBuiltInRules is true or not specified, and builtInRules is specified,
      // use only the specified built-in rules
      if (config.builtInRules && config.builtInRules.length > 0) {
        this.logger.info('Loading specified built-in rules');
        const builtInRulePaths = config.builtInRules.map(name => 
          this.registry.getBuiltInRulePath(name));
        
        const builtInRules = await this.loadRulesFromPaths(builtInRulePaths);
        rules.push(...builtInRules);
      } 
      // If useBuiltInRules is true or not specified, and builtInRules is not specified,
      // use all built-in rules
      else {
        this.logger.info('Loading all built-in rules');
        const allBuiltInRuleNames = this.registry.getAllBuiltInRuleNames();
        const builtInRulePaths = allBuiltInRuleNames.map(name => 
          this.registry.getBuiltInRulePath(name));
        
        const builtInRules = await this.loadRulesFromPaths(builtInRulePaths);
        rules.push(...builtInRules);
      }
    }
    
    // Load custom rules if specified
    if (config.customRules && config.customRules.length > 0) {
      this.logger.info('Loading custom rules');
      
      // Resolve relative paths
      const customRulePaths = config.customRules.map(path => {
        // Handle relative paths
        if (!path.startsWith('/')) {
          return resolve(process.cwd(), path);
        }
        return path;
      });
      
      const customRules = await this.loadRulesFromPaths(customRulePaths);
      rules.push(...customRules);
    }
    
    return rules;
  }
  
  /**
   * Load rules from a list of file paths
   * @param paths Array of file paths
   * @returns Array of loaded rules
   */
  private async loadRulesFromPaths(paths: string[]): Promise<Rule[]> {
    const rules: Rule[] = [];
    
    for (const path of paths) {
      // Validate the file before loading
      const isValid = await this.validator.validateRuleFile(path);
      
      if (!isValid) {
        this.logger.warn(`Skipping invalid rule file: ${path}`);
        continue;
      }
      
      // Load based on file extension
      const extension = extname(path).toLowerCase();
      
      if (extension === '.yaml' || extension === '.yml') {
        const yamlRules = await this.yamlLoader.loadRules(path);
        rules.push(...yamlRules);
      } else if (extension === '.js' || extension === '.mjs') {
        const jsRules = await this.jsLoader.loadRules(path);
        rules.push(...jsRules);
      } else {
        this.logger.warn(`Unsupported rule file type: ${extension}`);
      }
    }
    
    this.logger.debug(`Loaded ${rules.length} rules in total`);
    return rules;
  }
}
