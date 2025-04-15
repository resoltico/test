import { readFile } from 'fs/promises';
import * as yaml from 'js-yaml';
import { Rule, YAMLRuleDef } from '../../../types.js';
import { Logger } from '../../../shared/logger/index.js';

export class YAMLRuleLoader {
  constructor(private logger: Logger) {}
  
  /**
   * Load rules from a YAML file
   */
  async loadRules(filePath: string): Promise<Rule[]> {
    try {
      // Read and parse YAML file
      const content = await readFile(filePath, 'utf8');
      const data = yaml.load(content) as { rules?: Record<string, YAMLRuleDef> };
      
      if (!data || !data.rules) {
        this.logger.warn(`No rules found in ${filePath}`);
        return [];
      }
      
      // Convert YAML rules to Rule objects
      const rules: Rule[] = [];
      
      for (const [name, definition] of Object.entries(data.rules)) {
        if (!definition.filter || !definition.replacement) {
          this.logger.warn(`Invalid rule definition for "${name}" in ${filePath}`);
          continue;
        }
        
        // Convert YAML rule to executable rule
        rules.push(this.convertYAMLRule(name, definition));
      }
      
      this.logger.debug(`Loaded ${rules.length} rules from ${filePath}`);
      return rules;
    } catch (error: any) {
      this.logger.error(`Failed to load YAML rules from ${filePath}: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Convert a YAML rule definition to an executable Rule
   */
  private convertYAMLRule(name: string, definition: YAMLRuleDef): Rule {
    return {
      name,
      filter: definition.filter,
      replacement: (content: string, node: Node) => {
        // Replace content placeholder
        let result = definition.replacement.replace(/\{content\}/g, content);
        
        // Replace attribute placeholders
        if (definition.attributes) {
          for (const attr of definition.attributes) {
            const placeholder = `{attr:${attr}}`;
            const attrValue = (node as Element).getAttribute?.(attr) || '';
            result = result.replace(new RegExp(placeholder, 'g'), attrValue);
          }
        }
        
        // Replace raw placeholder
        if (result.includes('{raw}')) {
          const serializer = new XMLSerializer();
          const rawHtml = serializer.serializeToString(node);
          result = result.replace(/\{raw\}/g, rawHtml);
        }
        
        return result;
      }
    };
  }
}