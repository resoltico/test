import fs from 'node:fs/promises';
import path from 'node:path';
import { fileExists } from './utils.js';

/**
 * Schema presets for HTML to Markdown conversion
 */
export const SCHEMA_PRESETS = {
  // Default schema - prioritizes content over structure
  standard: {
    preserveStructure: false,
    flattenContainers: true,
    handleSpecialElements: true,
    cleanupOutput: true
  },
  
  // Structured schema - preserves HTML structure with comments
  structured: {
    preserveStructure: true,
    flattenContainers: false,
    handleSpecialElements: true,
    cleanupOutput: true
  },
  
  // Clean schema - minimal formatting with focus on readability
  clean: {
    preserveStructure: false,
    flattenContainers: true,
    handleSpecialElements: false,
    cleanupOutput: true
  }
};

/**
 * Loads a conversion schema from a preset or custom file
 * @param {string} schemaName - The schema preset name or 'custom'
 * @param {string} [schemaFile] - Path to custom schema file (required if schemaName is 'custom')
 * @returns {Promise<object>} - The loaded schema configuration
 * @throws {Error} - If the schema preset is not found or the custom file cannot be loaded
 */
export async function loadSchema(schemaName = 'standard', schemaFile = null) {
  // If using a preset schema, return it directly
  if (schemaName !== 'custom' && SCHEMA_PRESETS[schemaName]) {
    return SCHEMA_PRESETS[schemaName];
  }
  
  // If using a custom schema, load it from file
  if (schemaName === 'custom' && schemaFile) {
    // Check if file exists
    if (!(await fileExists(schemaFile))) {
      throw new Error(`Schema file not found: ${schemaFile}`);
    }
    
    try {
      // Read and parse the schema file
      const schemaContent = await fs.readFile(schemaFile, 'utf-8');
      const customSchema = JSON.parse(schemaContent);
      
      // Validate the custom schema
      validateCustomSchema(customSchema);
      
      // Process any function strings in the schema
      return processCustomSchema(customSchema);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in schema file: ${error.message}`);
      }
      throw new Error(`Failed to load schema file: ${error.message}`);
    }
  }
  
  // If schemaName is not a valid preset and not 'custom', fall back to standard
  if (schemaName !== 'custom') {
    console.warn(`Schema preset "${schemaName}" not found, using "standard" instead.`);
    return SCHEMA_PRESETS.standard;
  }
  
  throw new Error('Custom schema requires a schema file (--schema-file)');
}

/**
 * Validates a custom schema configuration
 * @param {object} schema - The schema configuration to validate
 * @throws {Error} - If the schema is invalid
 */
function validateCustomSchema(schema) {
  // Check if schema is an object
  if (typeof schema !== 'object' || schema === null) {
    throw new Error('Schema must be an object');
  }
  
  // Check for required properties
  const requiredProperties = ['preserveStructure', 'flattenContainers', 'handleSpecialElements'];
  for (const prop of requiredProperties) {
    if (typeof schema[prop] === 'undefined') {
      throw new Error(`Schema missing required property: ${prop}`);
    }
  }
  
  // If elementRules is present, validate it
  if (schema.elementRules && typeof schema.elementRules !== 'object') {
    throw new Error('elementRules must be an object');
  }
  
  // Check that elementRules entries have filter and replacement
  if (schema.elementRules) {
    for (const [element, rule] of Object.entries(schema.elementRules)) {
      if (!rule.filter) {
        throw new Error(`Rule for "${element}" missing required property: filter`);
      }
      if (!rule.replacement) {
        throw new Error(`Rule for "${element}" missing required property: replacement`);
      }
    }
  }
}

/**
 * Processes a custom schema to convert function strings into actual functions
 * @param {object} schema - The schema configuration to process
 * @returns {object} - The processed schema
 */
function processCustomSchema(schema) {
  const processedSchema = { ...schema };
  
  // Process element rules
  if (schema.elementRules) {
    processedSchema.customElementRules = {};
    
    for (const [element, rule] of Object.entries(schema.elementRules)) {
      const processedRule = { ...rule };
      
      // If replacement is a string, try to convert it to a function
      if (typeof rule.replacement === 'string' && rule.replacement.startsWith('function')) {
        try {
          // Use Function constructor to convert string to function
          // This is safe in this context since we're evaluating user-provided schemas
          processedRule.replacement = new Function('content', 'node', 'options',
            `return (${rule.replacement}).apply(this, arguments);`
          );
        } catch (error) {
          console.warn(`Failed to parse function for "${element}" rule: ${error.message}`);
          // If parsing fails, provide a fallback function
          processedRule.replacement = (content) => content;
        }
      }
      
      processedSchema.customElementRules[element] = processedRule;
    }
    
    // Remove the original elementRules to avoid confusion
    delete processedSchema.elementRules;
  }
  
  return processedSchema;
}

/**
 * Creates a default schema file at the specified path
 * @param {string} outputPath - The path to save the default schema
 * @returns {Promise<void>}
 */
export async function createDefaultSchemaFile(outputPath) {
  const defaultSchema = {
    preserveStructure: false,
    flattenContainers: true,
    handleSpecialElements: true,
    cleanupOutput: true,
    elementRules: {
      // Example custom rule
      "custom-element": {
        filter: "custom-element",
        replacement: "function(content, node) { return '**Custom Element:** ' + content; }"
      }
    }
  };
  
  try {
    await fs.writeFile(
      outputPath,
      JSON.stringify(defaultSchema, null, 2),
      'utf-8'
    );
    console.log(`Default schema created at: ${outputPath}`);
  } catch (error) {
    throw new Error(`Failed to create default schema: ${error.message}`);
  }
}
