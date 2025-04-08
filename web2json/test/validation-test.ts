/**
 * Validation test for web2json
 * 
 * This test compares the output of our parser with the expected JSON structure
 * from the example files.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertFileToJson } from '../src/index.js';
import chalk from 'chalk';

// Get current directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Define paths to test files
const HTML_TEST_FILE = path.join(__dirname, '../datasets/dataset-comprehensive-html5-demo.html');
const JSON_EXPECTED_FILE = path.join(__dirname, '../datasets/dataset-comprehensive-html5-demo.json');
const OUTPUT_DIR = path.join(__dirname, '../output');

/**
 * Recursively compares two objects and returns a detailed report of differences
 */
function compareObjects(actual: any, expected: any, path = ''): string[] {
  const differences: string[] = [];
  
  // Check if one is an object and the other isn't
  if (typeof actual !== typeof expected) {
    differences.push(`${path}: Type mismatch - actual: ${typeof actual}, expected: ${typeof expected}`);
    return differences;
  }
  
  // If both are arrays
  if (Array.isArray(actual) && Array.isArray(expected)) {
    // Check array length
    if (actual.length !== expected.length) {
      differences.push(`${path}: Array length mismatch - actual: ${actual.length}, expected: ${expected.length}`);
    }
    
    // Compare array elements (up to the shorter length)
    const minLength = Math.min(actual.length, expected.length);
    for (let i = 0; i < minLength; i++) {
      differences.push(...compareObjects(actual[i], expected[i], `${path}[${i}]`));
    }
    
    return differences;
  }
  
  // If both are objects (but not arrays)
  if (typeof actual === 'object' && actual !== null && 
      typeof expected === 'object' && expected !== null) {
    
    // Check if one is an array and the other isn't
    if (Array.isArray(actual) !== Array.isArray(expected)) {
      differences.push(`${path}: Type mismatch - actual: ${Array.isArray(actual) ? 'array' : 'object'}, expected: ${Array.isArray(expected) ? 'array' : 'object'}`);
      return differences;
    }
    
    // Check all keys in expected
    for (const key of Object.keys(expected)) {
      const newPath = path ? `${path}.${key}` : key;
      
      if (!(key in actual)) {
        differences.push(`${newPath}: Missing key in actual`);
      } else {
        differences.push(...compareObjects(actual[key], expected[key], newPath));
      }
    }
    
    // Check for extra keys in actual
    for (const key of Object.keys(actual)) {
      const newPath = path ? `${path}.${key}` : key;
      
      if (!(key in expected)) {
        differences.push(`${newPath}: Extra key in actual`);
      }
    }
    
    return differences;
  }
  
  // If both are primitive values
  if (actual !== expected) {
    // Only report string content differences if they're significantly different
    if (typeof actual === 'string' && typeof expected === 'string') {
      if (actual.length > 100 || expected.length > 100) {
        differences.push(`${path}: Long string content differs - lengths: ${actual.length} vs ${expected.length}`);
      } else {
        differences.push(`${path}: Value mismatch - actual: ${actual}, expected: ${expected}`);
      }
    } else {
      differences.push(`${path}: Value mismatch - actual: ${actual}, expected: ${expected}`);
    }
  }
  
  return differences;
}

/**
 * Validate top-level structure of the document
 */
function validateTopLevelStructure(actual: any, expected: any): string[] {
  const problems: string[] = [];
  
  // Check title
  if (actual.title !== expected.title) {
    problems.push(`Title mismatch: actual "${actual.title}", expected "${expected.title}"`);
  }
  
  // Check content array
  if (!Array.isArray(actual.content)) {
    problems.push(`content is not an array in the actual output`);
  } else if (!Array.isArray(expected.content)) {
    problems.push(`content is not an array in the expected output`);
  } else if (actual.content.length !== expected.content.length) {
    problems.push(`content array length mismatch: actual ${actual.content.length}, expected ${expected.content.length}`);
  }
  
  return problems;
}

/**
 * Run the validation test
 */
async function runValidationTest() {
  console.log(chalk.cyan('🧪 Running web2json validation test...'));
  console.log(chalk.gray('Comparing parser output against expected JSON structure\n'));
  
  try {
    // Ensure output directory exists
    try {
      await fs.mkdir(OUTPUT_DIR, { recursive: true });
    } catch (e) {
      // Ignore if already exists
    }
    
    console.log(chalk.gray(`📄 Input HTML file: ${HTML_TEST_FILE}`));
    console.log(chalk.gray(`📄 Expected JSON: ${JSON_EXPECTED_FILE}`));
    
    // Convert HTML to JSON using our parser
    const result = await convertFileToJson(HTML_TEST_FILE, {
      outputPath: path.join(OUTPUT_DIR, 'validation-test-output.json'),
      debug: true
    });
    
    // Load the expected JSON for comparison
    const expectedJson = JSON.parse(await fs.readFile(JSON_EXPECTED_FILE, 'utf-8'));
    
    // Validate top-level structure
    const topLevelProblems = validateTopLevelStructure(result.document, expectedJson);
    
    if (topLevelProblems.length > 0) {
      console.log(chalk.yellow('\n⚠️ Top-level structure issues:'));
      topLevelProblems.forEach(issue => console.log(chalk.yellow(`  - ${issue}`)));
    } else {
      console.log(chalk.green('\n✅ Top-level structure matches'));
    }
    
    // Compare the detailed structure
    const differences = compareObjects(result.document, expectedJson);
    
    if (differences.length === 0) {
      console.log(chalk.green('\n✅ Perfect match! JSON structures are identical'));
    } else {
      // Group differences by path prefix for better readability
      const groupedDifferences: Record<string, string[]> = {};
      differences.forEach(diff => {
        const path = diff.split(':')[0].split('.')[0];
        if (!groupedDifferences[path]) {
          groupedDifferences[path] = [];
        }
        groupedDifferences[path].push(diff);
      });
      
      console.log(chalk.yellow(`\n⚠️ Found ${differences.length} differences between actual and expected JSON structures:`));
      
      // Show up to 20 differences per group
      Object.entries(groupedDifferences).forEach(([path, diffs]) => {
        console.log(chalk.yellow(`\n${path} (${diffs.length} issues):`));
        diffs.slice(0, 20).forEach(diff => {
          console.log(chalk.gray(`  - ${diff}`));
        });
        if (diffs.length > 20) {
          console.log(chalk.gray(`  ... and ${diffs.length - 20} more differences in this group`));
        }
      });
      
      // Write differences to a file for easier review
      const differencesFile = path.join(OUTPUT_DIR, 'validation-differences.txt');
      await fs.writeFile(differencesFile, differences.join('\n'), 'utf-8');
      console.log(chalk.gray(`\nAll differences written to: ${differencesFile}`));
      
      console.log(chalk.yellow('\n⚠️ Validation completed with differences detected'));
    }
    
    console.log(chalk.green('\n✨ Test output saved to:'), chalk.cyan(result.outputPath));
    
  } catch (error) {
    console.error(chalk.red('\n❌ Test failed:'), error);
    process.exit(1);
  }
}

// Run the test
runValidationTest();