import fs from 'node:fs/promises';
import yaml from 'js-yaml';
import { Rule, YAMLRuleCollection } from '../../../types/core/rule.js';
import { Logger } from '../../../shared/logger/console.js';
import { RuleError } from '../../../shared/errors/app-error.js';
import { DOMNode, DOMElement } from '../../../types/vendor/dom.js';

/**
 * YAML rule loader
 */
export class YAMLRuleLoader {
  constructor(private logger: Logger) {}

  /**
   * Load rules from YAML file
   */
  async loadRules(filePath: string): Promise<Rule[]> {
    try {
      // Read and parse YAML file
      const content = await fs.readFile(filePath, 'utf8');
      const data = yaml.load(content) as unknown;

      // Validate data structure
      if (!data || typeof data !== 'object' || !('rules' in data) || typeof data.rules !== 'object') {
        throw new RuleError(`Invalid YAML rules structure in ${filePath}`);
      }

      const ruleCollection = data as YAMLRuleCollection;
      const rules: Rule[] = [];

      // Convert YAML rules to Rule objects
      for (const [name, ruleDef] of Object.entries(ruleCollection.rules)) {
        try {
          // Create filter from string or array
          let filter: string | string[];
          if (ruleDef.filter.includes(',')) {
            filter = ruleDef.filter.split(',').map(s => s.trim());
          } else {
            filter = ruleDef.filter;
          }

          // Create replacement function with placeholders
          const replacement = (content: string, node: DOMNode): string => {
            let result = ruleDef.replacement;
            
            // Replace content placeholder
            result = result.replace(/\{content\}/g, content);
            
            // Replace attribute placeholders if defined
            if (ruleDef.attributes && ruleDef.attributes.length > 0) {
              for (const attr of ruleDef.attributes) {
                // Make sure node is an Element before accessing attributes
                if (node.nodeType === node.ELEMENT_NODE) {
                  const element = node as DOMElement;
                  const attrValue = element.getAttribute(attr) || '';
                  result = result.replace(new RegExp(`\\{attr:${attr}\\}`, 'g'), attrValue);
                }
              }
            }
            
            return result;
          };

          // Add rule to list
          rules.push({
            name,
            filter,
            replacement
          });
        } catch (ruleError) {
          this.logger.warn(`Failed to process rule "${name}" in ${filePath}: ${ruleError}`);
        }
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
}