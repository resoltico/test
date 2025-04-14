/**
 * Rules module type definitions
 */
import { Rule, RuleFilter, RuleReplacement } from '../../types.js';

/**
 * Represents a rule source that provides rule paths
 */
export interface RuleSource {
  /**
   * Returns an array of rule file paths from this source
   */
  getRulePaths(): Promise<string[]>;
  
  /**
   * Checks if this rule source should be used
   */
  shouldUse(): Promise<boolean>;
}

/**
 * Interface for rule loaders
 */
export interface RuleLoader {
  /**
   * Checks if this loader can handle a given file
   */
  canLoad(filePath: string): boolean;
  
  /**
   * Loads a rule from a file
   */
  loadRule(filePath: string): Promise<Rule>;
}

/**
 * YAML rule format structure
 */
export interface YAMLRule {
  filter: string;
  replacement: string;
  attributes?: string[];
}

/**
 * YAML rules file format
 */
export interface YAMLRulesFile {
  rules: Record<string, YAMLRule>;
}
