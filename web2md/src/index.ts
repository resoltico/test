#!/usr/bin/env node

/**
 * web2md - Transform HTML webpages into structured Markdown documents
 * 
 * This is the main entry point for the web2md application.
 * It initializes the CLI interface and delegates to the appropriate handlers.
 */

import { run } from './cli/index.js';

// Start the CLI
run();