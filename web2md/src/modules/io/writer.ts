import { promises as fs } from 'node:fs';
import { dirname, basename, join, resolve, extname } from 'node:path';
import { OutputOptions } from '../../types/core/config.js';
import { Logger } from '../../shared/logger/console.js';

/**
 * Writes output content
 */
export class OutputWriter {
  constructor(private logger: Logger) {}
  
  /**
   * Write content to a file or stdout
   * @param content The content to write
   * @param options Output options
   */
  async write(content: string, options: OutputOptions): Promise<void> {
    try {
      if (!options.outputPath) {
        // Write to stdout
        this.logger.debug('Writing to stdout');
        process.stdout.write(content);
        return;
      }
      
      // Write to file
      const absPath = resolve(process.cwd(), options.outputPath);
      this.logger.debug(`Writing to file: ${absPath}`);
      
      // Create directories if needed
      if (options.createDirs) {
        await this.createDirectories(absPath);
      }
      
      // Write the file
      await fs.writeFile(absPath, content, 'utf-8');
      this.logger.debug(`Successfully wrote ${content.length} bytes to ${absPath}`);
    } catch (error) {
      this.logger.error('Failed to write output');
      if (error instanceof Error) {
        this.logger.debug(`Error: ${error.message}`);
      }
      throw error;
    }
  }
  
  /**
   * Create directories for a file path
   * @param filePath Path to the file
   */
  private async createDirectories(filePath: string): Promise<void> {
    try {
      const dirPath = dirname(filePath);
      this.logger.debug(`Creating directories: ${dirPath}`);
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      this.logger.error(`Failed to create directories for: ${filePath}`);
      throw error;
    }
  }
  
  /**
   * Determine output path based on source path
   * @param sourcePath The source path (file or URL)
   * @param isUrl Whether the source is a URL
   * @returns The output path
   */
  static determineOutputPath(sourcePath: string, isUrl: boolean): string {
    if (isUrl) {
      // For URLs, create a filename from the URL
      try {
        const url = new URL(sourcePath);
        const hostname = url.hostname.replace(/\./g, '-');
        const pathname = url.pathname.replace(/\//g, '-');
        
        // Create a sanitized filename
        let filename = `${hostname}${pathname}`;
        
        // Sanitize the filename
        filename = filename
          .replace(/[^a-zA-Z0-9-_]/g, '-') // Replace invalid chars with hyphens
          .replace(/--+/g, '-')           // Replace multiple hyphens with a single one
          .replace(/^-|-$/g, '')          // Remove leading/trailing hyphens
          .substring(0, 100);             // Limit length
        
        return `${filename}.md`;
      } catch (error) {
        // Fallback for invalid URLs
        return 'output.md';
      }
    } else {
      // For files, replace the extension with .md
      const ext = extname(sourcePath);
      return sourcePath.replace(ext, '.md');
    }
  }
}
