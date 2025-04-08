import TurndownService from 'turndown';

/**
 * Converts HTML to Markdown using TurndownService
 * @param {string} html - The HTML content to convert
 * @returns {string} - The converted Markdown content
 */
export function convertHtmlToMarkdown(html) {
  // Create a new TurndownService instance
  const turndownService = new TurndownService({
    headingStyle: 'atx',       // Use # style headings
    codeBlockStyle: 'fenced',  // Use ``` style code blocks
    emDelimiter: '_',          // Use _ for emphasis
    strongDelimiter: '**',     // Use ** for strong emphasis
    bulletListMarker: '-',     // Use - for bullet lists
    hr: '---',                 // Use --- for horizontal rules
  });
  
  // Customize TurndownService to better preserve structure
  
  // Preserve details/summary elements
  turndownService.addRule('details', {
    filter: ['details'],
    replacement: function(content, node) {
      const summary = node.querySelector('summary');
      const summaryText = summary ? summary.textContent.trim() : 'Details';
      const detailsContent = summary ? content.replace(summary.textContent, '') : content;
      
      return `<details>\n<summary>${summaryText}</summary>\n\n${detailsContent.trim()}\n</details>\n\n`;
    }
  });
  
  // Better handling of tables
  turndownService.addRule('tableCell', {
    filter: ['th', 'td'],
    replacement: function(content, node) {
      return ` ${content.trim()} |`;
    }
  });
  
  // Better handling of pre elements
  turndownService.addRule('pre', {
    filter: ['pre'],
    replacement: function(content, node) {
      // Extract the language from the class if available
      const codeElement = node.querySelector('code');
      let language = '';
      
      if (codeElement && codeElement.className) {
        const match = codeElement.className.match(/language-(\w+)/);
        if (match) {
          language = match[1];
        }
      }
      
      return `\`\`\`${language}\n${content}\n\`\`\`\n\n`;
    }
  });
  
  // Preserve div structure with comments
  turndownService.addRule('div', {
    filter: ['div'],
    replacement: function(content, node) {
      // Check if div has an id or class
      const id = node.getAttribute('id');
      const className = node.getAttribute('class');
      
      if (id || className) {
        let divInfo = '';
        if (id) divInfo += `#${id}`;
        if (className) divInfo += `.${className.replace(/\s+/g, '.')}`;
        
        return `<!-- div${divInfo} start -->\n\n${content}\n\n<!-- div${divInfo} end -->\n\n`;
      }
      
      return content;
    }
  });
  
  // Preserve semantic elements
  const semanticElements = ['article', 'section', 'nav', 'aside', 'header', 'footer', 'main'];
  
  semanticElements.forEach(element => {
    turndownService.addRule(element, {
      filter: [element],
      replacement: function(content, node) {
        // Check if element has an id or class
        const id = node.getAttribute('id');
        const className = node.getAttribute('class');
        
        let elementInfo = element;
        if (id) elementInfo += `#${id}`;
        if (className) elementInfo += `.${className.replace(/\s+/g, '.')}`;
        
        return `<!-- ${elementInfo} start -->\n\n${content}\n\n<!-- ${elementInfo} end -->\n\n`;
      }
    });
  });
  
  // Convert the HTML to Markdown
  return turndownService.turndown(html);
}