import * as path from 'path';
import { Rule } from '../../../types.js';
import { YAMLRuleLoader } from '../loaders/yaml-loader.js';
import { JSRuleLoader } from '../loaders/js-loader.js';
import { Logger } from '../../../shared/logger/index.js';

export class CustomSource {
  constructor(
    private yamlLoader: YAMLRuleLoader,
    private jsLoader: JSRuleLoader,
    private logger: Logger
  ) {}
  
  /**
   * Load custom rules from file paths
   */
  async loadRules(rulePaths: string[]): Promise<Rule[]> {
    const allRules: Rule[] = [];
    
    for (const rulePath of rulePaths) {
      try {
        // Resolve path relative to current working directory
        const resolvedPath = path.resolve(process.cwd(), rulePath);
        
        // Determine loader based on file extension
        const ext = path.extname(resolvedPath).toLowerCase();
        let rules: Rule[] = [];
        
        if (ext === '.yaml' || ext === '.yml') {
          rules = await this.yamlLoader.loadRules(resolvedPath);
        } else if (ext === '.js' || ext === '.mjs') {
          rules = await this.jsLoader.loadRules(resolvedPath);
        } else {
          this.logger.warn(`Unsupported custom rule file format: ${resolvedPath}`);
          continue;
        }
        
        allRules.push(...rules);
      } catch (error: any) {
        this.logger.error(`Failed to load custom rule: ${rulePath}: ${error.message}`);
      }
    }
    
    this.logger.debug(`Loaded ${allRules.length} custom rules`);
    return allRules;
  }
}