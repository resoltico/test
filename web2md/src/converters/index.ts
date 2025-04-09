import { createTurndownService, preprocessHtml } from './turndown-service.js';
import { loadSchema } from '../schemas/index.js';
import { ConversionError } from '../utils/error-utils.js';
import { restoreLinks } from './link-processor.js';

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
    let markdown = turndownService.turndown(processedHtml);
    
    // Restore original links if they were modified
    markdown = restoreLinks(markdown);
    
    // Apply post-processing to clean up the Markdown
    markdown = postprocessMarkdown(markdown);
    
    return markdown;
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
  // Restore newlines in code blocks that were preserved as ⏎
  let cleaned = markdown.replace(/⏎/g, '\n');
  
  // Fix heading spacing
  cleaned = cleaned.replace(/\n{3,}(#+\s.*)\n+/g, '\n\n$1\n\n');
  
  // Fix list spacing - keep lists compact with single line breaks
  cleaned = cleaned.replace(/\n{2,}([-*+]\s+)/g, '\n$1');
  
  // Fix code block spacing - ensure proper spacing around code blocks
  cleaned = cleaned.replace(/\n{3,}(```[^`]*```)/g, '\n\n$1\n\n');
  
  // Fix table formatting - ensure proper spacing around tables
  cleaned = cleaned.replace(/\n{3,}(\|.*\|.*\n\|.*\|)/g, '\n\n$1');
  
  // Fix blockquote formatting
  cleaned = cleaned.replace(/\n{3,}(>\s+.*)/g, '\n\n$1\n\n');
  
  // Fix consecutive blank lines (more than 2)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // Fix math display format - ensure proper spacing for display math
  cleaned = cleaned.replace(/\$\$\n([^$]+)\n\$\$/g, '\n$$\n$1\n$$\n');
  
  // Make sure blockquotes use proper '>' format with space after
  cleaned = cleaned.replace(/^>\s*$/gm, '> ');
  cleaned = cleaned.replace(/^>([^\s])/gm, '> $1');
  
  // Fix inconsistent line breaks in lists
  cleaned = cleaned.replace(/\n{2,}([-*+]\s)/g, '\n$1');
  
  // Ensure proper spacing before and after horizontal rules
  cleaned = cleaned.replace(/\n{0,1}---\n{0,1}/g, '\n\n---\n\n');
  
  // Clean up any trailing whitespace
  cleaned = cleaned.replace(/[ \t]+$/gm, '');
  
  // Ensure proper spacing for tables
  cleaned = cleaned.replace(/\n{3,}(\|.*\|)/g, '\n\n$1');
  cleaned = cleaned.replace(/(\|.*\|)\n{3,}/g, '$1\n\n');
  
  // Fix link formatting - ensure no spaces inside link parentheses
  cleaned = cleaned.replace(/\[([^\]]+)\]\(\s+([^)]+)\s+\)/g, '[$1]($2)');
  
  // Fix definition lists
  cleaned = cleaned.replace(/\*\*(.*)\*\*\n\n(.*)\n\n\n\n/g, '**$1**\n$2\n\n');
  
  return cleaned;
}

export { preprocessHtml };
