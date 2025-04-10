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
import { preserveLinks } from '../plugins/rehype/link-processor.js';
import { handleMath } from '../plugins/rehype/math-processor.js';
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
    .use(rehypeParse, { fragment: true })
    
    // Apply HTML AST transformations
    .use(preserveLinks)
    .use(handleMath)
    
    // Apply schema transformations to HTML AST if schema is provided
    .use(schema ? () => (tree) => {
      applySchema(unified(), schema, 'html').runSync(tree);
      return tree;
    } : () => (tree) => tree)
    
    // Convert HTML AST to Markdown AST
    .use(rehypeRemark)
    
    // Apply Markdown AST transformations
    .use(remarkGfm)
    .use(remarkMath)
    .use(cleanupMarkdown)
    
    // Apply schema transformations to Markdown AST if schema is provided
    .use(schema ? () => (tree) => {
      applySchema(unified(), schema, 'markdown').runSync(tree);
      return tree;
    } : () => (tree) => tree)
    
    // Stringify Markdown AST to Markdown text with options
    .use(remarkStringify, ({
      ...(schema?.global || {}),
      bullet: '-',
      emphasis: '*',
      strong: '*',  // Single character that will be doubled
      fence: '`',   // Single character that will be tripled for code fences
      fences: true,
      incrementListMarker: true,
      listItemIndent: 'one',
      setext: false
    } as any));
  
  // Process the HTML and return the resulting Markdown
  const file = await processor.process(html);
  return String(file);
}