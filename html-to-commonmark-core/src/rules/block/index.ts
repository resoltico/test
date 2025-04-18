/**
 * Exports all block-level tag rules
 */

import { paragraphRule } from './paragraph.js';
import { headingRule } from './heading.js';
import { blockquoteRule } from './blockquote.js';
import { listRules } from './list.js';
import { codeBlockRule } from './code-block.js';
import { thematicBreakRule } from './thematic-break.js';
import { tableRules } from './table.js';
import { divRule } from './div.js';
import { TagRule } from '../base.js';

/**
 * All block-level tag rules
 */
export const blockRules: TagRule[] = [
  paragraphRule,
  headingRule,
  blockquoteRule,
  ...listRules,
  codeBlockRule,
  thematicBreakRule,
  ...tableRules,
  divRule,
];