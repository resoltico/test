/**
 * JavaScript/TypeScript rule loader
 */
import path from 'node:path';
import { RuleLoader } from '../types.js';
import { Rule } from '../../../types.js';
import { Logger } from '../../../types.js';
import { RuleError } from '../../../shared/errors/index.js';

/**
 * Loads rules from JavaScript or TypeScript files
 */
export class JSRuleLoader implements RuleLoader {
  constructor(private logger: Logger) {}
  
  /**
   * Checks if this loader can handle a file based on its extension
   */
  canLoad(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.js' || ext === '.ts';
  }
  
  /**
   * Loads a rule from a JavaScript or TypeScript file
   */
  async loadRule(filePath: string): Promise<Rule> {
    try {
      this.logger.debug(`Loading JS/TS rule from ${filePath}`);
      
      // Import the rule dynamically
      // Note: In ESM, we need to use dynamic import
      const importedModule = await import(filePath);
      
      // Handle both ESM default exports and CommonJS exports
      const rule = importedModule.default || importedModule;
      
      // Validate the rule
      this.validateRule(rule, filePath);
      
      return rule;
    } catch (error) {
      throw new RuleError(`Failed to load rule from ${filePath}: ${(error as Error).message}`, 
        path.basename(filePath, path.extname(filePath)));
    }
  }
  
  /**
   * Validates that a rule has the required properties
   */
  private validateRule(rule: unknown, filePath: string): asserts rule is Rule {
    if (!rule || typeof rule !== 'object') {
      throw new RuleError(`Rule in ${filePath} is not an object`);
    }
    
    const { name, filter, replacement } = rule as Partial<Rule>;
    
    if (!name || typeof name !== 'string') {
      throw new RuleError(`Rule in ${filePath} must have a name property`);
    }
    
    if (!filter || (typeof filter !== 'string' && !Array.isArray(filter) && typeof filter !== 'function')) {
      throw new RuleError(`Rule in ${filePath} must have a valid filter property`);
    }
    
    if (!replacement || typeof replacement !== 'function') {
      throw new RuleError(`Rule in ${filePath} must have a replacement function`);
    }
  }
}
