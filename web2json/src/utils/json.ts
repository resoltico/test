// src/utils/json.ts
import { mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import { writeFile } from 'fs/promises';
import { existsSync } from 'fs';

/**
 * Format JSON with nice indentation for output
 */
export function formatJson(data: any): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Write JSON to a file with error handling
 */
export async function writeJsonToFile(filePath: string, data: any): Promise<void> {
  try {
    const resolvedPath = resolve(filePath);
    const dir = dirname(resolvedPath);
    
    // Create directory if it doesn't exist
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    
    await writeFile(resolvedPath, formatJson(data), 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write JSON file: ${(error as Error).message}`);
  }
}

/**
 * Normalize a JSON object by removing undefined values and empty arrays/objects
 */
export function normalizeJson(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    const filtered = obj
      .map(normalizeJson)
      .filter(item => item !== null && item !== undefined);
    
    return filtered.length > 0 ? filtered : null;
  }
  
  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    let hasProperties = false;
    
    for (const [key, value] of Object.entries(obj)) {
      const normalized = normalizeJson(value);
      if (normalized !== null && normalized !== undefined) {
        result[key] = normalized;
        hasProperties = true;
      }
    }
    
    return hasProperties ? result : null;
  }
  
  return obj;
}
