import path from 'path';
import fs from 'fs/promises';
import { URL } from 'url';

/**
 * Sanitizes a file path by replacing invalid characters
 * @param filePath The file path to sanitize
 * @returns The sanitized file path
 */
export function sanitizePath(filePath: string): string {
  // Replace invalid characters with underscores
  return filePath.replace(/[<>:"/\\|?*]/g, '_');
}

/**
 * Determines the output path for the Markdown file
 * @param inputSource The source URL or file path
 * @param outputPath Optional output path provided by the user
 * @returns The determined output path
 */
export async function determineOutputPath(inputSource: string, outputPath?: string): Promise<string> {
  if (outputPath) {
    const sanitizedPath = sanitizePath(outputPath);
    
    // Create directory if it doesn't exist
    const dir = path.dirname(sanitizedPath);
    await fs.mkdir(dir, { recursive: true });
    
    return sanitizedPath;
  }

  let fileName: string;
  
  if (inputSource.startsWith('http://') || inputSource.startsWith('https://')) {
    // Extract filename from URL
    try {
      const url = new URL(inputSource);
      fileName = url.pathname.split('/').pop() || url.hostname;
      
      // If the pathname ends with a slash, use the hostname
      if (fileName === '' || fileName === '/') {
        fileName = url.hostname;
      }
      
      // Remove file extension if exists
      fileName = fileName.replace(/\.\w+$/, '');
    } catch (error) {
      // If URL parsing fails, use a fallback name
      fileName = 'webpage';
    }
  } else {
    // Extract filename from local path
    fileName = path.basename(inputSource, path.extname(inputSource));
  }
  
  const sanitizedFileName = sanitizePath(fileName);
  const outputFile = `${sanitizedFileName}.md`;
  
  return outputFile;
}
