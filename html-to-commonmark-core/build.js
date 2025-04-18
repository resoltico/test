#!/usr/bin/env node

import * as esbuild from 'esbuild';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

// Run TypeScript compiler for types
console.log('Running TypeScript compiler for type declarations...');
execSync('tsc --emitDeclarationOnly', { stdio: 'inherit' });

// ESBuild configuration
const commonConfig = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  sourcemap: true,
  external: ['jsdom', 'entities'],
};

// Build ESM version
console.log('Building ESM version...');
await esbuild.build({
  ...commonConfig,
  outfile: 'dist/index.js',
  format: 'esm',
});

// Create package.json for the dist folder
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
const distPkg = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  type: 'module',
  main: 'index.js',
  types: 'index.d.ts',
  author: pkg.author,
  license: pkg.license,
  engines: pkg.engines,
  dependencies: pkg.dependencies,
};

fs.writeFileSync(
  'dist/package.json',
  JSON.stringify(distPkg, null, 2),
  'utf-8'
);

// Copy README and LICENSE to dist
if (fs.existsSync('README.md')) {
  fs.copyFileSync('README.md', 'dist/README.md');
}

if (fs.existsSync('LICENSE')) {
  fs.copyFileSync('LICENSE', 'dist/LICENSE');
}

console.log('Build completed successfully!');
