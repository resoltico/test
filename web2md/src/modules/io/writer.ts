import { writeFile } from 'fs/promises';
import * as path from 'path';
import { WriteOptions } from './types.js';
import { Logger } from '../../shared/logger/index.js';

export class OutputWriter {
  constructor(private logger: Logger) {}
  
  /**
   * Write content to output (file or stdout)
   */
  async write(content: string, options: WriteOptions): Promise<void> {
    const { outputPath } = options;
    
    if (outputPath) {
      await this.writeToFile(content, outputPath);
    } else {
      this.writeToStdout(content);
    }
  }
  
  /**
   * Write content to a file
   */
  private async writeToFile(content: string, outputPath: string): Promise<void> {
    try {
      await writeFile(outputPath, content, 'utf8');
      this.logger.debug(`Wrote ${content.length} bytes to file ${outputPath}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to write to file ${outputPath}: ${errorMessage}`);
      throw new Error(`Failed to write to file ${outputPath}: ${errorMessage}`);
    }
  }
  
  /**
   * Write content to stdout
   */
  private writeToStdout(content: string): void {
    process.stdout.write(content);
    this.logger.debug(`Wrote ${content.length} bytes to stdout`);
  }
  
  /**
   * Determine output path based on input path
   */
  static determineOutputPath(inputPath: string, isUrl: boolean): string {
    let baseName: string;
    
    if (isUrl) {
      const url = new URL(inputPath);
      const pathName = url.pathname;
      const fileName = path.basename(pathName);
      
      baseName = fileName || url.hostname;
    } else {
      baseName = path.basename(inputPath, path.extname(inputPath));
    }
    
    // Sanitize filename
    baseName = baseName.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
    
    return `${baseName}.md`;
  }
}