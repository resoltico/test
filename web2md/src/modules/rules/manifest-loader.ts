import { join, resolve } from 'node:path';
import { RuleManifest } from '../../types/core/rule.js';
import { RuleValidator } from './validator.js';
import { Logger } from '../../shared/logger/console.js';

/**
 * Loads rule manifests from directories
 */
export class ManifestLoader {
  private readonly manifestName = 'manifest.yaml';
  
  constructor(private logger: Logger) {}
  
  /**
   * Load a rule manifest from a directory
   * @param directoryPath The directory containing the manifest
   * @returns The loaded manifest or null if not found/invalid
   */
  async loadManifest(directoryPath: string): Promise<RuleManifest | null> {
    try {
      // Create validator
      const validator = new RuleValidator(this.logger);
      
      // Get absolute path to the manifest
      const manifestPath = join(directoryPath, this.manifestName);
      this.logger.debug(`Looking for manifest at ${manifestPath}`);
      
      // Validate and parse the manifest
      const manifest = await validator.validateManifest(manifestPath);
      if (!manifest) {
        this.logger.error(`No valid manifest found at ${manifestPath}`);
        return null;
      }
      
      // Convert relative paths to absolute
      const rules = manifest.rules.map(rule => {
        // Handle relative paths
        if (!rule.startsWith('/')) {
          return resolve(directoryPath, rule);
        }
        return rule;
      });
      
      return { rules };
    } catch (error) {
      this.logger.error(`Error loading manifest from ${directoryPath}`);
      if (error instanceof Error) {
        this.logger.debug(`Error: ${error.message}`);
      }
      return null;
    }
  }
}
