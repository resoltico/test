/**
 * Script to build example files
 */

import { execSync } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '..');
const examplesDir = join(rootDir, 'examples');
const examplesConfigPath = join(rootDir, 'tsconfig.examples.json');

// Check if examples directory exists
if (!existsSync(examplesDir)) {
  console.log('No examples directory found, skipping examples build');
  process.exit(0);
}

// Create examples tsconfig
const examplesConfig = {
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "rootDir": ".",
    "outDir": "dist",
    "declaration": false
  },
  "include": ["examples/**/*"],
  "exclude": ["node_modules", "dist", "src"]
};

console.log('Creating examples TypeScript configuration...');
writeFileSync(examplesConfigPath, JSON.stringify(examplesConfig, null, 2));

// Compile examples
console.log('\nCompiling examples...');
try {
  execSync('npx tsc --project tsconfig.examples.json', {
    cwd: rootDir,
    stdio: 'inherit'
  });
  console.log('Successfully compiled examples');
} catch (error) {
  console.error('Failed to compile examples, but continuing');
  // We don't exit with an error code since example compilation is optional
}

console.log('\nExamples build completed!');
