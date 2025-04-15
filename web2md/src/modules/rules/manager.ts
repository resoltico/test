import { Rule, Config } from '../../types.js';
import { BuiltInSource } from './sources/built-in.js';
import { CustomSource } from './sources/custom.js';
import { CLISource } from './sources/cli.js';
import { Logger } from '../../shared/logger/index.js';

export class RulesManager {
  private rules: Rule[] = [];
  
  constructor(
    private builtInSource: BuiltInSource,
    private customSource: CustomSource,
    private cliSource: CLISource,
    private logger: Logger
  ) {}
  
  /**
   * Load rules based on configuration and CLI options
   */
  async loadRules(config: Config, cliRulesDir?: string): Promise<Rule[]> {
    this.rules = [];
    
    // CLI rules have highest precedence
    if (cliRulesDir) {
      this.logger.info('Loading rules from CLI directory');
      this.rules = await this.cliSource.loadRules(cliRulesDir);
      return this.rules;
    }
    
    // Load built-in rules based on configuration
    const { useBuiltInRules, builtInRules } = config;
    
    if (useBuiltInRules || (!builtInRules && !config.customRules)) {
      // Load all built-in rules
      this.logger.info('Loading all built-in rules');
      const builtInRules = await this.builtInSource.loadAllRules();
      this.rules.push(...builtInRules);
    } else if (builtInRules && builtInRules.length > 0) {
      // Load specific built-in rules
      this.logger.info(`Loading ${builtInRules.length} built-in rule sets`);
      const specificRules = await this.builtInSource.loadSpecificRules(builtInRules);
      this.rules.push(...specificRules);
    }
    
    // Load custom rules if specified
    if (config.customRules && config.customRules.length > 0) {
      this.logger.info(`Loading ${config.customRules.length} custom rules`);
      const customRules = await this.customSource.loadRules(config.customRules);
      this.rules.push(...customRules);
    }
    
    return this.rules;
  }
  
  /**
   * Get all loaded rules
   */
  getRules(): Rule[] {
    return this.rules;
  }
}