// src/utils/logger.ts
import chalk from 'chalk';
import ora, { type Ora } from 'ora';

/**
 * Logger utility class for consistent CLI output
 */
export class Logger {
  private spinner: Ora | null = null;

  info(message: string): void {
    console.log(chalk.blue('ℹ️ ') + message);
  }

  success(message: string): void {
    console.log(chalk.green('✅ ') + message);
  }

  warning(message: string): void {
    console.log(chalk.yellow('⚠️ ') + message);
  }

  error(message: string): void {
    console.error(chalk.red('❌ ') + message);
  }

  startSpinner(message: string): void {
    this.spinner = ora(message).start();
  }

  updateSpinner(message: string): void {
    if (this.spinner) {
      this.spinner.text = message;
    }
  }

  stopSpinner(success = true, message?: string): void {
    if (this.spinner) {
      if (success) {
        this.spinner.succeed(message);
      } else {
        this.spinner.fail(message);
      }
      this.spinner = null;
    }
  }
}

export const logger = new Logger();
