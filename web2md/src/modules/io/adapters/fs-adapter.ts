/**
 * File system adapter implementation
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { FileError } from '../../../shared/errors/index.js';
import { FileSystemInterface } from '../types.js';
import { Logger } from '../../../types.js';

/**
 * Implementation of file system operations
 */
export class FileSystemAdapter implements FileSystemInterface {
  constructor(private logger: Logger) {}
  
  /**
   * Reads a file from the file system
   */
  async readFile(filePath: string, encoding: BufferEncoding = 'utf8'): Promise<string> {
    try {
      this.logger.debug(`Reading file: ${filePath}`);
      return await fs.readFile(filePath, { encoding });
    } catch (error) {
      throw new FileError(`Failed to read file ${filePath}: ${(error as Error).message}`, filePath);
    }
  }
  
  /**
   * Writes a file to the file system
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      this.logger.debug(`Writing file: ${filePath}`);
      
      // Create directory if it doesn't exist
      const dir = path.dirname(filePath);
      if (!existsSync(dir)) {
        await fs.mkdir(dir, { recursive: true });
      }
      
      await fs.writeFile(filePath, content, 'utf8');
    } catch (error) {
      throw new FileError(`Failed to write file ${filePath}: ${(error as Error).message}`, filePath);
    }
  }
  
  /**
   * Checks if a file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Reads all files in a directory recursively
   */
  async readDirectory(dir: string): Promise<string[]> {
    try {
      const dirents = await fs.readdir(dir, { withFileTypes: true });
      const files = await Promise.all(dirents.map(async (dirent) => {
        const res = path.resolve(dir, dirent.name);
        return dirent.isDirectory() ? await this.readDirectory(res) : res;
      }));
      return Array.prototype.concat(...files);
    } catch (error) {
      throw new FileError(`Failed to read directory ${dir}: ${(error as Error).message}`, dir);
    }
  }
}
