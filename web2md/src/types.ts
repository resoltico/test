/**
 * Core shared type definitions used across multiple modules
 */

/**
 * Basic logger interface that all loggers must implement
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Base configuration interface that defines the common properties
 */
export interface BaseConfig {
  debug: boolean;
}

/**
 * Represents a rule's filter function that determines if a node should be processed
 */
export type RuleFilter = string | string[] | ((node: Node, options: Record<string, unknown>) => boolean);

/**
 * Represents a rule's replacement function that converts a node to Markdown
 */
export type RuleReplacement = (content: string, node: Node, options: Record<string, unknown>) => string;

/**
 * Basic rule interface that all rules must implement
 */
export interface Rule {
  name: string;
  filter: RuleFilter;
  replacement: RuleReplacement;
}
