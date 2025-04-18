/**
 * Exports all inline tag rules
 */

import { emphasisRule } from './emphasis.js';
import { strongRule } from './strong.js';
import { codeRule } from './code.js';
import { linkRule } from './link.js';
import { imageRule } from './image.js';
import { breakRule } from './break.js';
import { strikethroughRule } from './strikethrough.js';
import { spanRule } from './span.js';
import { TagRule } from '../base.js';

/**
 * All inline tag rules
 */
export const inlineRules: TagRule[] = [
  emphasisRule,
  strongRule,
  codeRule,
  linkRule,
  imageRule,
  breakRule,
  strikethroughRule,
  spanRule,
];