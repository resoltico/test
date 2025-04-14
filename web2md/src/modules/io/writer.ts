/**
 * Output writer implementation
 */
import { FileSystemInterface } from './types.js';
import { Logger } from '../../types.js';
import { determineOutputPath } from '../../shared/utils/path-utils.js';

/**
 * Writes converted content to files or stdout
 */
export class OutputWriter {
  constructor(
    private fsAdapter: FileSystemInterface,
    private logger: Logger
  ) {}
  
  /**
   * Writes content to a file or stdout
   */
  async write(content: string, sourcePath: string, isUrl: boolean, outputPath?: string): Promise<void> {
    // If no output path is provided, write to stdout
    if (!outputPath) {
      process.stdout.write(content);
      return;
    }
    
    // Determine the output path
    const resolvedOutputPath = determineOutputPath(sourcePath, isUrl, outputPath);
    
    this.logger.info(`Writing output to ${resolvedOutputPath}`);
    
    // Write the content to the file
    await this.fsAdapter.writeFile(resolvedOutputPath, content);
    
    this.logger.info(`Successfully wrote output to ${resolvedOutputPath}`);
  }
}
