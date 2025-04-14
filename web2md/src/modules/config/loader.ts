/**
 * Configuration loading implementation
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { ConfigError } from '../../shared/errors/index.js';
import { Logger } from '../../types.js';
import { Config } from './types.js';
import { configSchema, defaultConfig } from './schema.js';

/**
 * Loads and validates the application configuration
 */
export class ConfigLoader {
  private config: Config | null = null;
  
  constructor(private logger: Logger) {}
  
  /**
   * Loads the configuration from the most appropriate source
   */
  async loadConfig(): Promise<Config> {
    // Return cached config if available
    if (this.config) {
      return this.config;
    }
    
    try {
      // Find configuration file
      const configPath = this.findConfigFile();
      
      // If no config file found, use defaults
      if (!configPath) {
        this.logger.debug('No configuration file found, using defaults');
        // Create a new object from defaultConfig with a mutable ignoreTags array
        this.config = {
          ...defaultConfig,
          ignoreTags: [...defaultConfig.ignoreTags]
        };
        return this.config;
      }
      
      this.logger.debug(`Loading configuration from ${configPath}`);
      
      // Read and parse configuration
      const configContent = await fs.readFile(configPath, 'utf8');
      const parsedConfig = JSON.parse(configContent);
      
      // Merge with defaults and validate
      const mergedConfig = {
        ...defaultConfig,
        ...parsedConfig,
        // Ensure ignoreTags is a mutable array if not provided in parsedConfig
        ignoreTags: parsedConfig.ignoreTags || [...defaultConfig.ignoreTags]
      };
      
      // Validate configuration
      try {
        this.config = configSchema.parse(mergedConfig);
      } catch (error) {
        throw new ConfigError(`Invalid configuration: ${(error as Error).message}`);
      }
      
      return this.config;
    } catch (error) {
      if (error instanceof ConfigError) {
        throw error;
      }
      this.logger.warn(`Error loading configuration, using defaults: ${(error as Error).message}`);
      // Create a new object from defaultConfig with a mutable ignoreTags array
      this.config = {
        ...defaultConfig,
        ignoreTags: [...defaultConfig.ignoreTags]
      };
      return this.config;
    }
  }
  
  /**
   * Overrides specific configuration values (e.g., from CLI options)
   */
  updateConfig(overrides: Partial<Config>): void {
    if (!this.config) {
      // Create a new object from defaultConfig with a mutable ignoreTags array
      this.config = {
        ...defaultConfig,
        ignoreTags: [...defaultConfig.ignoreTags]
      };
    }
    
    this.config = {
      ...this.config,
      ...overrides
    };
  }
  
  /**
   * Finds a configuration file in standard locations
   */
  private findConfigFile(): string | null {
    const possibleLocations = [
      '.web2md.json',
      '.web2md.js',
      '.web2md/config.json'
    ];
    
    for (const location of possibleLocations) {
      const configPath = path.join(process.cwd(), location);
      if (existsSync(configPath)) {
        return configPath;
      }
    }
    
    return null;
  }
}
