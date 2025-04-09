import { createTurndownService, preprocessHtml } from './turndown-service.js';
import { loadSchema } from '../schemas/index.js';
import { ConversionError } from '../utils/error-utils.js';

/**
 * Converts HTML to Markdown
 * @param html The HTML content to convert
 * @param schemaPath Optional path to a custom conversion schema
 * @returns The converted Markdown content
 * @throws {ConversionError} If conversion fails
 */
export async function convert(html: string, schemaPath?: string): Promise<string> {
  try {
    // Preprocess HTML to handle special elements like MathML
    const processedHtml = await preprocessHtml(html);
    
    // Load schema if provided
    const schema = schemaPath ? await loadSchema(schemaPath) : undefined;
    
    // Create turndown service and convert to Markdown
    const turndownService = createTurndownService(schema);
    const markdown = turndownService.turndown(processedHtml);
    
    // Apply post-processing to clean up the Markdown
    const cleanedMarkdown = postprocessMarkdown(markdown);
    
    return cleanedMarkdown;
  } catch (error) {
    throw new ConversionError('Failed to convert HTML to Markdown', { cause: error });
  }
}

/**
 * Post-processes Markdown content to improve formatting
 * @param markdown The converted Markdown content
 * @returns The cleaned-up Markdown content
 */
function postprocessMarkdown(markdown: string): string {
  // Remove excessive blank lines
  let cleaned = markdown.replace(/\n{3,}/g, '\n\n');
  
  // Fix spacing around headers
  cleaned = cleaned.replace(/\n(#+\s.*)\n/g, '\n\n$1\n\n');
  
  // Fix spacing around code blocks
  cleaned = cleaned.replace(/\n```(.*)\n/g, '\n\n```$1\n');
  cleaned = cleaned.replace(/\n```\n/g, '\n```\n\n');
  
  // Fix spacing around tables
  cleaned = cleaned.replace(/\n(\|.*\|)\n\n/g, '\n$1\n');
  
  // Fix spacing around blockquotes
  cleaned = cleaned.replace(/\n>(.*)\n\n/g, '\n\n>$1\n\n');
  
  // Fix math formula line breaks
  cleaned = cleaned.replace(/\n\n\$\$(.*)\$\$\n\n/gs, '\n\n$$\n$1\n$$\n\n');
  
  return cleaned;
}

export { preprocessHtml };
