import * as path from 'path';
import { readdir, stat } from 'fs/promises';
import { Rule } from '../../../types.js';
import { YAMLRuleLoader } from '../loaders/yaml-loader.js';
import { JSRuleLoader } from '../loaders/js-loader.js';
import { Logger } from '../../../shared/logger/index.js';

export class BuiltInSource {
  constructor(
    private rootDir: string,
    private yamlLoader: YAMLRuleLoader,
    private jsLoader: JSRuleLoader,
    private logger: Logger
  ) {}
  
  /**
   * Load all built-in rules
   */
  async loadAllRules(): Promise<Rule[]> {
    const rulesDir = this.getBuiltInRulesDir();
    const categories = await readdir(rulesDir);
    
    const allRules: Rule[] = [];
    
    for (const category of categories) {
      const categoryPath = path.join(rulesDir, category);
      const categoryStat = await stat(categoryPath);
      
      if (categoryStat.isDirectory()) {
        const categoryRules = await this.loadRulesFromDirectory(categoryPath);
        allRules.push(...categoryRules);
      }
    }
    
    this.logger.debug(`Loaded ${allRules.length} built-in rules`);
    return allRules;
  }
  
  /**
   * Load specific built-in rule sets
   */
  async loadSpecificRules(ruleSets: string[]): Promise<Rule[]> {
    const rulesDir = this.getBuiltInRulesDir();
    const allRules: Rule[] = [];
    
    for (const ruleSet of ruleSets) {
      const ruleSetPath = path.join(rulesDir, ruleSet);
      try {
        const ruleSetStat = await stat(ruleSetPath);
        
        if (ruleSetStat.isDirectory()) {
          // Load all rules in the directory
          const rules = await this.loadRulesFromDirectory(ruleSetPath);
          allRules.push(...rules);
        } else {
          // Load single rule file
          const rules = await this.loadRuleFile(ruleSetPath);
          allRules.push(...rules);
        }
      } catch (error: any) {
        this.logger.warn(`Failed to load built-in rule set: ${ruleSet}: ${error.message}`);
      }
    }
    
    this.logger.debug(`Loaded ${allRules.length} rules from specified rule sets`);
    return allRules;
  }
  
  /**
   * Load rules from a directory
   */
  private async loadRulesFromDirectory(directory: string): Promise<Rule[]> {
    const files = await readdir(directory);
    const rules: Rule[] = [];
    
    for (const file of files) {
      const filePath = path.join(directory, file);
      const fileStat = await stat(filePath);
      
      if (fileStat.isDirectory()) {
        // Recursively load rules from subdirectory
        const subdirRules = await this.loadRulesFromDirectory(filePath);
        rules.push(...subdirRules);
      } else {
        // Load rules from file
        const fileRules = await this.loadRuleFile(filePath);
        rules.push(...fileRules);
      }
    }
    
    return rules;
  }
  
  /**
   * Load rules from a file
   */
  private async loadRuleFile(filePath: string): Promise<Rule[]> {
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.yaml' || ext === '.yml') {
      return this.yamlLoader.loadRules(filePath);
    } else if (ext === '.js' || ext === '.mjs') {
      return this.jsLoader.loadRules(filePath);
    }
    
    this.logger.warn(`Unsupported rule file format: ${filePath}`);
    return [];
  }
  
  /**
   * Get the built-in rules directory path
   */
  private getBuiltInRulesDir(): string {
    return path.join(this.rootDir, 'rules');
  }
}