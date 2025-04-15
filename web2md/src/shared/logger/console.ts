import chalk from 'chalk';

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  setDebug(enabled: boolean): void;
}

/**
 * Console logger implementation
 */
export class ConsoleLogger implements Logger {
  private debugEnabled = false;

  /**
   * Log a debug message (only in debug mode)
   */
  debug(message: string): void {
    if (this.debugEnabled) {
      console.debug(chalk.blue('DEBUG:'), message);
    }
  }

  /**
   * Log an info message
   */
  info(message: string): void {
    console.info(chalk.green('INFO:'), message);
  }

  /**
   * Log a warning message
   */
  warn(message: string): void {
    console.warn(chalk.yellow('WARN:'), message);
  }

  /**
   * Log an error message
   */
  error(message: string): void {
    console.error(chalk.red('ERROR:'), message);
  }

  /**
   * Enable or disable debug logging
   */
  setDebug(enabled: boolean): void {
    this.debugEnabled = enabled;
  }
}
