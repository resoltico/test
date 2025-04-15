import { DOMNode } from '../vendor/dom.js';

/**
 * Rule filter that determines if a rule applies to an HTML node
 */
export type RuleFilter = string | string[] | ((node: DOMNode) => boolean);

/**
 * Rule replacement function that converts HTML to Markdown
 */
export type RuleReplacement = (content: string, node: DOMNode) => string;

/**
 * Core rule interface that all rule implementations must follow
 */
export interface Rule {
  name: string;
  filter: RuleFilter;
  replacement: RuleReplacement;
}

/**
 * YAML rule definition format
 */
export interface YAMLRuleDef {
  filter: string;
  replacement: string;
  attributes?: string[];
}

/**
 * Collection of YAML rules
 */
export interface YAMLRuleCollection {
  rules: Record<string, YAMLRuleDef>;
}