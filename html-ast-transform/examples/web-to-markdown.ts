/**
 * Example: Web to Markdown Converter
 * 
 * This example demonstrates how the library could be integrated into a
 * hypothetical web2md project that converts HTML from a URL to Markdown.
 */

import { 
  HtmlAstTransform, 
  SanitizeHtmlOperation,
  RemoveElementsOperation,
  CollapseWhitespaceOperation,
  AbsoluteUrlsOperation,
  isElementNode,
  isTextNode,
  AstNode,
  ElementNode
} from '../src/index.js';

// Sample HTML content (in a real app, this would be fetched from a URL)
const webpageHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Sample Article - My Website</title>
</head>
<body>
  <header>
    <h1>Sample Article</h1>
    <nav>
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/blog">Blog</a></li>
      </ul>
    </nav>
  </header>

  <main id="content">
    <article>
      <h1>Main Article Heading</h1>
      
      <p>This is a paragraph with <strong>bold text</strong> and <em>italic text</em>.</p>
      
      <h2>Subheading 1</h2>
      <p>Here's a paragraph with a <a href="/relative-link">relative link</a> and an 
      <a href="https://example.com">absolute link</a>.</p>
      
      <pre><code>function example() {
  return "This is a code block";
}</code></pre>
      
      <h2>Subheading 2</h2>
      <p>Another paragraph with an <img src="/images/sample.jpg" alt="Sample Image"> inline image.</p>
      
      <ul>
        <li>List item 1</li>
        <li>List item 2</li>
        <li>List item 3 with a <a href="#link">link</a></li>
      </ul>
      
      <blockquote>
        <p>This is a blockquote with a nested <em>emphasis</em>.</p>
      </blockquote>
      
      <table>
        <thead>
          <tr>
            <th>Header 1</th>
            <th>Header 2</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Cell 1</td>
            <td>Cell 2</td>
          </tr>
          <tr>
            <td>Cell 3</td>
            <td>Cell 4</td>
          </tr>
        </tbody>
      </table>
    </article>
    
    <aside class="sidebar">
      <div class="widget">
        <h3>Related Articles</h3>
        <ul>
          <li><a href="/article1">Article 1</a></li>
          <li><a href="/article2">Article 2</a></li>
        </ul>
      </div>
    </aside>
  </main>

  <footer>
    <p>&copy; 2023 My Website</p>
  </footer>
</body>
</html>
`;

class HtmlToMarkdownConverter {
  private transformer: HtmlAstTransform;
  private baseUrl: string;
  
  constructor(baseUrl: string = 'https://example.org') {
    this.transformer = new HtmlAstTransform();
    this.baseUrl = baseUrl;
    
    // Add transformations for cleaning the HTML
    this.transformer.addTransformation(new RemoveElementsOperation([
      'script', 'style', 'iframe', 'noscript', 'head', 'nav', 'header', 'footer'
    ]));
    this.transformer.addTransformation(new SanitizeHtmlOperation());
    this.transformer.addTransformation(new CollapseWhitespaceOperation());
    this.transformer.addTransformation(new AbsoluteUrlsOperation(baseUrl));
  }
  
  /**
   * Convert HTML to Markdown.
   * 
   * @param html HTML string to convert
   * @returns Markdown string
   */
  async convertToMarkdown(html: string): Promise<string> {
    // Parse and transform the HTML
    const { ast } = await this.transformer.parse(html);
    const { ast: cleanedAst } = await this.transformer.transform(ast);
    
    // Find the main content element
    const mainElement = this.findMainContent(cleanedAst);
    
    if (!mainElement) {
      throw new Error('Could not find main content element');
    }
    
    // Convert the main content to Markdown
    return this.astToMarkdown(mainElement);
  }
  
  /**
   * Find the main content element in the AST.
   * 
   * @param ast Root AST node
   * @returns Main content element, or null if not found
   */
  private findMainContent(ast: AstNode): AstNode | null {
    // Try to find elements that typically contain the main content
    const selectors = [
      // First check for specific IDs
      (node: AstNode) => isElementNode(node) && (node as ElementNode).attributes.id === 'content',
      (node: AstNode) => isElementNode(node) && (node as ElementNode).attributes.id === 'main-content',
      (node: AstNode) => isElementNode(node) && (node as ElementNode).attributes.id === 'main',
      
      // Then check for semantic elements
      (node: AstNode) => isElementNode(node) && (node as ElementNode).name === 'main',
      (node: AstNode) => isElementNode(node) && (node as ElementNode).name === 'article',
      
      // Then check for common class names
      (node: AstNode) => isElementNode(node) && (node as ElementNode).attributes.class?.includes('content'),
      (node: AstNode) => isElementNode(node) && (node as ElementNode).attributes.class?.includes('article'),
      
      // Fallback to body
      (node: AstNode) => isElementNode(node) && (node as ElementNode).name === 'body'
    ];
    
    for (const selector of selectors) {
      const element = this.findNode(ast, selector);
      if (element) return element;
    }
    
    return null;
  }
  
  /**
   * Find a node in the AST that matches a predicate.
   * 
   * @param node Root node to search from
   * @param predicate Function that returns true for matching nodes
   * @returns Matching node, or null if not found
   */
  private findNode(node: AstNode, predicate: (node: AstNode) => boolean): AstNode | null {
    if (predicate(node)) {
      return node;
    }
    
    if (node.children) {
      for (const child of node.children) {
        const found = this.findNode(child, predicate);
        if (found) return found;
      }
    }
    
    return null;
  }
  
  /**
   * Convert an AST node to Markdown.
   * 
   * @param node Node to convert
   * @param indentLevel Current indentation level
   * @returns Markdown string
   */
  private astToMarkdown(node: AstNode, indentLevel: number = 0): string {
    if (isTextNode(node)) {
      return node.value;
    }
    
    if (!isElementNode(node)) {
      return '';
    }
    
    const element = node as ElementNode;
    const { name, attributes } = element;
    
    let markdown = '';
    
    // Handle different HTML elements
    switch (name.toLowerCase()) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        const level = parseInt(name[1]);
        const headingText = this.getChildrenMarkdown(element, indentLevel);
        markdown += `\n${'#'.repeat(level)} ${headingText}\n\n`;
        break;
        
      case 'p':
        markdown += this.getChildrenMarkdown(element, indentLevel) + '\n\n';
        break;
        
      case 'a':
        const href = attributes.href || '';
        const linkText = this.getChildrenMarkdown(element, indentLevel);
        markdown += `[${linkText}](${href})`;
        break;
        
      case 'img':
        const src = attributes.src || '';
        const alt = attributes.alt || '';
        markdown += `![${alt}](${src})`;
        break;
        
      case 'strong':
      case 'b':
        markdown += `**${this.getChildrenMarkdown(element, indentLevel)}**`;
        break;
        
      case 'em':
      case 'i':
        markdown += `*${this.getChildrenMarkdown(element, indentLevel)}*`;
        break;
        
      case 'code':
        // Check if inside a pre (code block) or not (inline code)
        if (element.parent && isElementNode(element.parent) && element.parent.name === 'pre') {
          markdown += this.getChildrenMarkdown(element, indentLevel);
        } else {
          markdown += `\`${this.getChildrenMarkdown(element, indentLevel)}\``;
        }
        break;
        
      case 'pre':
        const codeContent = this.getChildrenMarkdown(element, indentLevel);
        markdown += `\n\`\`\`\n${codeContent}\n\`\`\`\n\n`;
        break;
        
      case 'ul':
        markdown += '\n';
        for (const child of element.children || []) {
          if (isElementNode(child) && child.name === 'li') {
            markdown += `- ${this.getChildrenMarkdown(child, indentLevel + 1).trim()}\n`;
          }
        }
        markdown += '\n';
        break;
        
      case 'ol':
        markdown += '\n';
        let i = 1;
        for (const child of element.children || []) {
          if (isElementNode(child) && child.name === 'li') {
            markdown += `${i}. ${this.getChildrenMarkdown(child, indentLevel + 1).trim()}\n`;
            i++;
          }
        }
        markdown += '\n';
        break;
        
      case 'blockquote':
        const quoteContent = this.getChildrenMarkdown(element, indentLevel + 1);
        markdown += '\n> ' + quoteContent.trim().replace(/\n/g, '\n> ') + '\n\n';
        break;
        
      case 'table':
        markdown += this.convertTableToMarkdown(element);
        break;
        
      case 'br':
        markdown += '\n';
        break;
        
      case 'hr':
        markdown += '\n---\n\n';
        break;
        
      default:
        // For other elements, just process their children
        if (element.children && element.children.length > 0) {
          markdown += this.getChildrenMarkdown(element, indentLevel);
        }
        break;
    }
    
    return markdown;
  }
  
  /**
   * Get Markdown representation of all children of an element.
   * 
   * @param element Parent element
   * @param indentLevel Current indentation level
   * @returns Combined Markdown of all children
   */
  private getChildrenMarkdown(element: ElementNode, indentLevel: number): string {
    if (!element.children || element.children.length === 0) {
      return '';
    }
    
    return element.children
      .map(child => this.astToMarkdown(child, indentLevel))
      .join('');
  }
  
  /**
   * Convert a table element to Markdown.
   * 
   * @param tableElement Table element to convert
   * @returns Markdown table
   */
  private convertTableToMarkdown(tableElement: ElementNode): string {
    let markdown = '\n';
    let headers: string[] = [];
    let rows: string[][] = [];
    
    // Find header and body elements
    let theadElement = null;
    let tbodyElement = null;
    
    for (const child of tableElement.children || []) {
      if (isElementNode(child)) {
        if (child.name === 'thead') {
          theadElement = child;
        } else if (child.name === 'tbody') {
          tbodyElement = child;
        }
      }
    }
    
    // Extract headers
    if (theadElement) {
      for (const child of theadElement.children || []) {
        if (isElementNode(child) && child.name === 'tr') {
          for (const cell of child.children || []) {
            if (isElementNode(cell) && (cell.name === 'th' || cell.name === 'td')) {
              headers.push(this.getChildrenMarkdown(cell, 0).trim());
            }
          }
          break; // Just process the first row of headers
        }
      }
    }
    
    // Extract rows
    if (tbodyElement) {
      for (const child of tbodyElement.children || []) {
        if (isElementNode(child) && child.name === 'tr') {
          const row: string[] = [];
          for (const cell of child.children || []) {
            if (isElementNode(cell) && cell.name === 'td') {
              row.push(this.getChildrenMarkdown(cell, 0).trim());
            }
          }
          if (row.length > 0) {
            rows.push(row);
          }
        }
      }
    }
    
    // If no thead/tbody, look for direct tr elements
    if (headers.length === 0 && rows.length === 0) {
      let firstRow = true;
      for (const child of tableElement.children || []) {
        if (isElementNode(child) && child.name === 'tr') {
          const row: string[] = [];
          for (const cell of child.children || []) {
            if (isElementNode(cell) && (cell.name === 'th' || cell.name === 'td')) {
              row.push(this.getChildrenMarkdown(cell, 0).trim());
            }
          }
          
          if (row.length > 0) {
            if (firstRow) {
              headers = row;
              firstRow = false;
            } else {
              rows.push(row);
            }
          }
        }
      }
    }
    
    // If we have headers, create the table
    if (headers.length > 0) {
      // Header row
      markdown += '| ' + headers.join(' | ') + ' |\n';
      
      // Separator row
      markdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
      
      // Data rows
      for (const row of rows) {
        // Pad the row to match header length
        while (row.length < headers.length) {
          row.push('');
        }
        markdown += '| ' + row.join(' | ') + ' |\n';
      }
      
      markdown += '\n';
    }
    
    return markdown;
  }
}

async function main() {
  // Create a new HTML to Markdown converter
  const converter = new HtmlToMarkdownConverter('https://example.org');
  
  try {
    // Convert HTML to Markdown
    const markdown = await converter.convertToMarkdown(webpageHtml);
    
    console.log('Converted Markdown:');
    console.log('='.repeat(40));
    console.log(markdown);
    console.log('='.repeat(40));
  } catch (error) {
    console.error('Error converting HTML to Markdown:', error);
  }
}

// Run the example
main().catch(console.error);
