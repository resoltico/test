import { Rule } from '../../../types/core/rule.js';
import { JSRuleExport } from '../../../types/modules/rules.js';
import { Logger } from '../../../shared/logger/console.js';
import { RuleError } from '../../../shared/errors/app-error.js';
import { DOMNode } from '../../../types/vendor/dom.js';

/**
 * JavaScript rule loader
 */
export class JSRuleLoader {
  constructor(private logger: Logger) {}

  /**
   * Load rules from JavaScript file
   */
  async loadRules(filePath: string): Promise<Rule[]> {
    try {
      // Import JS module
      // Using dynamic import with file URL
      const fileUrl = new URL(`file://${filePath}`);
      const module = await import(fileUrl.href);

      // Check if it's a default export
      if (module.default) {
        const rule = this.validateRule(module.default, filePath);
        return [rule];
      }

      // Check if it's an array of rules
      if (Array.isArray(module)) {
        return module.map(r => this.validateRule(r, filePath));
      }

      // Check if it exports individual rules
      const rules: Rule[] = [];
      for (const [key, value] of Object.entries(module)) {
        if (
          typeof value === 'object' && 
          value !== null && 
          'filter' in value && 
          'replacement' in value
        ) {
          try {
            const rule = this.validateRule(value as JSRuleExport, filePath, key);
            rules.push(rule);
          } catch (ruleError) {
            this.logger.warn(`Skipping invalid rule "${key}" in ${filePath}: ${ruleError}`);
          }
        }
      }

      if (rules.length === 0) {
        throw new RuleError(`No valid rules found in ${filePath}`);
      }

      this.logger.debug(`Loaded ${rules.length} rules from ${filePath}`);
      return rules;
    } catch (error) {
      if (error instanceof RuleError) {
        throw error;
      }
      throw new RuleError(`Failed to load rules from ${filePath}: ${error}`);
    }
  }

  /**
   * Validate a rule from a JavaScript export
   */
  private validateRule(rule: unknown, filePath: string, defaultName?: string): Rule {
    if (!rule || typeof rule !== 'object') {
      throw new RuleError(`Invalid rule object in ${filePath}`);
    }

    const jsRule = rule as JSRuleExport;

    // Validate required properties
    if (!jsRule.filter) {
      throw new RuleError(`Missing filter in rule from ${filePath}`);
    }

    if (typeof jsRule.replacement !== 'function') {
      throw new RuleError(`Replacement must be a function in rule from ${filePath}`);
    }

    // Use explicit name or default name or generate one
    const name = jsRule.name || defaultName || `js-rule-${Date.now()}`;

    return {
      name,
      filter: jsRule.filter,
      replacement: jsRule.replacement
    };
  }
}