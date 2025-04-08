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
  info: '🔵 ',
  success: '✅ ',
  warning: '⚠️  ',
  error: '❌ ',
  debug: '🔍 '
};

/**
 * Enhanced Logger class for application logging with Node.js 22 features
 */
export class Logger {
  private _context: string;
  private _debugMode: boolean;
  private _silent: boolean;
  private _logLevel: 'debug' | 'info' | 'warning' | 'error';
  
  constructor(context = 'web2json', debugMode = false) {
    this._context = context;
    this._debugMode = debugMode;
    this._silent = false;
    this._logLevel = 'info';
  }
  
  /**
   * Format a log message with the context prefix
   */
  private format(message: string): string {
    return `[${this._context}] ${message}`;
  }
  
  /**
   * Log an informational message
   */
  info(message: string): void {
    if (this._silent || !this.shouldLog('info')) return;
    console.log(colors.info(this.format(`${icons.info}${message}`)));
  }
  
  /**
   * Log a success message
   */
  success(message: string): void {
    if (this._silent || !this.shouldLog('info')) return;
    console.log(colors.success(this.format(`${icons.success}${message}`)));
  }
  
  /**
   * Log a warning message
   */
  warning(message: string): void {
    if (this._silent || !this.shouldLog('warning')) return;
    console.log(colors.warning(this.format(`${icons.warning}${message}`)));
  }
  
  /**
   * Log an error message
   */
  error(message: string, err?: Error): void {
    if (this._silent || !this.shouldLog('error')) return;
    console.error(colors.error(this.format(`${icons.error}${message}`)));
    if (err) {
      console.error(colors.error(err.stack || err.message));
    }
  }
  
  /**
   * Log a debug message (only in debug mode)
   */
  debug(message: string): void {
    if (this._silent || !this._debugMode || !this.shouldLog('debug')) return;
    console.log(colors.debug(this.format(`${icons.debug}${message}`)));
  }
  
  /**
   * Enable debug mode
   */
  enableDebug(): void {
    this._debugMode = true;
  }
  
  /**
   * Disable debug mode
   */
  disableDebug(): void {
    this._debugMode = false;
  }
  
  /**
   * Enable silent mode (suppress all output)
   */
  enableSilent(): void {
    this._silent = true;
  }
  
  /**
   * Disable silent mode
   */
  disableSilent(): void {
    this._silent = false;
  }
  
  /**
   * Set the log level
   */
  setLogLevel(level: 'debug' | 'info' | 'warning' | 'error'): void {
    this._logLevel = level;
  }
  
  /**
   * Check if a message should be logged based on current log level
   */
  private shouldLog(level: 'debug' | 'info' | 'warning' | 'error'): boolean {
    const levels = ['debug', 'info', 'warning', 'error'];
    const currentIndex = levels.indexOf(this._logLevel);
    const messageIndex = levels.indexOf(level);
    
    return messageIndex >= currentIndex;
  }
  
  /**
   * Get the current debug mode status
   */
  get debugMode(): boolean {
    return this._debugMode;
  }
  
  /**
   * Set the debug mode status
   */
  set debugMode(value: boolean) {
    this._debugMode = value;
  }
  
  /**
   * Get the current silent mode status
   */
  get silent(): boolean {
    return this._silent;
  }
  
  /**
   * Set the silent mode status
   */
  set silent(value: boolean) {
    this._silent = value;
  }
  
  /**
   * Set the context for the logger
   */
  set context(value: string) {
    this._context = value;
  }
  
  /**
   * Log a table with formatted data
   */
  table(data: any[], columns?: string[]): void {
    if (this._silent || !this.shouldLog('info')) return;
    
    console.log(colors.info(this.format(`Table output:`)));
    
    if (columns) {
      console.table(data, columns);
    } else {
      console.table(data);
    }
  }
  
  /**
   * Log a horizontal divider line
   */
  divider(char = '-', length = 80): void {
    if (this._silent || !this.shouldLog('info')) return;
    console.log(colors.debug(char.repeat(length)));
  }
  
  /**
   * Log a nested group of messages
   */
  group(title: string, callback: () => void): void {
    if (this._silent || !this.shouldLog('info')) return;
    
    console.group(colors.info(this.format(`${icons.info}${title}`)));
    callback();
    console.groupEnd();
  }
}

// Create default logger instance
export const logger = new Logger();