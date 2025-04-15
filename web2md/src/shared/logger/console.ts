import chalk from 'chalk';

export interface Logger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  setDebug(enabled: boolean): void;
}

export class ConsoleLogger implements Logger {
  private debugEnabled = false;
  
  setDebug(enabled: boolean): void {
    this.debugEnabled = enabled;
  }
  
  debug(message: string): void {
    if (this.debugEnabled) {
      console.debug(chalk.gray(`[DEBUG] ${message}`));
    }
  }
  
  info(message: string): void {
    console.info(chalk.blue(`[INFO] ${message}`));
  }
  
  warn(message: string): void {
    console.warn(chalk.yellow(`[WARN] ${message}`));
  }
  
  error(message: string): void {
    console.error(chalk.red(`[ERROR] ${message}`));
  }
}