import * as path from 'path';
import { readdir, stat } from 'fs/promises';
import { Rule } from '../../../types.js';
import { YAMLRuleLoader } from '../loaders/yaml-loader.js';
import { JSRuleLoader } from '../loaders/js-loader.js';
import { Logger } from '../../../shared/logger/index.js';

export class CLISource {
  constructor(
    private yamlLoader: YAMLRuleLoader,
    private jsLoader: JSRuleLoader,
    private logger: Logger
  ) {}
  
  /**
   * Load rules from a directory specified via CLI
   */
  async loadRules(directory: string): Promise<Rule[]> {
    // Resolve path relative to current working directory
    const resolvedDir = path.resolve(process.cwd(), directory);
    
    try {
      const dirStat = await stat(resolvedDir);
      if (!dirStat.isDirectory()) {
        this.logger.error(`Rules directory is not a directory: ${resolvedDir}`);
        return [];
      }
      
      return this.loadRulesFromDirectory(resolvedDir);
    } catch (error: any) {
      this.logger.error(`Failed to load rules from directory: ${resolvedDir}: ${error.message}`);
      return [];
    }
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
        const ext = path.extname(file).toLowerCase();
        let fileRules: Rule[] = [];
        
        if (ext === '.yaml' || ext === '.yml') {
          fileRules = await this.yamlLoader.loadRules(filePath);
        } else if (ext === '.js' || ext === '.mjs') {
          fileRules = await this.jsLoader.loadRules(filePath);
        } else {
          this.logger.warn(`Unsupported rule file format: ${filePath}`);
          continue;
        }
        
        rules.push(...fileRules);
      }
    }
    
    this.logger.debug(`Loaded ${rules.length} rules from directory: ${directory}`);
    return rules;
  }
}