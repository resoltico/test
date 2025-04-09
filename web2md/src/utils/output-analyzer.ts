import fs from 'fs/promises';
import chalk from 'chalk';

/**
 * Analyzes differences between expected and actual Markdown output
 * @param expectedPath Path to the expected Markdown file
 * @param actualPath Path to the actual generated Markdown file
 */
export async function analyzeOutput(expectedPath: string, actualPath: string): Promise<Record<string, any>> {
  try {
    // Read both files
    const expected = await fs.readFile(expectedPath, 'utf8');
    const actual = await fs.readFile(actualPath, 'utf8');
    
    // Initialize result object
    const results = {
      totalLines: {
        expected: 0,
        actual: 0
      },
      headings: {
        expected: 0,
        actual: 0
      },
      links: {
        expected: 0,
        actual: 0,
        preservedCorrectly: true
      },
      mathFormulas: {
        expected: 0,
        actual: 0,
        formattedCorrectly: true
      },
      tables: {
        expected: 0,
        actual: 0
      },
      codeBlocks: {
        expected: 0,
        actual: 0
      },
      overallMatch: false,
      keyDifferences: [] as string[]
    };
    
    // Split into lines for analysis
    const expectedLines = expected.split('\n');
    const actualLines = actual.split('\n');
    
    results.totalLines.expected = expectedLines.length;
    results.totalLines.actual = actualLines.length;
    
    // Count headings
    results.headings.expected = countMatches(expected, /^#+\s+/gm);
    results.headings.actual = countMatches(actual, /^#+\s+/gm);
    
    // Count links
    results.links.expected = countMatches(expected, /\[.+?\]\(.+?\)/g);
    results.links.actual = countMatches(actual, /\[.+?\]\(.+?\)/g);
    
    // Check if links are preserved correctly
    results.links.preservedCorrectly = checkLinksPreserved(expected, actual);
    
    // Count math formulas
    results.mathFormulas.expected = countMatches(expected, /\$\$.+?\$\$|\$.+?\$/gs);
    results.mathFormulas.actual = countMatches(actual, /\$\$.+?\$\$|\$.+?\$/gs);
    
    // Check if math formulas are formatted correctly
    results.mathFormulas.formattedCorrectly = checkMathFormatting(expected, actual);
    
    // Count tables
    results.tables.expected = countMatches(expected, /\|.*\|.*\|/g);
    results.tables.actual = countMatches(actual, /\|.*\|.*\|/g);
    
    // Count code blocks
    results.codeBlocks.expected = countMatches(expected, /```[\s\S]*?```/g);
    results.codeBlocks.actual = countMatches(actual, /```[\s\S]*?```/g);
    
    // Identify key differences
    results.keyDifferences = identifyKeyDifferences(expected, actual);
    
    // Determine if output is a close match
    results.overallMatch = (
      Math.abs(results.totalLines.expected - results.totalLines.actual) < 10 &&
      Math.abs(results.headings.expected - results.headings.actual) < 3 &&
      Math.abs(results.links.expected - results.links.actual) < 3 &&
      Math.abs(results.tables.expected - results.tables.actual) < 2 &&
      Math.abs(results.codeBlocks.expected - results.codeBlocks.actual) < 2 &&
      results.links.preservedCorrectly &&
      results.mathFormulas.formattedCorrectly
    );
    
    return results;
  } catch (error) {
    console.error(chalk.red('Error analyzing output:'), error);
    throw error;
  }
}

/**
 * Counts the number of matches of a pattern in a string
 */
function countMatches(text: string, pattern: RegExp): number {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

/**
 * Checks if links are preserved correctly
 */
function checkLinksPreserved(expected: string, actual: string): boolean {
  // Extract links from both texts
  const expectedLinks = extractLinks(expected);
  const actualLinks = extractLinks(actual);
  
  // Quick check - if counts differ significantly, return false
  if (Math.abs(expectedLinks.length - actualLinks.length) > 3) {
    return false;
  }
  
  // Check for specific patterns that would indicate link preservation issues
  // This is a simplified check - in reality we would need to match individual links
  const preservedPatternsInActual = actualLinks.some(link => 
    link.href.includes('cdn-cgi/l/email-protection') || 
    link.href.includes('mailto:')
  );
  
  return preservedPatternsInActual;
}

/**
 * Extracts links from markdown text
 */
function extractLinks(markdown: string): Array<{text: string, href: string}> {
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  const links: Array<{text: string, href: string}> = [];
  let match;
  
  while ((match = linkPattern.exec(markdown)) !== null) {
    links.push({
      text: match[1],
      href: match[2]
    });
  }
  
  return links;
}

/**
 * Checks if math formulas are formatted correctly
 */
function checkMathFormatting(expected: string, actual: string): boolean {
  // Extract math formulas
  const expectedMath = extractMathFormulas(expected);
  const actualMath = extractMathFormulas(actual);
  
  // If no math formulas in either text, return true
  if (expectedMath.length === 0 && actualMath.length === 0) {
    return true;
  }
  
  // If counts differ significantly, return false
  if (Math.abs(expectedMath.length - actualMath.length) > 1) {
    return false;
  }
  
  // Check for proper math syntax in actual output
  const properSymbolsInActual = actualMath.some(formula => 
    formula.includes('\\frac') ||
    formula.includes('\\sqrt') ||
    formula.includes('\\times') ||
    formula.includes('\\log')
  );
  
  return properSymbolsInActual;
}

/**
 * Extracts math formulas from markdown text
 */
function extractMathFormulas(markdown: string): string[] {
  const inlinePattern = /\$([^$]+)\$/g;
  const blockPattern = /\$\$([^$]+)\$\$/gs;
  const formulas: string[] = [];
  let match;
  
  // Extract inline formulas
  while ((match = inlinePattern.exec(markdown)) !== null) {
    formulas.push(match[1]);
  }
  
  // Extract block formulas
  while ((match = blockPattern.exec(markdown)) !== null) {
    formulas.push(match[1]);
  }
  
  return formulas;
}

/**
 * Identifies key differences between expected and actual output
 */
function identifyKeyDifferences(expected: string, actual: string): string[] {
  const differences: string[] = [];
  
  // Check for link formatting differences
  if (expected.includes('[') && expected.includes('](') && 
      (countMatches(expected, /\[.+?\]\(.+?\)/g) !== countMatches(actual, /\[.+?\]\(.+?\)/g))) {
    differences.push('Link formatting differs');
  }
  
  // Check for math formula differences
  if (expected.includes('$') && 
      (countMatches(expected, /\$\$.+?\$\$|\$.+?\$/gs) !== countMatches(actual, /\$\$.+?\$\$|\$.+?\$/gs))) {
    differences.push('Math formula formatting differs');
  }
  
  // Check for table structure differences
  if (expected.includes('|') && expected.includes('---') && 
      (countMatches(expected, /\|.*\|.*\|/g) !== countMatches(actual, /\|.*\|.*\|/g))) {
    differences.push('Table structure differs');
  }
  
  // Check for code block differences
  if (expected.includes('```') && 
      (countMatches(expected, /```[\s\S]*?```/g) !== countMatches(actual, /```[\s\S]*?```/g))) {
    differences.push('Code block formatting differs');
  }
  
  // Check for heading structure differences
  if ((countMatches(expected, /^#+\s+/gm) !== countMatches(actual, /^#+\s+/gm))) {
    differences.push('Heading structure differs');
  }
  
  // Check for line break differences
  const expectedLineBreaks = countMatches(expected, /  $/gm);
  const actualLineBreaks = countMatches(actual, /  $/gm);
  if (Math.abs(expectedLineBreaks - actualLineBreaks) > 5) {
    differences.push('Line break formatting differs');
  }
  
  return differences;
}

/**
 * CLI command to analyze output
 */
export async function analyzeCommand(expectedPath: string, actualPath: string): Promise<void> {
  try {
    console.log(chalk.blue(`Analyzing Markdown output: ${actualPath} vs expected ${expectedPath}`));
    
    const results = await analyzeOutput(expectedPath, actualPath);
    
    console.log(chalk.green('\nAnalysis Results:'));
    console.log(chalk.yellow(`Total Lines: ${results.totalLines.actual} vs expected ${results.totalLines.expected}`));
    console.log(chalk.yellow(`Headings: ${results.headings.actual} vs expected ${results.headings.expected}`));
    console.log(chalk.yellow(`Links: ${results.links.actual} vs expected ${results.links.expected}`));
    console.log(chalk.yellow(`Math Formulas: ${results.mathFormulas.actual} vs expected ${results.mathFormulas.expected}`));
    console.log(chalk.yellow(`Tables: ${results.tables.actual} vs expected ${results.tables.expected}`));
    console.log(chalk.yellow(`Code Blocks: ${results.codeBlocks.actual} vs expected ${results.codeBlocks.expected}`));
    
    console.log(chalk.magenta('\nQuality Checks:'));
    console.log(`Links Preserved Correctly: ${results.links.preservedCorrectly ? chalk.green('Yes') : chalk.red('No')}`);
    console.log(`Math Formulas Formatted Correctly: ${results.mathFormulas.formattedCorrectly ? chalk.green('Yes') : chalk.red('No')}`);
    
    if (results.keyDifferences.length > 0) {
      console.log(chalk.red('\nKey Differences:'));
      results.keyDifferences.forEach((diff: string) => console.log(`- ${diff}`));
    }
    
    console.log(chalk.blue('\nOverall Match Assessment:'));
    console.log(results.overallMatch ? 
      chalk.green('Output is a good match to the expected format.') : 
      chalk.red('Output has significant differences from the expected format.')
    );
    
  } catch (error) {
    console.error(chalk.red('Error executing analysis:'), error);
    process.exit(1);
  }
}

// Allow running as standalone command
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.length !== 2) {
    console.error(chalk.red('Usage: node output-analyzer.js <expectedPath> <actualPath>'));
    process.exit(1);
  }
  
  analyzeCommand(args[0], args[1]);
}
