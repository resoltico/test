/**
 * Rule filter that determines if a rule applies to an HTML node
 */
export type RuleFilter = string | string[] | ((node: Node) => boolean);

/**
 * Rule replacement function that converts HTML to Markdown
 */
export type RuleReplacement = (content: string, node: Node) => string;

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
 * JavaScript rule export format
 */
export interface JSRuleExport {
  name: string;
  filter: RuleFilter;
  replacement: RuleReplacement;
}

/**
 * Collection of rules
 */
export interface RuleSet {
  rules: Rule[];
}

/**
 * Rule manifest for explicitly listing rules
 */
export interface RuleManifest {
  rules: string[];
}
