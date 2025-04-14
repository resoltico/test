/**
 * Built-in rules source
 */
import path from 'node:path';
import { FileSystemInterface } from '../../io/types.js';
import { RuleSource } from '../types.js';
import { Logger } from '../../../types.js';
import { getBuiltInRulesPath } from '../../../shared/utils/path-utils.js';

/**
 * Source for built-in rules that come with the application
 */
export class BuiltInRulesSource implements RuleSource {
  constructor(
    private fsAdapter: FileSystemInterface,
    private logger: Logger
  ) {}
  
  /**
   * Returns paths to all built-in rules
   */
  async getRulePaths(): Promise<string[]> {
    const builtInRulesDir = getBuiltInRulesPath();
    this.logger.debug(`Loading built-in rules from ${builtInRulesDir}`);
    
    // Get all files in the built-in rules directory
    try {
      const exists = await this.fsAdapter.fileExists(builtInRulesDir);
      if (!exists) {
        this.logger.warn(`Built-in rules directory not found: ${builtInRulesDir}`);
        return [];
      }
      
      const files = await this.fsAdapter.readDirectory(builtInRulesDir);
      
      // Filter for JS, TS, and YAML files
      const ruleFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ext === '.js' || ext === '.ts' || ext === '.yaml' || ext === '.yml';
      });
      
      this.logger.debug(`Found ${ruleFiles.length} built-in rule files`);
      return ruleFiles;
    } catch (error) {
      this.logger.warn(`Error loading built-in rules: ${(error as Error).message}`);
      return [];
    }
  }
  
  /**
   * Built-in rules source should be used only if no other source is available
   */
  async shouldUse(): Promise<boolean> {
    // Always available but lowest priority
    return true;
  }
}
