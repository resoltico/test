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
  isDebugEnabled(): boolean;
}

/**
 * Console implementation of the Logger interface
 */
export class ConsoleLogger implements Logger {
  private debugEnabled: boolean = false;

  /**
   * Set debug mode
   */
  setDebug(enabled: boolean): void {
    this.debugEnabled = enabled;
  }
  
  /**
   * Check if debug mode is enabled
   */
  isDebugEnabled(): boolean {
    return this.debugEnabled;
  }

  /**
   * Log a debug message (only in debug mode)
   */
  debug(message: string): void {
    if (this.debugEnabled) {
      const timestamp = new Date().toISOString();
      console.log(chalk.blue(`[${timestamp}] [DEBUG] ${message}`));
    }
  }

  /**
   * Log an info message
   */
  info(message: string): void {
    const timestamp = new Date().toISOString();
    console.log(chalk.green(`[${timestamp}] [INFO] ${message}`));
  }

  /**
   * Log a warning message
   */
  warn(message: string): void {
    const timestamp = new Date().toISOString();
    console.log(chalk.yellow(`[${timestamp}] [WARN] ${message}`));
  }

  /**
   * Log an error message
   */
  error(message: string): void {
    const timestamp = new Date().toISOString();
    console.error(chalk.red(`[${timestamp}] [ERROR] ${message}`));
  }
}