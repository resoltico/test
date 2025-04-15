import { Rule } from '../core/rule.js';
import { DOMNode } from '../vendor/dom.js';

/**
 * Interface for JavaScript rule module exports
 */
export interface JSRuleExport {
  /**
   * Rule name
   */
  name: string;
  
  /**
   * Rule filter function or selector
   */
  filter: string | string[] | ((node: DOMNode) => boolean);
  
  /**
   * Rule replacement function
   */
  replacement: (content: string, node: DOMNode) => string;
}

/**
 * Interface for rule manifest file
 */
export interface RuleManifest {
  /**
   * List of rule file paths relative to manifest directory
   */
  rules: string[];
}

/**
 * Registry entry type for built-in rules
 */
export type BuiltInRulesRegistry = Record<string, string>;

/**
 * Rule loading result
 */
export interface RuleLoadResult {
  /**
   * Successfully loaded rules
   */
  rules: Rule[];
  
  /**
   * Path the rules were loaded from
   */
  path: string;
  
  /**
   * Number of rules loaded
   */
  count: number;
}