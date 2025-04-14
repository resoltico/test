/**
 * CLI-based rules source
 */
import path from 'node:path';
import { FileSystemInterface } from '../../io/types.js';
import { RuleSource } from '../types.js';
import { Logger } from '../../../types.js';

/**
 * Source for rules specified via the CLI --rules-dir option
 */
export class CLIRulesSource implements RuleSource {
  constructor(
    private fsAdapter: FileSystemInterface,
    private logger: Logger
  ) {}
  
  /**
   * Returns paths to rules in the CLI-specified directory
   */
  async getRulePaths(): Promise<string[]> {
    const rulesDir = this.getRulesDirectory();
    if (!rulesDir) {
      return [];
    }
    
    this.logger.debug(`Loading rules from CLI-specified directory: ${rulesDir}`);
    
    try {
      const exists = await this.fsAdapter.fileExists(rulesDir);
      if (!exists) {
        this.logger.warn(`CLI rules directory not found: ${rulesDir}`);
        return [];
      }
      
      const files = await this.fsAdapter.readDirectory(rulesDir);
      
      // Filter for JS, TS, and YAML files
      const ruleFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ext === '.js' || ext === '.ts' || ext === '.yaml' || ext === '.yml';
      });
      
      this.logger.debug(`Found ${ruleFiles.length} rule files in CLI-specified directory`);
      return ruleFiles;
    } catch (error) {
      this.logger.warn(`Error loading rules from CLI directory: ${(error as Error).message}`);
      return [];
    }
  }
  
  /**
   * CLI rules source should be used if --rules-dir is specified
   */
  async shouldUse(): Promise<boolean> {
    return Boolean(this.getRulesDirectory());
  }
  
  /**
   * Gets the rules directory from the CLI arguments
   */
  private getRulesDirectory(): string | null {
    const args = process.argv;
    const rulesDirIndex = args.indexOf('--rules-dir');
    
    if (rulesDirIndex !== -1 && args.length > rulesDirIndex + 1) {
      return path.resolve(process.cwd(), args[rulesDirIndex + 1]);
    }
    
    return null;
  }
}
