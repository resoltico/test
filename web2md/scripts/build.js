#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, copyFileSync, readdirSync, chmodSync } from 'node:fs';
import { resolve, join, dirname, relative } from 'node:path';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

/**
 * Log a message with color
 * @param {string} message The message to log
 * @param {string} color The color code
 */
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Execute a command
 * @param {string} command The command to execute
 * @param {string} errorMessage The error message to display on failure
 * @returns {boolean} Whether the command succeeded
 */
function execute(command, errorMessage) {
  try {
    log(`Executing: ${command}`, colors.dim);
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    log(errorMessage, colors.red);
    log(error.message, colors.red);
    return false;
  }
}

/**
 * Prepare the dist directory
 */
function prepareDistDirectory() {
  log('Preparing dist directory', colors.bright);
  
  // Create dist directory if it doesn't exist
  if (!existsSync('dist')) {
    mkdirSync('dist');
    log('Created dist directory', colors.green);
  }
  
  // Clean up existing files
  execute('rm -rf dist/*', 'Failed to clean dist directory');
}

/**
 * Copy rules to dist directory
 */
function copyRulesToDist() {
  log('Copying rules to distribution', colors.bright);
  
  // Define the built-in rules registry (static mapping)
  const BUILT_IN_RULES_REGISTRY = {
    'common-elements': 'common-elements.yaml',
    'text-formatting': 'text-formatting.yaml',
    'text-links': 'text-links.yaml',
    'media-images': 'media-images.yaml',
    'tables': 'tables.yaml',
    'code-blocks': 'code-blocks.yaml',
    'deobfuscation': 'deobfuscation.yaml',
    'math': 'math.js'
  };
  
  // Create rules directory in dist
  const distRulesDir = resolve('dist/rules');
  if (!existsSync(distRulesDir)) {
    mkdirSync(distRulesDir, { recursive: true });
  }
  
  // Copy each rule file explicitly
  Object.values(BUILT_IN_RULES_REGISTRY).forEach(ruleFile => {
    const sourcePath = resolve('rules', ruleFile);
    const destPath = resolve(distRulesDir, ruleFile);
    
    // Create directory if it doesn't exist
    const destDir = dirname(destPath);
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true });
    }
    
    try {
      copyFileSync(sourcePath, destPath);
      log(`Copied ${ruleFile} to dist/rules/`, colors.green);
    } catch (error) {
      log(`Failed to copy ${ruleFile}: ${error.message}`, colors.red);
    }
  });
}

/**
 * Copy type definitions to dist
 */
function copyTypeDefinitions() {
  log('Copying vendor type definitions', colors.bright);
  
  // Create vendor types directory in dist
  const sourceVendorTypesDir = resolve('src/types/vendor');
  const distVendorTypesDir = resolve('dist/types/vendor');
  
  if (!existsSync(distVendorTypesDir)) {
    mkdirSync(distVendorTypesDir, { recursive: true });
  }
  
  try {
    // Read all .d.ts files in vendor directory
    const typeFiles = readdirSync(sourceVendorTypesDir)
      .filter(file => file.endsWith('.d.ts'));
      
    // Copy each type definition file
    typeFiles.forEach(file => {
      const sourcePath = resolve(sourceVendorTypesDir, file);
      const destPath = resolve(distVendorTypesDir, file);
      
      copyFileSync(sourcePath, destPath);
      log(`Copied ${file} to dist/types/vendor/`, colors.green);
    });
    
    // Also copy the index.ts file
    if (existsSync(resolve(sourceVendorTypesDir, 'index.ts'))) {
      copyFileSync(
        resolve(sourceVendorTypesDir, 'index.ts'),
        resolve(distVendorTypesDir, 'index.js')
      );
      log('Copied vendor index.ts to dist/types/vendor/index.js', colors.green);
    }
  } catch (error) {
    log(`Failed to copy type definitions: ${error.message}`, colors.red);
  }
  
  // Ensure math module directory exists in dist
  const mathModuleDir = resolve('dist/modules/math');
  if (!existsSync(mathModuleDir)) {
    mkdirSync(mathModuleDir, { recursive: true });
    log(`Created math module directory: ${mathModuleDir}`, colors.green);
  }
}

/**
 * Make the bin script executable
 */
function makeExecutable() {
  log('Making bin script executable', colors.bright);
  
  const binDir = resolve('bin');
  if (!existsSync(binDir)) {
    mkdirSync(binDir, { recursive: true });
  }
  
  const binPath = resolve('bin/web2md.js');
  try {
    chmodSync(binPath, '755');
    log(`Made ${binPath} executable`, colors.green);
  } catch (error) {
    log(`Failed to make ${binPath} executable: ${error.message}`, colors.red);
  }
}

/**
 * Build the project
 */
async function build() {
  log('Starting production build', colors.bright + colors.green);
  
  // Prepare the dist directory
  prepareDistDirectory();
  
  // Run TypeScript compiler
  if (!execute('tsc --project tsconfig.json', 'TypeScript compilation failed')) {
    process.exit(1);
  }
  
  // Copy rules to dist
  copyRulesToDist();
  
  // Copy type definitions
  copyTypeDefinitions();
  
  // Make bin script executable
  makeExecutable();
  
  log('Production build completed successfully', colors.bright + colors.green);
}

// Run the build
build().catch(error => {
  log(`Build failed: ${error.message}`, colors.red);
  process.exit(1);
});