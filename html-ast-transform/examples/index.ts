/**
 * HTML AST Transform Examples
 * 
 * This file provides an entry point to run all examples.
 */

import { performance } from 'node:perf_hooks';

// Example imports
async function importHtmlSanitizer() {
  return import('./html-sanitizer.js');
}

async function importContentExtractor() {
  return import('./content-extractor.js');
}

async function importWebToMarkdown() {
  return import('./web-to-markdown.js');
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('='.repeat(80));
  console.log('HTML AST TRANSFORM EXAMPLES');
  console.log('='.repeat(80));
  
  // Run examples with timing
  await runExample('HTML Sanitizer', importHtmlSanitizer);
  await runExample('Content Extractor', importContentExtractor);
  await runExample('Web to Markdown Converter', importWebToMarkdown);
  
  console.log('='.repeat(80));
  console.log('All examples completed successfully.');
}

/**
 * Run a single example with timing
 */
async function runExample(name: string, importFn: () => Promise<any>) {
  console.log(`\n${'='.repeat(30)}`);
  console.log(`EXAMPLE: ${name}`);
  console.log(`${'='.repeat(30)}\n`);
  
  const startTime = performance.now();
  
  try {
    // Dynamic import of the example
    const example = await importFn();
    
    // Run the example's main function
    await example.main();
    
    const duration = performance.now() - startTime;
    console.log(`\n${name} completed in ${duration.toFixed(2)}ms`);
  } catch (error) {
    console.error(`Error running ${name} example:`, error);
  }
  
  console.log('\n');
}

/**
 * Run a specific example by name
 */
async function runExampleByName(name: string) {
  const examples: Record<string, () => Promise<any>> = {
    'sanitizer': importHtmlSanitizer,
    'extractor': importContentExtractor,
    'markdown': importWebToMarkdown
  };
  
  const importFn = examples[name.toLowerCase()];
  
  if (!importFn) {
    console.error(`Example "${name}" not found. Available examples: sanitizer, extractor, markdown`);
    process.exit(1);
  }
  
  await runExample(name, importFn);
}

// Main execution
if (process.argv.length > 2) {
  // Run specific example
  const exampleName = process.argv[2];
  runExampleByName(exampleName).catch(console.error);
} else {
  // Run all examples
  runAllExamples().catch(console.error);
}
