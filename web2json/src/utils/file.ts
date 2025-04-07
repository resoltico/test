import { writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { logger } from './logger.js';

export async function saveToFile(filePath: string, content: string): Promise<void> {
  try {
    // Create directory if it doesn't exist
    await mkdir(dirname(filePath), { recursive: true });
    
    // Write file
    await writeFile(filePath, content, 'utf8');
    
    logger.success(`File saved: ${filePath}`);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to save file: ${error.message}`);
    }
    throw error;
  }
}
