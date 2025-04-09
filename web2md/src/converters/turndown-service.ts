import TurndownService from 'turndown';
import { JSDOM } from 'jsdom';
import { Schema } from '../schemas/index.js';
import { processMathML } from './mathml-processor.js';

/**
 * Creates a configured TurndownService instance
 * @param schema Optional conversion schema to customize the conversion
 * @returns A configured TurndownService instance
 */
export function createTurndownService(schema?: Schema): TurndownService {
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    strongDelimiter: '**',
    bulletListMarker: '-',
    linkStyle: 'inlined'
  });

  // Add default rules for better Markdown output
  turndownService.addRule('strikethrough', {
    // Fix: Add type assertion for HTML elements that don't match standard HTML element map
    filter: ['del', 's', 'strike'] as unknown as TurndownService.Filter,
    replacement: (content) => `~~${content}~~`
  });

  // Add rule for ruby elements
  turndownService.addRule('ruby', {
    filter: ['ruby'],
    replacement: (content, node) => {
      const rubyNode = node as HTMLElement;
      const rt = rubyNode.querySelector('rt');
      if (rt) {
        const baseText = content.replace(rt.textContent || '', '').trim();
        return `${baseText} (${rt.textContent})`;
      }
      return content;
    }
  });

  // Add rule for math content
  turndownService.addRule('markdown-math', {
    filter: (node) => 
      node.nodeName === 'SPAN' && 
      node.classList.contains('markdown-math'),
    replacement: (content) => content
  });

  // Add rule for abbr elements
  turndownService.addRule('abbr', {
    filter: ['abbr'],
    replacement: (content, node) => {
      const title = (node as HTMLElement).getAttribute('title');
      return title ? `${content} (${title})` : content;
    }
  });

  // Add rule for mark elements
  turndownService.addRule('mark', {
    filter: ['mark'],
    replacement: (content) => `**${content}**`
  });

  // Add rule for kbd elements
  turndownService.addRule('kbd', {
    filter: ['kbd'],
    replacement: (content) => `\`${content}\``
  });

  // Add rule for table conversion
  turndownService.addRule('table', {
    filter: 'table',
    replacement: function (content, node) {
      const tableNode = node as HTMLTableElement;
      const headerRow = tableNode.querySelector('thead tr');
      const rows = Array.from(tableNode.querySelectorAll('tbody tr'));
      let markdown = '\n\n';

      if (headerRow) {
        const headerCells = Array.from(headerRow.querySelectorAll('th'));
        const headers = headerCells.map(cell => cell.textContent?.trim() || '');
        const separator = headers.map(() => '---');
        
        markdown += `| ${headers.join(' | ')} |\n| ${separator.join(' | ')} |\n`;
      }

      rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        const cellContents = cells.map(cell => cell.textContent?.trim() || '');
        markdown += `| ${cellContents.join(' | ')} |\n`;
      });

      // Add caption or footer if present
      const tfoot = tableNode.querySelector('tfoot');
      if (tfoot) {
        markdown += `\n*${tfoot.textContent?.trim() || ''}*\n`;
      }

      return markdown;
    }
  });

  // Apply schema rules if provided
  if (schema) {
    applySchemaRules(turndownService, schema);
  }

  return turndownService;
}

/**
 * Preprocesses HTML content before conversion
 * @param html The HTML content to preprocess
 * @returns The preprocessed HTML content
 */
export async function preprocessHtml(html: string): Promise<string> {
  try {
    // Process MathML elements
    const processedHtml = await processMathML(html);
    
    // Add any additional preprocessing here
    
    return processedHtml;
  } catch (error) {
    console.error('Error during HTML preprocessing:', error);
    // If preprocessing fails, return the original HTML
    return html;
  }
}

/**
 * Applies custom schema rules to a TurndownService instance
 * @param turndownService The TurndownService instance to configure
 * @param schema The schema containing custom rules
 */
function applySchemaRules(turndownService: TurndownService, schema: Schema): void {
  // Apply custom rules
  for (const rule of schema.rules) {
    let filter: TurndownService.Filter;
    
    // Process filter
    if (typeof rule.filter === 'string') {
      if (rule.filter.startsWith('function') || rule.filter.startsWith('(')) {
        // Convert string function to actual function
        filter = new Function('node', 'options', `return (${rule.filter})(node, options)`) as TurndownService.Filter;
      } else {
        filter = rule.filter as TurndownService.Filter;
      }
    } else {
      filter = rule.filter as TurndownService.Filter;
    }
    
    // Process replacement function
    let replacementFunc: TurndownService.ReplacementFunction;
    if (typeof rule.replacement === 'string' && (rule.replacement.startsWith('function') || rule.replacement.startsWith('('))) {
      replacementFunc = new Function('content', 'node', 'options', `return (${rule.replacement})(content, node, options)`) as TurndownService.ReplacementFunction;
    } else {
      throw new Error(`Invalid replacement function in rule ${rule.name}`);
    }
    
    // Add the rule
    turndownService.addRule(rule.name, {
      filter, // Fixed: properly typed as TurndownService.Filter
      replacement: replacementFunc
    });
  }

  // Apply keep filters
  if (schema.keep && schema.keep.length > 0) {
    for (const filter of schema.keep) {
      // Fix: Add type assertion for keep method
      turndownService.keep(filter as TurndownService.Filter);
    }
  }

  // Apply remove filters
  if (schema.remove && schema.remove.length > 0) {
    for (const filter of schema.remove) {
      // Fix: Add type assertion for remove method
      turndownService.remove(filter as TurndownService.Filter);
    }
  }
}
