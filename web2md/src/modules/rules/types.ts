import { Rule } from '../../types.js';

export interface RuleSource {
  loadRules(source: string | string[]): Promise<Rule[]>;
}

export interface RuleLoader {
  loadRules(filePath: string): Promise<Rule[]>;
}