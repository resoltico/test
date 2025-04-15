import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import { Config } from '../../types/core/config.js';
import { configSchema, defaultConfig } from './schema.js';
import { ConfigError } from '../../shared/errors/app-error.js';
import { Logger } from '../../shared/logger/console.js';

/**
 * Configuration loader
 */
export class ConfigLoader {
  /**
   * Default configuration file name
   */
  private static readonly CONFIG_FILENAME = 'web2md.yaml';

  constructor(private logger: Logger) {}

  /**
   * Load configuration from file or use defaults
   */
  async loadConfig(): Promise<Config> {
    const configPath = path.join(process.cwd(), ConfigLoader.CONFIG_FILENAME);
    let config: Config = defaultConfig;

    try {
      // Check if config file exists
      await fs.access(configPath);
      this.logger.info(`Loading configuration from ${configPath}`);

      // Read and parse YAML
      const content = await fs.readFile(configPath, 'utf8');
      const parsedConfig = yaml.load(content);

      // Validate and transform config
      try {
        config = configSchema.parse(parsedConfig);
        this.logger.debug('Configuration validated successfully');
      } catch (validationError) {
        throw new ConfigError(`Invalid configuration: ${validationError}`);
      }
    } catch (error) {
      if (error instanceof ConfigError) {
        throw error;
      }

      // File doesn't exist or can't be read, use defaults
      this.logger.info('No configuration file found, using defaults');
      config = defaultConfig;
    }

    return config;
  }
}
