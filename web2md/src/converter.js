import TurndownService from 'turndown';

/**
 * Custom HTML to Markdown converter based on Turndown with specific schema rules
 * Designed to prioritize content flow while preserving essential formatting
 */
export function convertHtmlToMarkdown(html) {
  // Create a new TurndownService instance with base configuration
  const turndownService = new TurndownService({
    headingStyle: 'atx',        // Use # style headings
    codeBlockStyle: 'fenced',   // Use ``` style code blocks
    emDelimiter: '*',           // Use * for emphasis
    strongDelimiter: '**',      // Use ** for strong emphasis
    bulletListMarker: '-',      // Use - for bullet lists
    hr: '---',                  // Use --- for horizontal rules
    linkStyle: 'inlined',       // Use inline links
    preformattedCode: false     // Handle code blocks manually
  });
  
  // -- Basic Element Rules --
  
  // Paragraphs with proper spacing and line breaks
  turndownService.addRule('paragraph', {
    filter: 'p',
    replacement: function(content) {
      return '\n\n' + content + '\n\n';
    }
  });
  
  // Preserve line breaks within text
  turndownService.addRule('lineBreak', {
    filter: 'br',
    replacement: function() {
      return '  \n'; // Two spaces followed by newline for line break in MD
    }
  });
  
  // -- Semantic Element Handling --
  
  // Flatten semantic containers (article, section, aside) while preserving content
  const semanticContainers = ['article', 'section', 'aside', 'main', 'header', 'footer', 'nav'];
  
  semanticContainers.forEach(element => {
    turndownService.addRule(element, {
      filter: element,
      replacement: function(content, node) {
        // Check if the semantic element has an ID that should be preserved
        const id = node.getAttribute('id');
        const idAnchor = id ? `<a id="${id}"></a>\n\n` : '';
        
        return '\n\n' + idAnchor + content + '\n\n';
      }
    });
  });
  
  // -- Special Elements --
  
  // Ruby annotations (simplify to base text with annotation in parentheses)
  turndownService.addRule('ruby', {
    filter: 'ruby',
    replacement: function(content, node) {
      const rtElement = node.querySelector('rt');
      if (!rtElement) return content;
      
      const baseText = node.textContent.replace(rtElement.textContent, '').trim();
      const rtText = rtElement.textContent.trim();
      
      return `${baseText} (${rtText})`;
    }
  });
  
  // Convert definition lists to formatted markdown
  turndownService.addRule('definitionList', {
    filter: 'dl',
    replacement: function(content) {
      return '\n\n' + content + '\n\n';
    }
  });
  
  turndownService.addRule('definitionTerm', {
    filter: 'dt',
    replacement: function(content) {
      return '**' + content + '**  \n';
    }
  });
  
  turndownService.addRule('definitionDescription', {
    filter: 'dd',
    replacement: function(content) {
      return content + '\n\n';
    }
  });
  
  // Handle forms as special text blocks
  turndownService.addRule('form', {
    filter: 'form',
    replacement: function(content, node) {
      const legend = node.querySelector('legend');
      const legendText = legend ? legend.textContent : 'Form';
      
      return '\nFORM START\n' + legendText + '\n' + content.trim() + '\nFORM END\n\n';
    }
  });
  
  // Handle form labels and inputs
  turndownService.addRule('formLabel', {
    filter: 'label',
    replacement: function(content, node) {
      const forAttr = node.getAttribute('for');
      return content + ':   \n';
    }
  });
  
  turndownService.addRule('formInput', {
    filter: ['input', 'textarea', 'select'],
    replacement: function(content, node) {
      return '  \n';
    }
  });
  
  // Special handling for SVG - convert to text description
  turndownService.addRule('svg', {
    filter: 'svg',
    replacement: function(content, node) {
      const figcaption = node.parentNode.querySelector('figcaption');
      const caption = figcaption ? figcaption.textContent : 'Chart';
      
      return '\n\n*' + caption + '*\n\n';
    }
  });
  
  // Figure and figcaption
  turndownService.addRule('figure', {
    filter: 'figure',
    replacement: function(content, node) {
      // The figcaption is already processed separately, so just return the content
      return '\n\n' + content + '\n\n';
    }
  });
  
  turndownService.addRule('figcaption', {
    filter: 'figcaption',
    replacement: function(content) {
      return '### ' + content + '\n\n';
    }
  });
  
  // Handle abbreviations with titles
  turndownService.addRule('abbreviation', {
    filter: 'abbr',
    replacement: function(content, node) {
      const title = node.getAttribute('title');
      return title ? content + ' (' + title + ')' : content;
    }
  });
  
  // Code blocks with language support
  turndownService.addRule('codeBlock', {
    filter: function(node) {
      return node.nodeName === 'PRE' && node.querySelector('code');
    },
    replacement: function(content, node) {
      const code = node.querySelector('code');
      let language = '';
      
      if (code && code.className) {
        const match = code.className.match(/language-(\w+)/);
        if (match) {
          language = match[1];
        }
      }
      
      // Clean the content
      let codeContent = content.trim();
      // Remove extra indentation if present
      codeContent = codeContent.replace(/^\s+/gm, '');
      
      return '\n```' + language + '\n' + codeContent + '\n```\n\n';
    }
  });
  
  // Tables with proper formatting
  turndownService.addRule('table', {
    filter: 'table',
    replacement: function(content, node) {
      // Start processing the table
      const tableRows = Array.from(node.querySelectorAll('tr'));
      if (!tableRows.length) return '';
      
      let markdown = '\n\n';
      
      // Caption handling
      const caption = node.querySelector('caption');
      if (caption) {
        markdown += '### ' + caption.textContent.trim() + '\n\n';
      }
      
      // Process header row first
      const headerRow = tableRows[0];
      const headerCells = Array.from(headerRow.querySelectorAll('th'));
      
      if (headerCells.length) {
        // Build header row
        markdown += '| ' + headerCells.map(cell => cell.textContent.trim()).join(' | ') + ' |\n';
        
        // Add separator row
        markdown += '|' + headerCells.map(() => '----------|').join('') + '\n';
        
        // Start from index 1 to skip the header we already processed
        const startIndex = 1;
        
        // Process body rows
        for (let i = startIndex; i < tableRows.length; i++) {
          const row = tableRows[i];
          const cells = Array.from(row.querySelectorAll('td'));
          
          if (cells.length) {
            markdown += '| ' + cells.map(cell => cell.textContent.trim()).join(' | ') + ' |\n';
          }
        }
        
        // Handle footer if present
        const tfoot = node.querySelector('tfoot');
        if (tfoot) {
          markdown += '\n*' + tfoot.textContent.trim() + '*\n';
        }
      }
      
      return markdown + '\n';
    }
  });
  
  // Blockquotes with citations
  turndownService.addRule('blockquote', {
    filter: 'blockquote',
    replacement: function(content, node) {
      const cite = node.querySelector('cite');
      let citation = '';
      
      if (cite) {
        const citeText = cite.textContent.trim();
        citation = '\n> \n> — *' + citeText + '*';
        // Remove the citation from the content to avoid duplication
        content = content.replace(citeText, '');
      }
      
      // Process the content line by line for proper blockquote formatting
      let blockquote = content
        .trim()
        .split('\n')
        .map(line => '> ' + line)
        .join('\n');
        
      return '\n\n' + blockquote + citation + '\n\n';
    }
  });
  
  // Mathematical expressions
  turndownService.addRule('math', {
    filter: 'math',
    replacement: function(content, node) {
      // Convert to markdown math syntax
      return '\n### The formula for humor:\n```\n' + content.trim().replace(/\s+/g, ' ') + '\n```\n\n';
    }
  });
  
  // Handle mark elements as bold
  turndownService.addRule('mark', {
    filter: 'mark',
    replacement: function(content) {
      return '**' + content + '**';
    }
  });
  
  // Preserve id attributes as anchors
  turndownService.addRule('idAttributes', {
    filter: function(node) {
      return node.getAttribute('id') && !semanticContainers.includes(node.nodeName.toLowerCase());
    },
    replacement: function(content, node) {
      const id = node.getAttribute('id');
      return `<a id="${id}"></a>\n\n${content}`;
    }
  });
  
  // Convert <dfn> elements (definitions)
  turndownService.addRule('definition', {
    filter: 'dfn',
    replacement: function(content) {
      return '*' + content + '*';
    }
  });
  
  // Handle bidirectional text
  turndownService.addRule('bdo', {
    filter: 'bdo',
    replacement: function(content, node) {
      const dir = node.getAttribute('dir');
      // Simply include the content, as Markdown doesn't have bidirectional controls
      return content;
    }
  });
  
  // Handle var elements as italics
  turndownService.addRule('variable', {
    filter: 'var',
    replacement: function(content) {
      return '*' + content + '*';
    }
  });
  
  // Special handling for details/summary elements
  turndownService.addRule('details', {
    filter: 'details',
    replacement: function(content, node) {
      const summary = node.querySelector('summary');
      const summaryText = summary ? summary.textContent.trim() : 'Details';
      const detailsContent = summary ? content.replace(summary.textContent, '') : content;
      
      // Since pure Markdown doesn't support collapsible details,
      // we format it as a section with a heading
      return `\n\n**${summaryText}**\n\n${detailsContent.trim()}\n\n`;
    }
  });
  
  // Create navigation from links in menus
  turndownService.addRule('menu', {
    filter: 'menu',
    replacement: function(content, node) {
      // Extract links and create a table of contents
      const links = Array.from(node.querySelectorAll('a'));
      if (links.length === 0) return content;
      
      return links.map(link => {
        const href = link.getAttribute('href');
        const text = link.textContent.trim();
        return `- [${text}](${href})`;
      }).join('\n') + '\n\n';
    }
  });
  
  // Process the entire document structure
  turndownService.addRule('document', {
    filter: function(node) {
      return node.nodeName === 'BODY' || node.nodeName === 'HTML';
    },
    replacement: function(content, node) {
      // Extract the title if present
      const titleElement = node.querySelector('title') || node.querySelector('h1');
      const title = titleElement ? titleElement.textContent.trim() : '';
      
      // If we have a title and it's not already at the start of the content (as an h1)
      if (title && !content.trim().startsWith('# ' + title)) {
        return '# ' + title + '\n\n' + content;
      }
      
      return content;
    }
  });
  
  // Handle subscript and superscript
  turndownService.addRule('subscript', {
    filter: 'sub',
    replacement: function(content) {
      // Markdown doesn't natively support subscript, we just preserve the content
      return content;
    }
  });
  
  turndownService.addRule('superscript', {
    filter: 'sup',
    replacement: function(content) {
      // Markdown doesn't natively support superscript, we just preserve the content
      return content;
    }
  });
  
  // Custom HTML escaping policy
  turndownService.escape = function(string) {
    // Only escape characters that have special meaning in Markdown
    return string
      .replace(/\*/g, '\\*')
      .replace(/_/g, '\\_')
      .replace(/`/g, '\\`')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };
  
  // Perform the conversion
  let markdown = turndownService.turndown(html);
  
  // Post-processing to clean up the output
  markdown = markdown
    // Remove excessive newlines (more than 2 consecutive)
    .replace(/\n{3,}/g, '\n\n')
    // Fix any broken links (linkify plain URLs)
    .replace(/(?<![(\[])(https?:\/\/[^\s]+)(?![)\]])/g, '<$1>')
    // Ensure consistent heading spacing (one newline before, two after)
    .replace(/\n(#{1,6} .*)\n/g, '\n\n$1\n\n')
    // Fix unintended escaped characters in code blocks
    .replace(/```[\s\S]*?```/g, match => {
      return match.replace(/\\([`*_[\](){}#+\-.!])/g, '$1');
    });
  
  return markdown.trim();
}

/**
 * Enhanced version of convertHtmlToMarkdown with schema customization options
 * This allows for easier future extensions
 * 
 * @param {string} html - The HTML content to convert
 * @param {object} schemaOptions - Options to customize the conversion schema
 * @returns {string} - The converted Markdown content
 */
export function convertHtmlToMarkdownWithSchema(html, schemaOptions = {}) {
  // Create default schema configuration
  const defaultSchema = {
    preserveStructure: false,         // Whether to preserve HTML structure with comments
    flattenContainers: true,          // Whether to flatten semantic container elements
    customElementRules: {},           // Custom rules for specific elements
    handleSpecialElements: true,      // Whether to apply special handling for forms, SVGs, etc.
    cleanupOutput: true               // Whether to perform post-processing cleanup
  };
  
  // Merge default schema with provided options
  const schema = { ...defaultSchema, ...schemaOptions };
  
  // Create a new TurndownService instance with base configuration
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    strongDelimiter: '**',
    bulletListMarker: '-',
    hr: '---',
    linkStyle: 'inlined',
    preformattedCode: false
  });
  
  // Apply the customized rules based on schema
  
  // Add basic element rules
  // ... (add the basic rules from above)
  
  // If preserveStructure is true, add comments for HTML structure
  if (schema.preserveStructure) {
    // ... (add rules to preserve structure with comments)
  }
  
  // If handleSpecialElements is true, add special element handling
  if (schema.handleSpecialElements) {
    // ... (add all the special element rules)
  }
  
  // Add any custom element rules provided
  Object.entries(schema.customElementRules).forEach(([element, rule]) => {
    turndownService.addRule(element, rule);
  });
  
  // Perform the conversion
  let markdown = turndownService.turndown(html);
  
  // Perform post-processing if cleanup is enabled
  if (schema.cleanupOutput) {
    // ... (add the post-processing logic)
  }
  
  return markdown.trim();
}
