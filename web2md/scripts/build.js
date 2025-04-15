import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// ANSI colors for console output
const colors = {
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

/**
 * Log a message with color
 */
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Execute a command
 */
function execute(command, errorMessage) {
  try {
    execSync(command, { stdio: 'inherit', cwd: rootDir });
    return true;
  } catch (error) {
    log(errorMessage, colors.red);
    return false;
  }
}

/**
 * Prepare the dist directory
 */
async function prepareDistDirectory() {
  log('Preparing dist directory', colors.bright);
  
  try {
    // Remove existing dist directory
    await fs.rm(path.resolve(rootDir, 'dist'), { recursive: true, force: true });
    
    // Create fresh dist directory
    await fs.mkdir(path.resolve(rootDir, 'dist'), { recursive: true });
    
    // Create dist/rules directory
    await fs.mkdir(path.resolve(rootDir, 'dist/rules'), { recursive: true });
    
    log('Dist directory prepared', colors.green);
  } catch (error) {
    log(`Error preparing dist directory: ${error.message}`, colors.red);
    process.exit(1);
  }
}

/**
 * Copy rules to dist directory
 */
async function copyRulesToDist() {
  log('Copying rules to distribution', colors.bright);
  
  try {
    // Get all rule files
    const rulesDir = path.resolve(rootDir, 'rules');
    const files = await fs.readdir(rulesDir);
    
    // Copy each file
    for (const file of files) {
      const sourcePath = path.join(rulesDir, file);
      const destPath = path.join(rootDir, 'dist/rules', file);
      
      await fs.copyFile(sourcePath, destPath);
      log(`Copied ${file} to dist/rules`, colors.green);
    }
  } catch (error) {
    log(`Error copying rules: ${error.message}`, colors.red);
    process.exit(1);
  }
}

/**
 * Create bin directory and script
 */
async function createBinScript() {
  log('Creating executable bin script', colors.bright);
  
  try {
    // Create bin directory
    await fs.mkdir(path.resolve(rootDir, 'bin'), { recursive: true });
    
    // Create web2md.js script
    const binScript = `#!/usr/bin/env node

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createApp } from '../dist/app.js';

// Calculate root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../dist/rules');

// Create and run app
const app = createApp({ rootDir });
app.run(process.argv).catch(error => {
  console.error(error);
  process.exit(1);
});
`;
    
    await fs.writeFile(path.resolve(rootDir, 'bin/web2md.js'), binScript, 'utf8');
    log('Created bin/web2md.js', colors.green);
  } catch (error) {
    log(`Error creating bin script: ${error.message}`, colors.red);
    process.exit(1);
  }
}

/**
 * Make bin script executable
 */
async function makeExecutable() {
  log('Making bin script executable', colors.bright);
  
  try {
    await fs.chmod(path.resolve(rootDir, 'bin/web2md.js'), 0o755);
    log('Made bin/web2md.js executable', colors.green);
  } catch (error) {
    log(`Error making bin script executable: ${error.message}`, colors.red);
    process.exit(1);
  }
}

/**
 * Main build function
 */
async function build() {
  log('Starting production build', colors.bright + colors.green);
  
  // Prepare the dist directory
  await prepareDistDirectory();
  
  // Run TypeScript compiler
  if (!execute('tsc --project tsconfig.json', 'TypeScript compilation failed')) {
    process.exit(1);
  }
  
  // Copy rules to dist
  await copyRulesToDist();
  
  // Create bin script
  await createBinScript();
  
  // Make bin script executable
  await makeExecutable();
  
  log('Production build completed successfully', colors.bright + colors.green);
}

// Execute build
build().catch(error => {
  log(`Build failed: ${error.message}`, colors.red);
  process.exit(1);
});
