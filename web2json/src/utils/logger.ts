import chalk from 'chalk';

// Logger colors for different message types
const colors = {
  info: chalk.blue,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  debug: chalk.gray
};

// Logger icons for different message types
const icons = {
  info: 'ℹ️ ',
  success: '✅ ',
  warning: '⚠️ ',
  error: '❌ ',
  debug: '🔍 '
};

/**
 * Logger class for consistent application logging
 */
export class Logger {
  private readonly context: string;
  private readonly debugMode: boolean;
  
  constructor(context = 'web2json', debugMode = false) {
    this.context = context;
    this.debugMode = debugMode;
  }
  
  /**
   * Format a log message with the context prefix
   */
  private format(message: string): string {
    return `[${this.context}] ${message}`;
  }
  
  /**
   * Log an informational message
   */
  info(message: string): void {
    console.log(colors.info(this.format(`${icons.info}${message}`)));
  }
  
  /**
   * Log a success message
   */
  success(message: string): void {
    console.log(colors.success(this.format(`${icons.success}${message}`)));
  }
  
  /**
   * Log a warning message
   */
  warning(message: string): void {
    console.log(colors.warning(this.format(`${icons.warning}${message}`)));
  }
  
  /**
   * Log an error message
   */
  error(message: string, err?: Error): void {
    console.error(colors.error(this.format(`${icons.error}${message}`)));
    if (err) {
      console.error(colors.error(err.stack || err.message));
    }
  }
  
  /**
   * Log a debug message (only in debug mode)
   */
  debug(message: string): void {
    if (this.debugMode) {
      console.log(colors.debug(this.format(`${icons.debug}${message}`)));
    }
  }
}

// Create default logger instance
export const logger = new Logger();
