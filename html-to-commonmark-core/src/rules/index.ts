/**
 * Exports all rules and creates the default rule map
 */

import { TagRule } from './base.js';
import { blockRules } from './block/index.js';
import { inlineRules } from './inline/index.js';
import { RuleRegistry } from './registry.js';
import { defaultRule } from './default-rule.js';

/**
 * All default rules
 */
export const allRules: TagRule[] = [
  ...blockRules,
  ...inlineRules,
  defaultRule, // Add default rule
];

/**
 * Creates a rule map from an array of rules
 * @param rules Array of rules
 * @returns Map of tag names to rules
 */
export function createRuleMap(rules: TagRule[]): Map<string, TagRule> {
  const registry = new RuleRegistry(rules);
  
  // Debugging: Check the registry contents
  console.log(`Created rule map with ${registry.getRuleCount()} rules`);
  if (registry.getRuleCount() > 0) {
    console.log(registry.dumpRules());
  }
  
  return registry.getAllRules();
}

/**
 * Default rule map with all standard rules
 */
export const defaultRuleMap = createRuleMap(allRules);

export { RuleRegistry } from './registry.js';
export { TagRule, RuleContext, createRuleContext } from './base.js';