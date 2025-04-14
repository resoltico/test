/**
 * Converter module type definitions
 */
import { Rule } from '../../types.js';

/**
 * Interface for the Turndown service adapter
 */
export interface TurndownServiceInterface {
  /**
   * Configures the Turndown service with options
   */
  configure(options: Record<string, unknown>): void;
  
  /**
   * Adds a rule to the Turndown service
   */
  addRule(rule: Rule): void;
  
  /**
   * Converts HTML content to Markdown
   */
  turndown(content: string): string;
}
