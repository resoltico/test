import path from 'node:path';
import { Config } from '../../types/core/config.js';
import { Rule } from '../../types/core/rule.js';
import { Logger } from '../../shared/logger/console.js';
import { RuleRegistry } from './registry.js';
import { RuleValidator } from './validator.js';
import { ManifestLoader } from './manifest-loader.js';
import { YAMLRuleLoader, JSRuleLoader } from './loaders/index.js';

/**
 * Rules manager
 */
export class RulesManager {
  private rules: Rule[] = [];

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
   */
  async loadRules(config: Config, cliRulesDir?: string): Promise<Rule[]> {
    this.rules = [];

    // CLI rules have highest precedence
    if (cliRulesDir) {
      this.logger.info('Loading rules from CLI directory manifest');
      try {
        // Load rules from manifest in specified directory
        const manifestRulePaths = await this.manifestLoader.loadManifest(cliRulesDir);

        // Validate paths before loading
        const validatedPaths = await this.validator.validateRulePaths(manifestRulePaths);

        if (validatedPaths.length === 0) {
          this.logger.warn('No valid rules found in CLI directory manifest');
          return [];
        }

        // Load rules from validated paths
        this.rules = await this.loadRuleFiles(validatedPaths);
        return this.rules;
      } catch (error) {
        if (error instanceof Error) {
          this.logger.error(`Failed to load rules from CLI directory: ${error.message}`);
        }
        return [];
      }
    }

    // Load built-in rules based on configuration
    const { useBuiltInRules, builtInRules } = config;

    if (useBuiltInRules || (!builtInRules && !config.customRules)) {
      // Load all built-in rules from registry
      this.logger.info('Loading all built-in rules from registry');
      const rulePaths = this.registry.getAllBuiltInRulePaths();
      const loadedRules = await this.loadRuleFiles(rulePaths);
      this.rules.push(...loadedRules);
    } else if (builtInRules && builtInRules.length > 0) {
      // Load specific built-in rules from registry
      this.logger.info(`Loading ${builtInRules.length} built-in rule sets from registry`);
      const rulePaths = this.registry.getSpecificBuiltInRulePaths(builtInRules);
      const loadedRules = await this.loadRuleFiles(rulePaths);
      this.rules.push(...loadedRules);
    }

    // Load custom rules if specified
    if (config.customRules && config.customRules.length > 0) {
      this.logger.info(`Loading ${config.customRules.length} custom rules`);

      // Resolve paths
      const customRulePaths = config.customRules.map(rule => 
        path.isAbsolute(rule) ? rule : path.resolve(process.cwd(), rule)
      );

      // Validate paths before loading
      const validatedPaths = await this.validator.validateRulePaths(customRulePaths);

      if (validatedPaths.length !== customRulePaths.length) {
        this.logger.warn(`${customRulePaths.length - validatedPaths.length} custom rules were invalid and won't be loaded`);
      }

      const loadedRules = await this.loadRuleFiles(validatedPaths);
      this.rules.push(...loadedRules);
    }

    return this.rules;
  }

  /**
   * Load rules from validated file paths
   */
  private async loadRuleFiles(filePaths: string[]): Promise<Rule[]> {
    const rules: Rule[] = [];

    for (const filePath of filePaths) {
      try {
        const ext = path.extname(filePath).toLowerCase();
        let fileRules: Rule[] = [];

        if (ext === '.yaml' || ext === '.yml') {
          fileRules = await this.yamlLoader.loadRules(filePath);
        } else if (ext === '.js' || ext === '.mjs') {
          fileRules = await this.jsLoader.loadRules(filePath);
        }

        rules.push(...fileRules);
        this.logger.debug(`Loaded ${fileRules.length} rules from ${filePath}`);
      } catch (error) {
        if (error instanceof Error) {
          this.logger.error(`Failed to load rules from ${filePath}: ${error.message}`);
        }
      }
    }

    return rules;
  }

  /**
   * Get all loaded rules
   */
  getRules(): Rule[] {
    return this.rules;
  }
}
