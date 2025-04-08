import { createTurndownService } from './turndown-service.js';
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
    const schema = schemaPath ? await loadSchema(schemaPath) : undefined;
    const turndownService = createTurndownService(schema);
    return turndownService.turndown(html);
  } catch (error) {
    throw new ConversionError('Failed to convert HTML to Markdown', { cause: error });
  }
}
