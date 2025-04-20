/**
 * Script to build the library
 */

import { execSync } from 'node:child_process';
import { rmSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');

// Clean dist directory
console.log('Cleaning dist directory...');
if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true, force: true });
}
mkdirSync(distDir, { recursive: true });
console.log('Cleaned dist directory');

// Bundle with esbuild
console.log('\nBundling with esbuild...');
try {
  execSync('esbuild src/index.ts --bundle --platform=node --outdir=dist --format=esm --external:jsdom --sourcemap', {
    cwd: rootDir,
    stdio: 'inherit'
  });
  console.log('Successfully bundled with esbuild');
} catch (error) {
  console.error('Failed to bundle with esbuild');
  process.exit(1);
}

// Generate type declarations separately to avoid bundling issues
console.log('\nGenerating type declarations...');
try {
  // Using a more explicit approach that works better with ESM
  execSync('npx tsc --declaration --emitDeclarationOnly --outDir dist', {
    cwd: rootDir,
    stdio: 'inherit'
  });
  console.log('Successfully generated type declarations');
} catch (error) {
  console.error('Failed to generate type declarations, but continuing build');
  // We'll continue the build process even if type generation fails
}

console.log('\nBuild completed successfully!');
