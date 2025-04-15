import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import { Logger } from '../../shared/logger/console.js';

/**
 * Rule validator
 */
export class RuleValidator {
  constructor(private logger: Logger) {}

  /**
   * Validate a single rule file path
   */
  async validateRulePath(filePath: string): Promise<boolean> {
    try {
      // Check if file exists and is a regular file
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        this.logger.warn(`Not a regular file: ${filePath}`);
        return false;
      }

      // Check file extension
      const ext = path.extname(filePath).toLowerCase();
      if (ext !== '.yaml' && ext !== '.yml' && ext !== '.js' && ext !== '.mjs') {
        this.logger.warn(`Unsupported file extension: ${filePath}`);
        return false;
      }

      // For YAML files, validate content structure
      if (ext === '.yaml' || ext === '.yml') {
        const content = await fs.readFile(filePath, 'utf8');
        const data = yaml.load(content);

        if (!data || typeof data !== 'object' || !('rules' in data)) {
          this.logger.warn(`Invalid YAML rules file structure: ${filePath}`);
          return false;
        }
      }

      return true;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error validating rule file ${filePath}: ${error.message}`);
      }
      return false;
    }
  }

  /**
   * Validate multiple rule file paths
   */
  async validateRulePaths(filePaths: string[]): Promise<string[]> {
    const validPaths: string[] = [];

    for (const filePath of filePaths) {
      const isValid = await this.validateRulePath(filePath);
      if (isValid) {
        validPaths.push(filePath);
      }
    }

    return validPaths;
  }
}
