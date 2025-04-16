import { promises as fs } from 'node:fs';
import { extname } from 'node:path';
import { load } from 'js-yaml';
import { z } from 'zod';
import { Logger } from '../../shared/logger/console.js';

/**
 * Schema for YAML rule files
 */
const yamlRuleSchema = z.object({
  rules: z.record(z.object({
    filter: z.string(),
    replacement: z.string(),
    attributes: z.array(z.string()).optional()
  }))
});

/**
 * Schema for rule manifest files
 */
const manifestSchema = z.object({
  rules: z.array(z.string())
});

/**
 * Validates rule files before loading
 */
export class RuleValidator {
  constructor(private logger: Logger) {}
  
  /**
   * Validate a rule file
   * @param path Path to the rule file
   * @returns Whether the file is valid
   */
  async validateRuleFile(path: string): Promise<boolean> {
    try {
      // Check if the file exists
      await fs.access(path);
      
      // Determine the file type
      const extension = extname(path).toLowerCase();
      
      if (extension === '.yaml' || extension === '.yml') {
        return this.validateYamlRule(path);
      } else if (extension === '.js' || extension === '.mjs') {
        return this.validateJsRule(path);
      } else {
        this.logger.error(`Unsupported rule file type: ${extension}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Error validating rule file ${path}`);
      if (error instanceof Error) {
        this.logger.debug(`Validation error: ${error.message}`);
      }
      return false;
    }
  }
  
  /**
   * Validate a YAML rule file
   * @param path Path to the YAML rule file
   * @returns Whether the file is valid
   */
  private async validateYamlRule(path: string): Promise<boolean> {
    try {
      const content = await fs.readFile(path, 'utf-8');
      const parsed = load(content) as unknown;
      
      try {
        yamlRuleSchema.parse(parsed);
        this.logger.debug(`YAML rule file ${path} is valid`);
        return true;
      } catch (error) {
        this.logger.error(`Invalid YAML rule file format: ${path}`);
        if (error instanceof Error) {
          this.logger.debug(`Validation error: ${error.message}`);
        }
        return false;
      }
    } catch (error) {
      this.logger.error(`Error reading YAML rule file ${path}`);
      if (error instanceof Error) {
        this.logger.debug(`Error: ${error.message}`);
      }
      return false;
    }
  }
  
  /**
   * Simple validation for JS rule files
   * We can only check if the file exists and is readable
   * Full validation would require dynamic import and type checking
   * @param path Path to the JS rule file
   * @returns Whether the file exists and is readable
   */
  private async validateJsRule(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      this.logger.debug(`JS rule file ${path} exists`);
      return true;
    } catch (error) {
      this.logger.error(`JS rule file ${path} not found or not readable`);
      return false;
    }
  }
  
  /**
   * Validate a rule manifest file
   * @param path Path to the manifest file
   * @returns The validated manifest or null if invalid
   */
  async validateManifest(path: string): Promise<z.infer<typeof manifestSchema> | null> {
    try {
      const content = await fs.readFile(path, 'utf-8');
      const parsed = load(content) as unknown;
      
      try {
        const validated = manifestSchema.parse(parsed);
        this.logger.debug(`Manifest file ${path} is valid`);
        return validated;
      } catch (error) {
        this.logger.error(`Invalid manifest file format: ${path}`);
        if (error instanceof Error) {
          this.logger.debug(`Validation error: ${error.message}`);
        }
        return null;
      }
    } catch (error) {
      this.logger.error(`Error reading manifest file ${path}`);
      if (error instanceof Error) {
        this.logger.debug(`Error: ${error.message}`);
      }
      return null;
    }
  }
}
