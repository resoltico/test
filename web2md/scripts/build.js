#!/usr/bin/env node

/**
 * Production build script
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
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

// Ensure dist directory exists and is clean
function prepareDistDirectory() {
  const distDir = path.resolve('dist');
  log('Preparing distribution directory', colors.bright);
  
  // Create dist directory if it doesn't exist
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
    log('Created dist directory', colors.green);
  } else {
    // Clean dist directory
    fs.readdirSync(distDir).forEach(file => {
      const filePath = path.join(distDir, file);
      fs.rmSync(filePath, { recursive: true, force: true });
    });
    log('Cleaned dist directory', colors.green);
  }
}

// Make bin script executable
function makeExecutable() {
  log('Making bin script executable', colors.bright);
  fs.chmodSync('bin/web2md.js', '755');
  log('Made bin/web2md.js executable', colors.green);
}

// Copy rules to dist
function copyRules() {
  log('Copying rules to distribution', colors.bright);
  const rulesDir = path.resolve('rules');
  const distRulesDir = path.resolve('dist/rules');
  
  // Create dist/rules directory
  if (!fs.existsSync(distRulesDir)) {
    fs.mkdirSync(distRulesDir, { recursive: true });
  }
  
  // Copy rules recursively
  function copyRecursive(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    
    if (isDirectory) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      
      fs.readdirSync(src).forEach(childItemName => {
        copyRecursive(
          path.join(src, childItemName),
          path.join(dest, childItemName)
        );
      });
    } else {
      fs.copyFileSync(src, dest);
    }
  }
  
  copyRecursive(rulesDir, distRulesDir);
  log('Copied rules to dist/rules', colors.green);
}

// Build the project
async function build() {
  log('Starting production build', colors.bright + colors.green);
  
  // Prepare the dist directory
  prepareDistDirectory();
  
  // Run TypeScript compiler
  if (!execute('tsc --project tsconfig.json', 'TypeScript compilation failed')) {
    process.exit(1);
  }
  
  // Copy rules to dist
  copyRules();
  
  // Make bin script executable
  makeExecutable();
  
  log('Production build completed successfully', colors.bright + colors.green);
}

// Run the build
build().catch(error => {
  log(`Build failed: ${error.message}`, colors.red);
  process.exit(1);
});
