import { Rule } from '../../../types.js';
import { Logger } from '../../../shared/logger/index.js';

export class JSRuleLoader {
  constructor(private logger: Logger) {}
  
  /**
   * Load rules from a JavaScript file
   */
  async loadRules(filePath: string): Promise<Rule[]> {
    try {
      // Import the JavaScript module
      const module = await import(filePath);
      
      // Check if it's a default export
      if (module.default) {
        if (this.isValidRule(module.default)) {
          this.logger.debug(`Loaded rule from ${filePath}`);
          return [module.default];
        }
      }
      
      // Check if it's an array of rules
      if (Array.isArray(module.default)) {
        const rules = module.default.filter((rule: unknown) => this.isValidRule(rule));
        this.logger.debug(`Loaded ${rules.length} rules from ${filePath}`);
        return rules;
      }
      
      // Check if the module exports multiple rules
      const rules: Rule[] = [];
      for (const [key, value] of Object.entries(module)) {
        if (key !== 'default' && this.isValidRule(value)) {
          rules.push(value);
        }
      }
      
      if (rules.length > 0) {
        this.logger.debug(`Loaded ${rules.length} rules from ${filePath}`);
        return rules;
      }
      
      this.logger.warn(`No valid rules found in ${filePath}`);
      return [];
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to load JavaScript rules from ${filePath}: ${errorMessage}`);
      return [];
    }
  }
  
  /**
   * Check if an object is a valid rule
   */
  private isValidRule(obj: unknown): obj is Rule {
    return (
      obj !== null &&
      typeof obj === 'object' &&
      'name' in obj && typeof obj.name === 'string' &&
      'filter' in obj && (
        typeof obj.filter === 'string' ||
        Array.isArray(obj.filter) ||
        typeof obj.filter === 'function'
      ) &&
      'replacement' in obj && typeof obj.replacement === 'function'
    );
  }
}