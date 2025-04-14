/**
 * Console implementation of the Logger interface
 */
import chalk from 'chalk';
import { Logger } from '../../types.js';

export class ConsoleLogger implements Logger {
  debug(message: string, ...args: unknown[]): void {
    console.debug(chalk.gray(`[DEBUG] ${message}`), ...args);
  }

  info(message: string, ...args: unknown[]): void {
    console.info(chalk.blue(`[INFO] ${message}`), ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(chalk.yellow(`[WARN] ${message}`), ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(chalk.red(`[ERROR] ${message}`), ...args);
  }
}
