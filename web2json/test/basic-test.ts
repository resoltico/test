/**
 * Basic test script for web2json
 * 
 * This is a simple script to test the functionality of web2json.
 * It converts the example HTML file and compares the output to the expected JSON.
 * 
 * Usage:
 *   pnpm tsx test/basic-test.ts
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertFileToJson } from '../src/index.js';

// Get current directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Define paths to test files
const HTML_TEST_FILE = path.join(__dirname, '../datasets/dataset-comprehensive-html5-demo.html');
const JSON_EXPECTED_FILE = path.join(__dirname, '../datasets/dataset-comprehensive-html5-demo.json');
const OUTPUT_DIR = path.join(__dirname, '../output');

async function runTest() {
  console.log('Running basic web2json test...');
  
  // Make sure output directory exists
  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
  } catch (e) {
    // Ignore if already exists
  }
  
  // Test file conversion
  try {
    console.log(`Converting ${HTML_TEST_FILE}`);
    
    // Convert HTML to JSON
    const result = await convertFileToJson(HTML_TEST_FILE, {
      outputPath: OUTPUT_DIR,
      debug: true
    });
    
    // Read the expected JSON
    const expectedJson = JSON.parse(await fs.readFile(JSON_EXPECTED_FILE, 'utf-8'));
    
    // Basic structure validation
    const document = result.document;
    
    console.log('\nBasic validation:');
    console.log('- Title match:', document.title === expectedJson.title ? 'Yes ✅' : 'No ❌');
    console.log('- Content length match:', document.content.length, 'vs', expectedJson.content.length);
    
    // Save output to a file for manual comparison
    const testOutputPath = path.join(OUTPUT_DIR, 'test-output.json');
    await fs.writeFile(testOutputPath, result.json, 'utf-8');
    
    console.log(`\nTest output saved to ${testOutputPath}`);
    console.log('For detailed comparison, check this file against the expected JSON.');
    
    console.log('\nTest completed!');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

runTest();
