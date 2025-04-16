import { promises as fs } from 'node:fs';
import { load } from 'js-yaml';
import { Rule, YAMLRuleDef } from '../../../types/core/rule.js';
import { Logger } from '../../../shared/logger/console.js';

/**
 * Loader for YAML rule files
 */
export class YAMLRuleLoader {
  constructor(private logger: Logger) {}
  
  /**
   * Load rules from a YAML file
   * @param path Path to the YAML rule file
   * @returns Array of loaded rules
   */
  async loadRules(path: string): Promise<Rule[]> {
    try {
      this.logger.debug(`Loading YAML rules from ${path}`);
      
      // Read and parse the YAML file
      const content = await fs.readFile(path, 'utf-8');
      const parsed = load(content) as { rules: Record<string, YAMLRuleDef> };
      
      if (!parsed || !parsed.rules) {
        this.logger.error(`Invalid YAML rule file format: ${path}`);
        return [];
      }
      
      // Convert YAML rules to Rule objects
      const rules: Rule[] = [];
      
      for (const [name, def] of Object.entries(parsed.rules)) {
        rules.push(this.convertYamlRule(name, def));
      }
      
      this.logger.debug(`Loaded ${rules.length} rules from ${path}`);
      return rules;
    } catch (error) {
      this.logger.error(`Error loading YAML rules from ${path}`);
      if (error instanceof Error) {
        this.logger.debug(`Error: ${error.message}`);
      }
      return [];
    }
  }
  
  /**
   * Convert a YAML rule definition to a Rule object
   * @param name The name of the rule
   * @param def The YAML rule definition
   * @returns A Rule object
   */
  private convertYamlRule(name: string, def: YAMLRuleDef): Rule {
    // Process the filter
    const filter = def.filter;
    
    // Process the replacement template
    const replacementTemplate = def.replacement;
    
    // Create a replacement function that handles the template
    const replacement = (content: string, node: Node): string => {
      let result = replacementTemplate.replace('{content}', content);
      
      // Replace attribute placeholders
      if (def.attributes) {
        for (const attr of def.attributes) {
          const element = node as Element;
          const value = element.getAttribute?.(attr) || '';
          result = result.replace(`{attr:${attr}}`, value);
        }
      }
      
      // Replace {raw} placeholder with the node's outerHTML
      if (result.includes('{raw}')) {
        const element = node as Element;
        const raw = element.outerHTML || '';
        result = result.replace('{raw}', raw);
      }
      
      return result;
    };
    
    return {
      name,
      filter,
      replacement
    };
  }
}
