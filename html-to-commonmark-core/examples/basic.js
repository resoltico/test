/**
 * Basic example for html-to-commonmark-core
 */

import { convertHtmlToMarkdown, debug } from '../dist/index.js';

// Test HTML content
const html = `
<h1>Heading Level 1</h1>
<h2>Heading Level 2</h2>
<p>This is a paragraph with <strong>bold</strong> and <em>italic</em> text.</p>

<ul>
  <li>Unordered list item 1</li>
  <li>Unordered list item 2
    <ul>
      <li>Nested list item</li>
    </ul>
  </li>
</ul>

<ol>
  <li>Ordered list item 1</li>
  <li>Ordered list item 2</li>
</ol>

<blockquote>
  <p>This is a blockquote</p>
  <blockquote>
    <p>With a nested blockquote</p>
  </blockquote>
</blockquote>

<pre><code class="language-javascript">
function example() {
  return "Hello, world!";
}
</code></pre>

<p>Here's a <a href="https://example.com" title="Example Link">link</a> and an <img src="image.jpg" alt="Alt Text" />.</p>

<table>
  <thead>
    <tr>
      <th>Column 1</th>
      <th>Column 2</th>
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
`;

async function runExample() {
  console.log('Converting HTML to Markdown...\n');
  
  try {
    // Convert the HTML to Markdown
    const result = await convertHtmlToMarkdown(html, { debug: true });
    
    // Print the result
    console.log('Conversion Result:');
    console.log('==================\n');
    console.log(result.markdown);
    
    // Print debug timing information if available
    if (result.debug) {
      console.log('\nPerformance Metrics:');
      console.log('-------------------');
      console.log(`Parse Time: ${result.debug.parseTime}ms`);
      console.log(`Walk Time: ${result.debug.walkTime}ms`);
      console.log(`Normalize Time: ${result.debug.normalizeTime}ms`);
      console.log(`Render Time: ${result.debug.renderTime}ms`);
      console.log(`Total Time: ${result.debug.totalTime}ms`);
    }
  } catch (error) {
    console.error('Error during conversion:', error);
  }
}

runExample();
