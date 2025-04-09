/**
 * Core transformation pipeline
 * 
 * Defines the main HTML to Markdown conversion pipeline using the unified/remark ecosystem.
 * This is the central processing logic of the application.
 */

import { unified, Processor } from 'unified';
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
  // Create the base pipeline
  let processor = unified()
    // Parse HTML into AST
    .use(rehypeParse, { fragment: true })
    
    // Apply HTML AST transformations
    .use(preserveLinks)
    .use(handleMath);

  // Apply schema transformations to HTML AST if schema is provided
  if (schema) {
    processor = applySchema(processor as any, schema, 'html');
  }

  // Continue with Markdown conversion
  processor = processor
    // Convert HTML AST to Markdown AST
    .use(rehypeRemark)
    
    // Apply Markdown AST transformations
    .use(remarkGfm)
    .use(remarkMath)
    .use(cleanupMarkdown);
  
  // Apply schema transformations to Markdown AST if schema is provided
  if (schema) {
    processor = applySchema(processor as any, schema, 'markdown');
  }
  
  // Stringify Markdown AST to Markdown text
  processor = processor
    .use(remarkStringify, {
      bullet: '-',
      emphasis: '*',
      strong: '**',
      fence: '```',
      fences: true,
      incrementListMarker: true,
      listItemIndent: 'one',
      setext: false,
      // These options may be overridden by schema
      ...(schema?.global || {})
    } as any);
  
  // Process the HTML and return the resulting Markdown
  const file = await processor.process(html);
  return String(file);
}