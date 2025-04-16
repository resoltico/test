import { Rule, JSRuleExport } from '../../../types/core/rule.js';
import { Logger } from '../../../shared/logger/console.js';

/**
 * Loader for JavaScript rule files
 */
export class JSRuleLoader {
  constructor(private logger: Logger) {}
  
  /**
   * Load rules from a JavaScript file
   * @param path Path to the JavaScript rule file
   * @returns Array of loaded rules
   */
  async loadRules(path: string): Promise<Rule[]> {
    try {
      this.logger.debug(`Loading JS rules from ${path}`);
      
      // Dynamic import for the JS file
      const module = await import(path);
      
      // Get the default export
      const ruleExport = module.default as JSRuleExport;
      
      if (!ruleExport || !ruleExport.name || !ruleExport.filter || !ruleExport.replacement) {
        this.logger.error(`Invalid JS rule format: ${path}`);
        return [];
      }
      
      // Convert the export to a Rule object
      const rule: Rule = {
        name: ruleExport.name,
        filter: ruleExport.filter,
        replacement: ruleExport.replacement
      };
      
      this.logger.debug(`Loaded rule '${rule.name}' from ${path}`);
      return [rule];
    } catch (error) {
      this.logger.error(`Error loading JS rule from ${path}`);
      if (error instanceof Error) {
        this.logger.debug(`Error: ${error.message}`);
      }
      return [];
    }
  }
}
