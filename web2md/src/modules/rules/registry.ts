import { join } from 'node:path';

/**
 * Static registry of built-in rules
 * No directory scanning is performed, all rules are explicitly defined here
 */
export const BUILT_IN_RULES_REGISTRY: Record<string, string> = {
  'common-elements': 'common-elements.yaml',
  'text-formatting': 'text-formatting.yaml',
  'text-links': 'text-links.yaml',
  'media-images': 'media-images.yaml',
  'tables': 'tables.yaml',
  'code-blocks': 'code-blocks.yaml',
  'deobfuscation': 'deobfuscation.yaml',
  'math': 'math.js'
};

/**
 * Registry for built-in rules
 */
export class RuleRegistry {
  private rulesDir: string;
  
  /**
   * Create a new rule registry
   * @param rootDir The root directory where rules are located
   */
  constructor(rootDir: string) {
    this.rulesDir = join(rootDir, 'rules');
  }
  
  /**
   * Get the path to a built-in rule
   * @param name The name of the rule
   * @returns The absolute path to the rule file
   * @throws Error if the rule doesn't exist
   */
  getBuiltInRulePath(name: string): string {
    if (!BUILT_IN_RULES_REGISTRY[name]) {
      throw new Error(`Unknown built-in rule: ${name}`);
    }
    return join(this.rulesDir, BUILT_IN_RULES_REGISTRY[name]);
  }
  
  /**
   * Get all built-in rule names
   * @returns Array of built-in rule names
   */
  getAllBuiltInRuleNames(): string[] {
    return Object.keys(BUILT_IN_RULES_REGISTRY);
  }
  
  /**
   * Get the rules directory
   * @returns The absolute path to the rules directory
   */
  getRulesDirectory(): string {
    return this.rulesDir;
  }
}
