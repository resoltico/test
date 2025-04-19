/**
 * AST node creation utilities
 * Provides factory functions for creating AST nodes with proper parent-child relationships
 * 
 * This file re-exports all builder functions from the modularized files
 */

// Export base utility functions
export { createParentNode, BaseNodeOptions, document } from './builder/base.js';

// Export block element builder functions
export {
  heading,
  paragraph,
  blockquote,
  list,
  listItem,
  codeBlock,
  thematicBreak,
  table,
  tableRow,
  tableCell,
  html
} from './builder/block.js';

// Export inline element builder functions
export {
  text,
  emphasis,
  strong,
  link,
  image,
  inlineCode,
  lineBreak,
  strikethrough,
  footnoteDefinition,
  footnoteReference
} from './builder/inline.js';
