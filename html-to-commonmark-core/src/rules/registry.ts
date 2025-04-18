/**
 * Registry for HTML tag conversion rules
 */

import { TagRule } from './base.js';
import { ConversionError } from '../utils/errors.js';

/**
 * Rule registry for managing conversion rules
 */
export class RuleRegistry {
  /**
   * Map of tag names to rule implementations
   */
  private rules = new Map<string, TagRule>();
  
  /**
   * Default rule to use when no rule is found
   */
  private defaultRule?: TagRule;

  /**
   * Creates a new rule registry
   * @param initialRules Optional initial rules to register
   */
  constructor(initialRules: TagRule[] = []) {
    for (const rule of initialRules) {
      this.register(rule);
    }
  }

  /**
   * Registers a rule
   * @param rule The rule to register
   * @returns This registry for chaining
   */
  public register(rule: TagRule): RuleRegistry {
    if (!rule.tagName) {
      throw new ConversionError('Rule must have a tagName');
    }

    // Store uppercase tag name for case-insensitive lookup
    const tagName = rule.tagName.toUpperCase();
    this.rules.set(tagName, rule);
    
    return this;
  }

  /**
   * Registers multiple rules
   * @param rules The rules to register
   * @returns This registry for chaining
   */
  public registerAll(rules: TagRule[]): RuleRegistry {
    for (const rule of rules) {
      this.register(rule);
    }
    
    return this;
  }

  /**
   * Sets the default rule to use when no rule is found
   * @param rule The default rule
   * @returns This registry for chaining
   */
  public setDefaultRule(rule: TagRule): RuleRegistry {
    this.defaultRule = rule;
    return this;
  }

  /**
   * Gets a rule for a tag
   * @param tagName The tag name to get a rule for
   * @returns The rule, or undefined if not found
   */
  public getRule(tagName: string): TagRule | undefined {
    return this.rules.get(tagName.toUpperCase());
  }

  /**
   * Gets the default rule
   * @returns The default rule, or undefined if none
   */
  public getDefaultRule(): TagRule | undefined {
    return this.defaultRule;
  }

  /**
   * Gets all registered rules
   * @returns A map of tag names to rules
   */
  public getAllRules(): Map<string, TagRule> {
    return new Map(this.rules);
  }

  /**
   * Removes a rule
   * @param tagName The tag name to remove the rule for
   * @returns This registry for chaining
   */
  public removeRule(tagName: string): RuleRegistry {
    this.rules.delete(tagName.toUpperCase());
    return this;
  }

  /**
   * Clears all rules
   * @returns This registry for chaining
   */
  public clearRules(): RuleRegistry {
    this.rules.clear();
    return this;
  }

  /**
   * Checks if a rule exists for a tag
   * @param tagName The tag name to check
   * @returns True if a rule exists, false otherwise
   */
  public hasRule(tagName: string): boolean {
    return this.rules.has(tagName.toUpperCase());
  }

  /**
   * Gets the number of registered rules
   * @returns The number of rules
   */
  public getRuleCount(): number {
    return this.rules.size;
  }
}