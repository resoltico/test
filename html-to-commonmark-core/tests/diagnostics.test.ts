/**
 * Diagnostic Tests for HTML-to-CommonMark converter
 * These tests provide enhanced debugging and visualization for conversion issues
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { convertHtmlToMarkdown, convertHtmlToAst } from '../src/index.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Setup directory for diagnostic output
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.join(__dirname, '..', 'diagnostic-output');

// Create output directory if it doesn't exist
beforeAll(() => {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
});

// Helper for writing diagnostic files
function writeFile(filename: string, content: string) {
  fs.writeFileSync(path.join(outputDir, filename), content);
}

// JSON stringify helper that handles circular references
function replacer(key: string, value: any) {
  if (key === 'parent') {
    return value ? { type: value.type } : null; // Just show type for parent references
  }
  return value;
}

// Visualize AST structure
function visualizeAst(ast: any, indent = 0): string {
  if (!ast) return '';
  
  const nodes = Array.isArray(ast) ? ast : [ast];
  return nodes.map(node => visualizeNode(node, indent)).join('\n');
}

// Recursively visualize a node
function visualizeNode(node: any, indent = 0): string {
  if (!node) return '';
  
  const padding = ' '.repeat(indent * 2);
  let result = `${padding}${node.type}`;
  
  // Add type-specific properties
  switch (node.type) {
    case 'Heading':
      result += ` (level=${node.level})`;
      break;
    case 'List':
      result += ` (ordered=${node.ordered})`;
      break;
    case 'Image':
      result += ` (url=${node.url}, alt=${node.alt || ''})`;
      break;
    case 'Link':
      result += ` (url=${node.url})`;
      break;
    case 'Text':
      const value = node.value || '';
      const truncatedValue = value.length > 30 ? value.substring(0, 30) + '...' : value;
      result += ` (value="${truncatedValue}")`;
      break;
  }
  
  // Process children if this is a parent node
  if (node.children && Array.isArray(node.children)) {
    result += ` [${node.children.length} children]`;
    for (const child of node.children) {
      result += '\n' + visualizeNode(child, indent + 1);
    }
  }
  
  return result;
}

// Generate a diagnostic report for a test
async function runDiagnostic(name: string, html: string, expectedMarkdown: string) {
  // Save input HTML
  writeFile(`${name}-input.html`, html);
  
  // Convert with debugging enabled
  const result = await convertHtmlToMarkdown(html, { debug: true });
  
  // Save the raw markdown result
  writeFile(`${name}-output.md`, result.markdown);
  
  // Save the AST structure as JSON
  writeFile(`${name}-ast.json`, JSON.stringify(result.ast, replacer, 2));
  
  // Save a visualization of the AST structure
  writeFile(`${name}-ast-visual.txt`, visualizeAst(result.ast));
  
  // Check if the output contains the expected markdown
  const success = result.markdown.includes(expectedMarkdown);
  
  // Save the test result
  writeFile(`${name}-result.json`, JSON.stringify({
    name,
    success,
    expectedMarkdown,
    actualMarkdown: result.markdown,
    debugInfo: result.debug
  }, null, 2));
  
  // Return detailed information for the test
  return {
    success,
    markdown: result.markdown,
    ast: result.ast,
    debug: result.debug
  };
}

// Define test cases
describe('HTML-to-CommonMark Diagnostics', () => {
  // Test headings (known to work)
  it('should convert headings correctly with diagnostic output', async () => {
    const html = '<h1>Test Heading</h1>';
    const expectedMarkdown = '# Test Heading';
    
    const result = await runDiagnostic('heading', html, expectedMarkdown);
    
    expect(result.success).toBe(true);
    expect(result.markdown).toContain(expectedMarkdown);
  });
  
  // Test unordered lists
  it('should convert unordered lists correctly with diagnostic output', async () => {
    const html = '<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>';
    const expectedMarkdown = '- Item 1';
    
    const result = await runDiagnostic('unordered-list', html, expectedMarkdown);
    
    // We expect this to fail unless fixes are applied
    expect(result.markdown).toContain(expectedMarkdown);
    
    // Diagnostic assertions to locate issues
    const ast = result.ast[0]; // Document node
    
    // Check for List node
    const listNode = ast.children.find((node: any) => node.type === 'List');
    if (listNode) {
      expect(listNode).toHaveProperty('ordered');
      expect(listNode.ordered).toBe(false);
    }
  });
  
  // Test ordered lists
  it('should convert ordered lists correctly with diagnostic output', async () => {
    const html = '<ol><li>Item 1</li><li>Item 2</li><li>Item 3</li></ol>';
    const expectedMarkdown = '1. Item 1';
    
    const result = await runDiagnostic('ordered-list', html, expectedMarkdown);
    
    // We expect this to fail unless fixes are applied
    expect(result.markdown).toContain(expectedMarkdown);
    
    // Diagnostic assertions to locate issues
    const ast = result.ast[0]; // Document node
    
    // Check for List node
    const listNode = ast.children.find((node: any) => node.type === 'List');
    if (listNode) {
      expect(listNode).toHaveProperty('ordered');
      expect(listNode.ordered).toBe(true);
    }
  });
  
  // Test nested lists
  it('should convert nested lists correctly with diagnostic output', async () => {
    const html = `<ul>
      <li>Item 1</li>
      <li>Item 2
        <ul>
          <li>Nested 1</li>
          <li>Nested 2</li>
        </ul>
      </li>
      <li>Item 3</li>
    </ul>`;
    const expectedMarkdown = '- Item 2\n  - Nested 1';
    
    const result = await runDiagnostic('nested-list', html, expectedMarkdown);
    
    // We expect this to fail unless fixes are applied
    expect(result.markdown).toContain('- Item 2');
    expect(result.markdown).toContain('  - Nested 1');
  });
  
  // Test images
  it('should convert images correctly with diagnostic output', async () => {
    const html = '<img src="image.jpg" alt="Alt Text">';
    const expectedMarkdown = '![Alt Text](image.jpg)';
    
    const result = await runDiagnostic('image', html, expectedMarkdown);
    
    // We expect this to fail unless fixes are applied
    expect(result.markdown).toContain(expectedMarkdown);
    
    // Diagnostic assertions to locate issues
    const ast = result.ast[0]; // Document node
    
    // Check for Image node
    const imageNode = ast.children.find((node: any) => node.type === 'Image');
    if (imageNode) {
      expect(imageNode).toHaveProperty('url');
      expect(imageNode).toHaveProperty('alt');
      expect(imageNode.url).toBe('image.jpg');
      expect(imageNode.alt).toBe('Alt Text');
    }
  });
  
  // Test tables
  it('should convert tables correctly with diagnostic output', async () => {
    const html = `<table>
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
      </tbody>
    </table>`;
    const expectedMarkdown = '| Header 1 | Header 2 |';
    
    const result = await runDiagnostic('table', html, expectedMarkdown);
    
    // We expect this to fail unless fixes are applied
    expect(result.markdown).toContain(expectedMarkdown);
  });
});

// After all tests, generate a comprehensive report
afterAll(() => {
  // Create an index.html file to navigate the diagnostic output
  const indexHtml = `<!DOCTYPE html>
  <html>
    <head>
      <title>HTML-to-CommonMark Diagnostic Results</title>
      <style>
        body { font-family: sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        h1, h2, h3 { color: #333; }
        .test { border: 1px solid #ddd; margin: 20px 0; padding: 15px; border-radius: 5px; }
        .test.pass { border-left: 5px solid #4CAF50; }
        .test.fail { border-left: 5px solid #F44336; }
        pre { background: #f5f5f5; padding: 10px; overflow: auto; border-radius: 3px; }
        .columns { display: flex; gap: 20px; }
        .column { flex: 1; }
      </style>
    </head>
    <body>
      <h1>HTML-to-CommonMark Diagnostic Results</h1>
      <p>Generated: ${new Date().toLocaleString()}</p>
      
      <h2>Test Cases</h2>
      <div id="tests">
        <!-- Will be populated via JavaScript -->
      </div>
      
      <script>
        // Load test results and populate the page
        async function loadTests() {
          const testNames = ['heading', 'unordered-list', 'ordered-list', 'nested-list', 'image', 'table'];
          const testsContainer = document.getElementById('tests');
          
          for (const name of testNames) {
            try {
              const result = await fetch(\`\${name}-result.json\`).then(r => r.json());
              const html = await fetch(\`\${name}-input.html\`).then(r => r.text());
              const markdown = await fetch(\`\${name}-output.md\`).then(r => r.text());
              const astVisual = await fetch(\`\${name}-ast-visual.txt\`).then(r => r.text());
              
              const testDiv = document.createElement('div');
              testDiv.className = \`test \${result.success ? 'pass' : 'fail'}\`;
              
              testDiv.innerHTML = \`
                <h3>\${name} - \${result.success ? '✅ PASS' : '❌ FAIL'}</h3>
                <div class="columns">
                  <div class="column">
                    <h4>Input HTML</h4>
                    <pre><code>\${html.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
                    
                    <h4>Expected Output</h4>
                    <pre><code>\${result.expectedMarkdown}</code></pre>
                    
                    <h4>Actual Output</h4>
                    <pre><code>\${markdown}</code></pre>
                  </div>
                  
                  <div class="column">
                    <h4>AST Structure</h4>
                    <pre><code>\${astVisual}</code></pre>
                    
                    <h4>Debug Info</h4>
                    <pre><code>\${JSON.stringify(result.debugInfo, null, 2)}</code></pre>
                  </div>
                </div>
              \`;
              
              testsContainer.appendChild(testDiv);
            } catch (error) {
              console.error(\`Error loading test \${name}:\`, error);
            }
          }
        }
        
        loadTests();
      </script>
    </body>
  </html>`;
  
  writeFile('index.html', indexHtml);
});
