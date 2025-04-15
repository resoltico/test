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
 * Configuration options
 */
export interface Config {
  headingStyle: 'atx' | 'setext';
  listMarker: '-' | '*' | '+';
  codeBlockStyle: 'fenced' | 'indented';
  preserveTableAlignment: boolean;
  ignoreTags: string[];
  useBuiltInRules?: boolean;
  builtInRules?: string[];
  customRules?: string[];
  debug: boolean;
}

/**
 * Application options
 */
export interface AppOptions {
  rootDir: string;
}

/**
 * CLI options
 */
export interface CLIOptions {
  file?: string;
  url?: string;
  output?: string;
  rulesDir?: string;
  debug?: boolean;
}