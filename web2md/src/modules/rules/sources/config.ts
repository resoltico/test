/**
 * Configuration-based rules source
 */
import path from 'node:path';
import { ConfigLoader } from '../../config/loader.js';
import { FileSystemInterface } from '../../io/types.js';
import { RuleSource } from '../types.js';
import { Logger } from '../../../types.js';
import { getBuiltInRulesPath } from '../../../shared/utils/path-utils.js';

/**
 * Source for rules specified in the configuration file
 */
export class ConfigRulesSource implements RuleSource {
  constructor(
    private configLoader: ConfigLoader,
    private fsAdapter: FileSystemInterface,
    private logger: Logger
  ) {}
  
  /**
   * Returns paths to rules specified in the configuration
   */
  async getRulePaths(): Promise<string[]> {
    // Get the configuration
    const config = await this.configLoader.loadConfig();
    
    // If no rules are specified in the config, return empty array
    if (!config.rules || config.rules.length === 0) {
      this.logger.debug('No rules specified in configuration');
      return [];
    }
    
    this.logger.debug(`Loading ${config.rules.length} rules from configuration`);
    
    // Process each rule path
    const rulePaths: string[] = [];
    for (const rulePath of config.rules) {
      if (rulePath.startsWith('built-in:')) {
        // Handle built-in rule references
        const ruleName = rulePath.substring(9);
        const builtInRulesDir = getBuiltInRulesPath();
        
        // Check for JS, TS, and YAML versions of the rule
        const possibleExtensions = ['.js', '.ts', '.yaml', '.yml'];
        let found = false;
        
        for (const ext of possibleExtensions) {
          const fullPath = path.join(builtInRulesDir, `${ruleName}${ext}`);
          const exists = await this.fsAdapter.fileExists(fullPath);
          
          if (exists) {
            rulePaths.push(fullPath);
            found = true;
            break;
          }
        }
        
        if (!found) {
          this.logger.warn(`Built-in rule not found: ${ruleName}`);
        }
      } else {
        // Handle relative paths in config
        const fullPath = path.resolve(process.cwd(), rulePath);
        const exists = await this.fsAdapter.fileExists(fullPath);
        
        if (exists) {
          rulePaths.push(fullPath);
        } else {
          this.logger.warn(`Rule file not found: ${fullPath}`);
        }
      }
    }
    
    this.logger.debug(`Found ${rulePaths.length} valid rule files from configuration`);
    return rulePaths;
  }
  
  /**
   * Configuration-based rules source should be used if rules are specified in config
   */
  async shouldUse(): Promise<boolean> {
    const config = await this.configLoader.loadConfig();
    return Boolean(config.rules && config.rules.length > 0);
  }
}
