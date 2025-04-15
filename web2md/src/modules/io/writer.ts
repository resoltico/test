import fs from 'node:fs/promises';
import path from 'node:path';
import { WriteOptions } from '../../types/core/io.js';
import { IOError } from '../../shared/errors/app-error.js';
import { Logger } from '../../shared/logger/console.js';

/**
 * Output writer
 */
export class OutputWriter {
  constructor(private logger: Logger) {}

  /**
   * Write output to file or stdout
   */
  async write(content: string, options: WriteOptions): Promise<void> {
    const { outputPath, createDirs } = options;

    if (!outputPath) {
      // Write to stdout
      process.stdout.write(content);
      return;
    }

    try {
      // Create directories if needed
      if (createDirs) {
        const dirPath = path.dirname(outputPath);
        await fs.mkdir(dirPath, { recursive: true });
      }

      // Write to file
      await fs.writeFile(outputPath, content, 'utf8');
      this.logger.info(`Output written to ${outputPath}`);
    } catch (error) {
      throw new IOError(`Failed to write output to ${outputPath}: ${error}`);
    }
  }

  /**
   * Determine output path based on source path
   */
  static determineOutputPath(sourcePath: string, isUrl: boolean): string {
    if (isUrl) {
      // For URLs, use the hostname as the filename
      try {
        const url = new URL(sourcePath.startsWith('http') ? sourcePath : `https://${sourcePath}`);
        const hostname = url.hostname.replace(/^www\./, '');
        return `${hostname}.md`;
      } catch {
        // Fallback for invalid URLs
        return 'output.md';
      }
    } else {
      // For files, replace the extension with .md
      const parsedPath = path.parse(sourcePath);
      return `${parsedPath.dir}/${parsedPath.name}.md`;
    }
  }
}
