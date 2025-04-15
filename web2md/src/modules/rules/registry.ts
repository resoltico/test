import path from 'node:path';
import { BuiltInRulesRegistry } from '../../types/modules/rules.js';

/**
 * Registry for built-in rules
 */
export class RuleRegistry {
  /**
   * Static mapping of rule identifiers to file paths
   */
  private readonly builtInRules: BuiltInRulesRegistry;

  /**
   * Create a rule registry
   * @param rulesDir Directory containing built-in rules
   */
  constructor(private rulesDir: string) {
    this.builtInRules = {
      'common-elements': path.join(this.rulesDir, 'common-elements.yaml'),
      'text-formatting': path.join(this.rulesDir, 'text-formatting.yaml'),
      'text-links': path.join(this.rulesDir, 'text-links.yaml'),
      'media-images': path.join(this.rulesDir, 'media-images.yaml'),
      'tables': path.join(this.rulesDir, 'tables.yaml'),
      'code-blocks': path.join(this.rulesDir, 'code-blocks.yaml'),
      'math': path.join(this.rulesDir, 'math.js')
    };
  }

  /**
   * Get all available rule identifiers
   */
  listAvailableRules(): string[] {
    return Object.keys(this.builtInRules);
  }

  /**
   * Get file path for a specific rule
   */
  getBuiltInRulePath(ruleId: string): string | null {
    return this.builtInRules[ruleId] || null;
  }

  /**
   * Get file paths for all built-in rules
   */
  getAllBuiltInRulePaths(): string[] {
    return Object.values(this.builtInRules);
  }

  /**
   * Get file paths for specific built-in rules
   */
  getSpecificBuiltInRulePaths(ruleIds: string[]): string[] {
    return ruleIds
      .map(id => this.getBuiltInRulePath(id))
      .filter((path): path is string => path !== null);
  }
}
