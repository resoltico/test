#!/usr/bin/env node

/**
 * Development build script that watches for changes
 */
import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m'
};

// Log with a timestamp
function log(message, color = colors.reset) {
  const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
  console.log(`${colors.cyan}[${timestamp}]${colors.reset} ${color}${message}${colors.reset}`);
}

// Execute a command and log its output
function execute(command, errorMessage) {
  try {
    log(`Executing: ${command}`, colors.yellow);
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    log(`${errorMessage}: ${error.message}`, colors.red);
    return false;
  }
}

// Make bin script executable
function makeExecutable() {
  log('Making bin script executable', colors.bright);
  fs.chmodSync('bin/web2md.js', '755');
  log('Made bin/web2md.js executable', colors.green);
}

// Start development mode
async function dev() {
  log('Starting development mode', colors.bright + colors.green);
  
  // Make bin script executable
  makeExecutable();
  
  // Use tsx to watch and run TypeScript files
  log('Starting tsx watch process', colors.magenta);
  const tsxProcess = spawn('npx', ['tsx', 'watch', 'src'], {
    stdio: 'inherit',
    shell: true
  });
  
  // Handle tsx process events
  tsxProcess.on('error', (error) => {
    log(`tsx process error: ${error.message}`, colors.red);
  });
  
  tsxProcess.on('close', (code) => {
    if (code !== 0) {
      log(`tsx process exited with code ${code}`, colors.red);
    }
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    log('Terminating development mode', colors.yellow);
    tsxProcess.kill('SIGINT');
    process.exit(0);
  });
  
  log('Development mode running (Press Ctrl+C to exit)', colors.bright + colors.green);
}

// Run development mode
dev().catch(error => {
  log(`Development mode failed: ${error.message}`, colors.red);
  process.exit(1);
});
