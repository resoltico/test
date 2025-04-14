/**
 * YAML rule loader
 */
import path from 'node:path';
import fs from 'node:fs/promises';
import yaml from 'js-yaml';
import { RuleLoader } from '../types.js';
import { Rule } from '../../../types.js';
import { Logger } from '../../../types.js';
import { RuleError } from '../../../shared/errors/index.js';
import { YAMLRule, YAMLRulesFile } from '../types.js';

/**
 * Loads rules from YAML files
 */
export class YAMLRuleLoader implements RuleLoader {
  constructor(private logger: Logger) {}
  
  /**
   * Checks if this loader can handle a file based on its extension
   */
  canLoad(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.yaml' || ext === '.yml';
  }
  
  /**
   * Loads rules from a YAML file
   */
  async loadRule(filePath: string): Promise<Rule> {
    try {
      this.logger.debug(`Loading YAML rule from ${filePath}`);
      
      // Read the YAML file
      const content = await fs.readFile(filePath, 'utf8');
      
      // Parse the YAML content
      const data = yaml.load(content) as unknown;
      
      // Validate the YAML structure
      if (!data || typeof data !== 'object') {
        throw new RuleError(`YAML file ${filePath} does not contain a valid object`);
      }
      
      const yamlData = data as Partial<YAMLRulesFile>;
      
      if (!yamlData.rules || typeof yamlData.rules !== 'object') {
        throw new RuleError(`YAML file ${filePath} must have a 'rules' object`);
      }
      
      // Convert the first rule found in the file
      const ruleName = Object.keys(yamlData.rules)[0];
      if (!ruleName) {
        throw new RuleError(`No rules found in YAML file ${filePath}`);
      }
      
      const yamlRule = yamlData.rules[ruleName] as YAMLRule;
      
      // Validate the YAML rule
      this.validateYAMLRule(yamlRule, ruleName, filePath);
      
      // Convert the YAML rule to a Rule object
      return this.convertYAMLRule(ruleName, yamlRule);
    } catch (error) {
      throw new RuleError(`Failed to load rule from ${filePath}: ${(error as Error).message}`, 
        path.basename(filePath, path.extname(filePath)));
    }
  }
  
  /**
   * Validates a YAML rule structure
   */
  private validateYAMLRule(rule: unknown, ruleName: string, filePath: string): asserts rule is YAMLRule {
    if (!rule || typeof rule !== 'object') {
      throw new RuleError(`Rule '${ruleName}' in ${filePath} is not an object`);
    }
    
    const { filter, replacement } = rule as Partial<YAMLRule>;
    
    if (!filter || typeof filter !== 'string') {
      throw new RuleError(`Rule '${ruleName}' in ${filePath} must have a filter property`);
    }
    
    if (!replacement || typeof replacement !== 'string') {
      throw new RuleError(`Rule '${ruleName}' in ${filePath} must have a replacement property`);
    }
  }
  
  /**
   * Converts a YAML rule to a Rule object
   */
  private convertYAMLRule(name: string, yamlRule: YAMLRule): Rule {
    return {
      name,
      filter: yamlRule.filter,
      replacement: (content: string, node: Node) => {
        // Replace content placeholder
        let result = yamlRule.replacement.replace(/\{content\}/g, content);
        
        // Replace attribute placeholders
        if (yamlRule.attributes) {
          for (const attr of yamlRule.attributes) {
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
