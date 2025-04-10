/**
 * Core transformation pipeline
 * 
 * Defines the main HTML to Markdown conversion pipeline using the unified/remark ecosystem.
 * This is the central processing logic of the application.
 */

import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeRemark from 'rehype-remark';
import remarkStringify from 'remark-stringify';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { Schema } from '../schema/validation.js';
import { applySchema } from '../schema/processor.js';
import { preserveLinks, restoreLinks } from '../plugins/rehype/link-processor.js';
import { handleMath } from '../plugins/rehype/math-processor.js';
import { handleHtml5Elements } from '../plugins/rehype/html5-processor.js';
import { preserveHtmlAttributes, restoreHtmlAttributes } from '../plugins/rehype/html-attribute-processor.js';
import { cleanupMarkdown } from '../plugins/remark/cleanup.js';

/**
 * Convert HTML to Markdown
 * 
 * @param html - The HTML content to convert
 * @param schema - Optional schema for customizing the conversion
 * @returns The converted Markdown content
 */
export async function convert(html: string, schema?: Schema): Promise<string> {
  // Create a unified processor pipeline
  const processor = unified()
    // Parse HTML into AST
    .use(rehypeParse, { 
      fragment: true,
      // Parse as HTML5
      space: 'html',
      // Be more forgiving with HTML errors
      verbose: false
    })
    
    // Apply HTML AST transformations
    .use(preserveLinks)      // Preserve original links
    .use(preserveHtmlAttributes) // Preserve important HTML attributes
    .use(handleHtml5Elements) // Handle HTML5 elements
    .use(handleMath)         // Handle math content
    
    // Apply schema transformations to HTML AST if schema is provided
    .use(schema ? () => (tree) => {
      applySchema(unified(), schema, 'html').runSync(tree);
      return tree;
    } : () => (tree) => tree)
    
    // Convert HTML AST to Markdown AST
    .use(rehypeRemark, {
      // Preserve as much information as possible
      handlers: {
        // Custom handlers can be added here if needed
      }
    })
    
    // Apply Markdown AST transformations
    .use(remarkGfm)           // GitHub Flavored Markdown support
    .use(remarkMath)          // Math support
    .use(restoreLinks)        // Restore original links
    .use(restoreHtmlAttributes) // Restore preserved HTML attributes
    .use(cleanupMarkdown)     // Clean up Markdown formatting
    
    // Apply schema transformations to Markdown AST if schema is provided
    .use(schema ? () => (tree) => {
      applySchema(unified(), schema, 'markdown').runSync(tree);
      return tree;
    } : () => (tree) => tree)
    
    // Stringify Markdown AST to Markdown text with options
    .use(remarkStringify, ({
      // Merge in global settings from schema if provided
      ...(schema?.global || {}),
      // Default settings
      bullet: '-',
      emphasis: '*',
      strong: '*',  // Single character that will be doubled
      fence: '`',   // Single character that will be tripled for code fences
      fences: true,
      incrementListMarker: true,
      listItemIndent: 'one',
      setext: false,
      // Preserve original content as much as possible
      resourceLink: true,
      rule: '-',
      ruleSpaces: false,
      // Table settings
      tableCellPadding: true,
      tablePipeAlign: false,
      // Math settings
      math: true
    } as any));
  
  // Process the HTML and return the resulting Markdown
  const file = await processor.process(html);
  return String(file);
}