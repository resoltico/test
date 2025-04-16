import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import { load } from 'js-yaml';
import { Config } from '../../types/core/config.js';
import { configSchema, getDefaultConfig } from './schema.js';
import { Logger } from '../../shared/logger/console.js';

/**
 * Loads and validates configuration from YAML files
 */
export class ConfigLoader {
  private readonly configFilename = 'web2md.yaml';
  
  constructor(private logger: Logger) {}
  
  /**
   * Load configuration from file or defaults
   */
  async loadConfig(): Promise<Config> {
    try {
      // Try to load from current directory
      const configPath = resolve(process.cwd(), this.configFilename);
      this.logger.debug(`Trying to load config from ${configPath}`);
      
      // Check if the file exists
      try {
        await fs.access(configPath);
      } catch (error) {
        this.logger.debug(`No config file found at ${configPath}, using defaults`);
        return getDefaultConfig();
      }
      
      // Read and parse the YAML file
      const configContent = await fs.readFile(configPath, 'utf-8');
      const parsedConfig = load(configContent) as Record<string, unknown>;
      
      // Validate the config
      try {
        // This will fill in defaults for any missing properties
        const validatedConfig = configSchema.parse(parsedConfig);
        this.logger.debug('Config loaded and validated successfully');
        return validatedConfig as Config;
      } catch (error) {
        this.logger.error('Config validation failed, using defaults');
        this.logger.debug(`Validation error: ${JSON.stringify(error)}`);
        return getDefaultConfig();
      }
    } catch (error) {
      this.logger.error('Failed to load config, using defaults');
      if (error instanceof Error) {
        this.logger.debug(`Error: ${error.message}`);
      }
      return getDefaultConfig();
    }
  }
}
