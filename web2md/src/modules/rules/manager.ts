/**
 * Rules manager implementation
 */
import path from 'node:path';
import { Rule } from '../../types.js';
import { Logger } from '../../types.js';
import { RuleSource, RuleLoader } from './types.js';
import { RuleError } from '../../shared/errors/index.js';

/**
 * Manages the loading and application of rules
 */
export class RulesManager {
  private rules: Map<string, Rule> = new Map();
  
  constructor(
    private builtInSource: RuleSource,
    private configSource: RuleSource,
    private cliSource: RuleSource,
    private jsLoader: RuleLoader,
    private yamlLoader: RuleLoader,
    private logger: Logger
  ) {}
  
  /**
   * Loads rules from the appropriate sources based on precedence
   */
  async loadRules(): Promise<void> {
    // Clear any existing rules
    this.rules.clear();
    
    // Check sources in order of precedence
    
    // 1. CLI rules (highest precedence)
    if (await this.cliSource.shouldUse()) {
      this.logger.info('Loading rules from CLI-specified directory');
      const rulePaths = await this.cliSource.getRulePaths();
      await this.loadRulesFromPaths(rulePaths);
      return;
    }
    
    // 2. Configuration rules
    if (await this.configSource.shouldUse()) {
      this.logger.info('Loading rules from configuration');
      const rulePaths = await this.configSource.getRulePaths();
      await this.loadRulesFromPaths(rulePaths);
      return;
    }
    
    // 3. Built-in rules (lowest precedence)
    this.logger.info('Loading built-in rules');
    const rulePaths = await this.builtInSource.getRulePaths();
    await this.loadRulesFromPaths(rulePaths);
  }
  
  /**
   * Returns all loaded rules
   */
  getRules(): Rule[] {
    return Array.from(this.rules.values());
  }
  
  /**
   * Loads rules from a list of file paths
   */
  private async loadRulesFromPaths(paths: string[]): Promise<void> {
    for (const filePath of paths) {
      try {
        await this.loadRuleFile(filePath);
      } catch (error) {
        this.logger.warn(`Failed to load rule from ${filePath}: ${(error as Error).message}`);
      }
    }
    
    this.logger.info(`Loaded ${this.rules.size} rules successfully`);
  }
  
  /**
   * Loads a rule from a file
   */
  private async loadRuleFile(filePath: string): Promise<void> {
    try {
      // Determine the appropriate loader
      let loader: RuleLoader;
      
      if (this.jsLoader.canLoad(filePath)) {
        loader = this.jsLoader;
      } else if (this.yamlLoader.canLoad(filePath)) {
        loader = this.yamlLoader;
      } else {
        throw new RuleError(`Unsupported rule file format: ${filePath}`);
      }
      
      // Load the rule
      const rule = await loader.loadRule(filePath);
      
      // Add the rule to our collection
      this.rules.set(rule.name, rule);
      
      this.logger.debug(`Loaded rule '${rule.name}' from ${path.basename(filePath)}`);
    } catch (error) {
      throw new RuleError(`Failed to load rule from ${filePath}: ${(error as Error).message}`);
    }
  }
}
