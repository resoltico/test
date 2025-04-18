/**
 * Exports all rules and creates the default rule map
 */

import { TagRule } from './base.js';
import { blockRules } from './block/index.js';
import { inlineRules } from './inline/index.js';

/**
 * All default rules
 */
export const allRules: TagRule[] = [
  ...blockRules,
  ...inlineRules,
];

/**
 * Creates a rule map from an array of rules
 * @param rules Array of rules
 * @returns Map of tag names to rules
 */
export function createRuleMap(rules: TagRule[]): Map<string, TagRule> {
  const map = new Map<string, TagRule>();
  
  for (const rule of rules) {
    const tagName = rule.tagName.toUpperCase();
    
    // For rules that handle multiple tags (like H1-H6), register variations
    if (tagName === 'H') {
      // Register for H1-H6
      for (let i = 1; i <= 6; i++) {
        map.set(`H${i}`, rule);
      }
    } else if (tagName === 'EM') {
      // Register for all emphasis-like tags
      map.set('EM', rule);
      map.set('I', rule);
      map.set('CITE', rule);
      map.set('DFN', rule);
    } else if (tagName === 'STRONG') {
      // Register for all strong-like tags
      map.set('STRONG', rule);
      map.set('B', rule);
    } else if (tagName === 'DEL') {
      // Register for all strikethrough-like tags
      map.set('DEL', rule);
      map.set('S', rule);
      map.set('STRIKE', rule);
    } else {
      map.set(tagName, rule);
    }
  }
  
  return map;
}

/**
 * Default rule map with all standard rules
 */
export const defaultRuleMap = createRuleMap(allRules);

export { RuleRegistry } from './registry.js';
export { TagRule, RuleContext, createRuleContext } from './base.js';