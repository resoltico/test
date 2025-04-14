/**
 * Main application entry point that wires all modules together.
 */
import { container } from './di/container.js';
import { CLI } from './modules/cli/index.js';
import { DITokens } from './di/tokens.js';

// Run the application
async function main() {
  try {
    // Get the CLI service from the DI container
    const cli = container.resolve<CLI>(DITokens.CLI);
    
    // Execute the CLI
    await cli.execute();
  } catch (error) {
    // Handle any uncaught errors
    console.error('Fatal error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Execute the main function
main().catch(error => {
  console.error('Unhandled exception:', error);
  process.exit(1);
});
