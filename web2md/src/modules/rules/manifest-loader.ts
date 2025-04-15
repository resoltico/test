import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import { Logger } from '../../shared/logger/console.js';
import { RuleManifest } from '../../types/modules/rules.js';
import { RuleError } from '../../shared/errors/app-error.js';

/**
 * Manifest loader
 */
export class ManifestLoader {
  private static readonly MANIFEST_FILENAME = 'manifest.yaml';

  constructor(private logger: Logger) {}

  /**
   * Load rule manifest from directory
   */
  async loadManifest(dirPath: string): Promise<string[]> {
    const manifestPath = path.join(dirPath, ManifestLoader.MANIFEST_FILENAME);

    try {
      // Check if manifest exists
      await fs.access(manifestPath);

      // Read and parse manifest
      const content = await fs.readFile(manifestPath, 'utf8');
      const manifest = yaml.load(content) as unknown;

      // Validate manifest
      if (!manifest || typeof manifest !== 'object' || !('rules' in manifest) || !Array.isArray(manifest.rules)) {
        throw new RuleError(`Invalid manifest structure in ${manifestPath}`);
      }

      const typedManifest = manifest as RuleManifest;

      // Resolve paths relative to manifest directory
      return typedManifest.rules.map(rulePath => 
        path.isAbsolute(rulePath) ? rulePath : path.resolve(dirPath, rulePath)
      );
    } catch (error) {
      if (error instanceof RuleError) {
        throw error;
      }
      throw new RuleError(`Failed to load manifest from ${manifestPath}: ${error}`);
    }
  }
}
