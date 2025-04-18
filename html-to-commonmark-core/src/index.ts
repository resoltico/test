/**
 * html-to-commonmark-core
 * Converts HTML to CommonMark-compatible Abstract Syntax Trees and Markdown
 * 
 * This is the main entry point for the library.
 */

// Export the core engine
import { HtmlToCommonMarkEngine, EngineOptions, ConversionResult } from './engine/core.js';
export { HtmlToCommonMarkEngine, EngineOptions, ConversionResult };

// Export AST types and utilities
import * as ast from './ast/types.js';
import * as builder from './ast/builder.js';
import { normalizeAst } from './ast/normalizer.js';
export { ast, builder, normalizeAst };

// Export parser
import { parseHtml, ParserOptions } from './engine/parser.js';
export { parseHtml, ParserOptions };

// Export walker
import { Walker } from './engine/walker.js';
export { Walker };

// Export render utilities
import { renderMarkdown } from './render/markdown.js';
import { RenderOptions, DEFAULT_OPTIONS } from './render/options.js';
export { renderMarkdown, RenderOptions, DEFAULT_OPTIONS };

// Export rule system
import { TagRule, RuleContext, createRuleContext } from './rules/base.js';
import { RuleRegistry } from './rules/registry.js';
import { allRules, createRuleMap, defaultRuleMap } from './rules/index.js';
export { TagRule, RuleContext, createRuleContext, RuleRegistry, allRules, createRuleMap, defaultRuleMap };

// Export utilities
import * as errors from './utils/errors.js';
import * as escape from './utils/escape.js';
import { EventEmitter } from './utils/events.js';
import * as debug from './utils/debug.js';
export { errors, escape, EventEmitter, debug };

// Create a default engine instance
const defaultEngine = new HtmlToCommonMarkEngine();

/**
 * Converts HTML to an AST
 * @param html HTML string
 * @param options Engine options
 * @returns Promise resolving to an AST
 */
export async function convertHtmlToAst(html: string, options?: EngineOptions): Promise<ast.ASTNode[]> {
  if (options) {
    // Create a custom engine with the provided options
    const engine = new HtmlToCommonMarkEngine(options);
    return engine.htmlToAst(html);
  }
  
  // Use the default engine
  return defaultEngine.htmlToAst(html);
}

/**
 * Renders an AST as markdown
 * @param ast AST to render
 * @param options Render options
 * @returns Markdown string
 */
export function renderAstToMarkdown(ast: ast.ASTNode[], options?: RenderOptions): string {
  // Ensure we use default options if none are provided
  const renderOptions = { ...DEFAULT_OPTIONS, ...options };
  return renderMarkdown(ast, renderOptions);
}

/**
 * Converts HTML to markdown
 * @param html HTML string
 * @param options Engine options
 * @returns Promise resolving to a conversion result
 */
export async function convertHtmlToMarkdown(html: string, options?: EngineOptions): Promise<ConversionResult> {
  if (options) {
    // Create a custom engine with the provided options
    const engine = new HtmlToCommonMarkEngine(options);
    return engine.convert(html);
  }
  
  // Use the default engine
  return defaultEngine.convert(html);
}

/**
 * Simplified conversion function
 * @param html HTML string
 * @param options Engine options
 * @returns Promise resolving to markdown string
 */
export default async function convert(html: string, options?: EngineOptions): Promise<string> {
  const result = await convertHtmlToMarkdown(html, options);
  return result.markdown;
}