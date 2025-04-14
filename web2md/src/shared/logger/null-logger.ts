/**
 * No-op implementation of the Logger interface
 */
import { Logger } from '../../types.js';

export class NullLogger implements Logger {
  debug(_message: string, ..._args: unknown[]): void {
    // No-op
  }

  info(_message: string, ..._args: unknown[]): void {
    // No-op
  }

  warn(_message: string, ..._args: unknown[]): void {
    // No-op
  }

  error(message: string, ...args: unknown[]): void {
    // We still log errors even in null logger
    console.error(message, ...args);
  }
}
