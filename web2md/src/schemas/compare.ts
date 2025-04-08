import { loadSchema, Schema, Rule } from './index.js';
import chalk from 'chalk';

/**
 * Compares two schemas and outputs differences
 * @param schemaPathA Path to the first schema JSON file
 * @param schemaPathB Path to the second schema JSON file
 */
export async function compareSchemas(schemaPathA: string, schemaPathB: string): Promise<Record<string, any>> {
  const schemaA = await loadSchema(schemaPathA);
  const schemaB = await loadSchema(schemaPathB);
  
  const results = {
    rulesOnlyInA: [] as string[],
    rulesOnlyInB: [] as string[],
    rulesWithDifferentReplacement: [] as string[],
    keepDifferences: {} as Record<string, string[]>,
    removeDifferences: {} as Record<string, string[]>,
    totalRulesA: schemaA.rules.length,
    totalRulesB: schemaB.rules.length
  };
  
  // Create maps for easier comparison
  const rulesMapA = new Map<string, Rule>();
  const rulesMapB = new Map<string, Rule>();
  
  schemaA.rules.forEach(rule => rulesMapA.set(rule.name, rule));
  schemaB.rules.forEach(rule => rulesMapB.set(rule.name, rule));
  
  // Find rules only in A
  for (const ruleName of rulesMapA.keys()) {
    if (!rulesMapB.has(ruleName)) {
      results.rulesOnlyInA.push(ruleName);
    }
  }
  
  // Find rules only in B
  for (const ruleName of rulesMapB.keys()) {
    if (!rulesMapA.has(ruleName)) {
      results.rulesOnlyInB.push(ruleName);
    }
  }
  
  // Find rules with different replacements
  for (const [ruleName, ruleA] of rulesMapA.entries()) {
    const ruleB = rulesMapB.get(ruleName);
    if (ruleB && ruleA.replacement !== ruleB.replacement) {
      results.rulesWithDifferentReplacement.push(ruleName);
    }
  }
  
  // Compare keep and remove arrays
  results.keepDifferences = compareArrays(
    'keep',
    schemaA.keep || [],
    schemaB.keep || []
  );
  
  results.removeDifferences = compareArrays(
    'remove',
    schemaA.remove || [],
    schemaB.remove || []
  );
  
  return results;
}

/**
 * Compares two arrays and returns the differences
 */
function compareArrays(
  name: string,
  arrayA: (string | string[] | string)[],
  arrayB: (string | string[] | string)[]
): Record<string, string[]> {
  const stringifiedA = arrayA.map(item => JSON.stringify(item));
  const stringifiedB = arrayB.map(item => JSON.stringify(item));
  
  return {
    [`${name}OnlyInA`]: stringifiedA.filter(item => !stringifiedB.includes(item)).map(item => JSON.parse(item)),
    [`${name}OnlyInB`]: stringifiedB.filter(item => !stringifiedA.includes(item)).map(item => JSON.parse(item))
  };
}

/**
 * CLI script for comparing schemas
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 2) {
    console.error(chalk.red('Usage: node compare.js <schemaPathA> <schemaPathB>'));
    process.exit(1);
  }
  
  const [schemaPathA, schemaPathB] = args;
  
  try {
    console.log(chalk.blue(`Comparing schemas: ${schemaPathA} vs ${schemaPathB}`));
    const results = await compareSchemas(schemaPathA, schemaPathB);
    
    console.log(chalk.green('\nSchema Comparison Results:'));
    console.log(chalk.yellow(`Schema A has ${results.totalRulesA} rules, Schema B has ${results.totalRulesB} rules`));
    
    if (results.rulesOnlyInA.length > 0) {
      console.log(chalk.magenta('\nRules only in Schema A:'));
      // Fix: Add explicit type annotation to callback parameter
      results.rulesOnlyInA.forEach((rule: string) => console.log(`- ${rule}`));
    }
    
    if (results.rulesOnlyInB.length > 0) {
      console.log(chalk.magenta('\nRules only in Schema B:'));
      // Fix: Add explicit type annotation to callback parameter
      results.rulesOnlyInB.forEach((rule: string) => console.log(`- ${rule}`));
    }
    
    if (results.rulesWithDifferentReplacement.length > 0) {
      console.log(chalk.magenta('\nRules with different replacements:'));
      // Fix: Add explicit type annotation to callback parameter
      results.rulesWithDifferentReplacement.forEach((rule: string) => console.log(`- ${rule}`));
    }
    
    if (results.keepDifferences.keepOnlyInA.length > 0) {
      console.log(chalk.magenta('\nKeep filters only in Schema A:'));
      // Fix: Add explicit type annotation to callback parameter
      results.keepDifferences.keepOnlyInA.forEach((filter: string) => console.log(`- ${filter}`));
    }
    
    if (results.keepDifferences.keepOnlyInB.length > 0) {
      console.log(chalk.magenta('\nKeep filters only in Schema B:'));
      // Fix: Add explicit type annotation to callback parameter
      results.keepDifferences.keepOnlyInB.forEach((filter: string) => console.log(`- ${filter}`));
    }
    
    if (results.removeDifferences.removeOnlyInA.length > 0) {
      console.log(chalk.magenta('\nRemove filters only in Schema A:'));
      // Fix: Add explicit type annotation to callback parameter
      results.removeDifferences.removeOnlyInA.forEach((filter: string) => console.log(`- ${filter}`));
    }
    
    if (results.removeDifferences.removeOnlyInB.length > 0) {
      console.log(chalk.magenta('\nRemove filters only in Schema B:'));
      // Fix: Add explicit type annotation to callback parameter
      results.removeDifferences.removeOnlyInB.forEach((filter: string) => console.log(`- ${filter}`));
    }
    
  } catch (error) {
    console.error(chalk.red('Error comparing schemas:'), error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
