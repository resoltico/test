import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Config } from '../../types.js';
import { configSchema } from './schema.js';
import { Logger } from '../../shared/logger/index.js';

export class ConfigLoader {
  // Default configuration
  private readonly defaultConfig: Config = {
    headingStyle: 'atx',
    listMarker: '-',
    codeBlockStyle: 'fenced',
    preserveTableAlignment: true,
    ignoreTags: [],
    useBuiltInRules: true,
    debug: false
  };
  
  constructor(private logger: Logger) {}
  
  /**
   * Load configuration from file or use defaults
   */
  async loadConfig(): Promise<Config> {
    // Find configuration file
    const configPath = this.findConfigFile();
    if (!configPath) {
      this.logger.debug('No configuration file found, using defaults');
      return this.defaultConfig;
    }
    
    try {
      // Read the configuration file
      const content = await readFile(configPath, 'utf8');
      
      // Parse based on file extension
      let parsedConfig: any;
      if (configPath.endsWith('.yaml') || configPath.endsWith('.yml')) {
        parsedConfig = yaml.load(content);
      } else if (configPath.endsWith('.json')) {
        parsedConfig = JSON.parse(content);
      } else {
        throw new Error(`Unsupported configuration file format: ${configPath}`);
      }
      
      // Merge with defaults
      const mergedConfig = {
        ...this.defaultConfig,
        ...parsedConfig
      };
      
      // Validate configuration
      return this.validateConfig(mergedConfig);
    } catch (error: any) {
      this.logger.warn(`Error loading configuration: ${error.message}`);
      return this.defaultConfig;
    }
  }
  
  /**
   * Find configuration file in standard locations
   */
  private findConfigFile(): string | null {
    const locations = [
      'web2md.yaml',
      'web2md.yml',
      'web2md.json',
      'web2md/config.yaml',
      'web2md/config.yml',
      'web2md/config.json'
    ];
    
    for (const location of locations) {
      const filePath = path.resolve(process.cwd(), location);
      if (existsSync(filePath)) {
        return filePath;
      }
    }
    
    return null;
  }
  
  /**
   * Validate configuration against schema
   */
  private validateConfig(config: any): Config {
    try {
      return configSchema.parse(config);
    } catch (error: any) {
      this.logger.warn(`Invalid configuration: ${error.message}`);
      return this.defaultConfig;
    }
  }
}