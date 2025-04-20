/**
 * Example: Content Extractor
 * 
 * This example demonstrates how to use the library to extract and process
 * content from HTML, such as extracting the main content from a webpage.
 */

import { 
  HtmlAstTransform, 
  RemoveElementsOperation,
  CollapseWhitespaceOperation,
  findElementsByTagName,
  findElementsByClassName,
  getTextContent
} from '../src/index.js';

// Sample HTML from a hypothetical blog post page
const webpageHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Sample Blog Post - My Website</title>
  <meta name="description" content="This is a sample blog post for demonstration purposes.">
  <link rel="stylesheet" href="styles.css">
  <script src="script.js"></script>
</head>
<body>
  <header class="site-header">
    <div class="logo">My Blog</div>
    <nav class="main-nav">
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/blog">Blog</a></li>
        <li><a href="/about">About</a></li>
        <li><a href="/contact">Contact</a></li>
      </ul>
    </nav>
  </header>

  <main class="content-wrapper">
    <article class="blog-post">
      <header class="post-header">
        <h1>Sample Blog Post Title</h1>
        <p class="post-meta">Posted on <time datetime="2023-07-15">July 15, 2023</time> by <a href="/author/johndoe">John Doe</a></p>
      </header>
      
      <div class="post-content">
        <p>This is the first paragraph of the blog post. It contains an <a href="https://example.com">external link</a> and some <strong>formatted text</strong>.</p>
        
        <h2>Section Heading</h2>
        <p>This is another paragraph under a section heading. It has more content and information relevant to the blog post.</p>
        
        <figure class="post-image">
          <img src="/images/sample.jpg" alt="Sample image">
          <figcaption>A sample image for the blog post</figcaption>
        </figure>
        
        <p>Here's the final paragraph with some concluding thoughts about the topic discussed in this sample blog post.</p>
      </div>
      
      <footer class="post-footer">
        <div class="tags">
          <span>Tags:</span>
          <a href="/tag/sample">sample</a>
          <a href="/tag/example">example</a>
          <a href="/tag/demo">demo</a>
        </div>
        
        <div class="share-buttons">
          <span>Share:</span>
          <a href="#">Twitter</a>
          <a href="#">Facebook</a>
          <a href="#">LinkedIn</a>
        </div>
      </footer>
    </article>
    
    <aside class="sidebar">
      <div class="widget recent-posts">
        <h3>Recent Posts</h3>
        <ul>
          <li><a href="/blog/post1">Another Blog Post</a></li>
          <li><a href="/blog/post2">Yet Another Blog Post</a></li>
          <li><a href="/blog/post3">One More Blog Post</a></li>
        </ul>
      </div>
      
      <div class="widget categories">
        <h3>Categories</h3>
        <ul>
          <li><a href="/category/tech">Technology</a></li>
          <li><a href="/category/design">Design</a></li>
          <li><a href="/category/business">Business</a></li>
        </ul>
      </div>
      
      <div class="widget newsletter">
        <h3>Subscribe</h3>
        <form>
          <input type="email" placeholder="Your email">
          <button type="submit">Subscribe</button>
        </form>
      </div>
    </aside>
  </main>

  <footer class="site-footer">
    <p>&copy; 2023 My Blog. All rights reserved.</p>
    <ul class="footer-links">
      <li><a href="/privacy">Privacy Policy</a></li>
      <li><a href="/terms">Terms of Service</a></li>
      <li><a href="/contact">Contact</a></li>
    </ul>
  </footer>
  
  <script src="analytics.js"></script>
</body>
</html>
`;

async function main() {
  // Create a new transformer
  const transformer = new HtmlAstTransform();
  
  try {
    // Parse the HTML
    const { ast } = await transformer.parse(webpageHtml);
    
    // Extract metadata from the head
    const head = findElementsByTagName(ast, 'head')[0];
    const title = head ? getTextContent(findElementsByTagName(head, 'title')[0]) : '';
    
    const metaTags = findElementsByTagName(head, 'meta');
    const description = metaTags
      .find(meta => meta.attributes.name === 'description')
      ?.attributes.content || '';
    
    console.log('Page Metadata:');
    console.log(`- Title: ${title}`);
    console.log(`- Description: ${description}`);
    
    // Extract the main article content
    const articleElement = findElementsByTagName(ast, 'article')[0];
    
    if (!articleElement) {
      console.log('No article element found in the HTML.');
      return;
    }
    
    // Extract article metadata
    const postHeader = findElementsByClassName(articleElement, 'post-header')[0];
    const postTitle = postHeader ? getTextContent(findElementsByTagName(postHeader, 'h1')[0]) : '';
    const postMeta = postHeader ? getTextContent(findElementsByClassName(postHeader, 'post-meta')[0]) : '';
    
    // Extract and clean the main content
    const contentElement = findElementsByClassName(articleElement, 'post-content')[0];
    
    if (contentElement) {
      // Create a transformer specifically for the content
      const contentTransformer = new HtmlAstTransform();
      
      // Add transformations for cleaning the content
      contentTransformer.addTransformation(new RemoveElementsOperation(['script', 'style', 'iframe']));
      contentTransformer.addTransformation(new CollapseWhitespaceOperation());
      
      // Transform the content
      const { ast: cleanedContentAst } = await contentTransformer.transform(contentElement);
      
      // Extract sections with headings
      const sections = [];
      let currentSection = null;
      
      for (const child of cleanedContentAst.children || []) {
        if (child.type === 'element' && child.name.match(/^h[1-6]$/)) {
          if (currentSection) {
            sections.push(currentSection);
          }
          
          currentSection = {
            heading: getTextContent(child),
            content: []
          };
        } else if (currentSection) {
          currentSection.content.push(transformer.toHtml(child));
        }
      }
      
      if (currentSection) {
        sections.push(currentSection);
      }
      
      // Print the extracted content
      console.log('\nArticle Information:');
      console.log(`- Title: ${postTitle}`);
      console.log(`- Meta: ${postMeta}`);
      console.log('\nContent Sections:');
      
      for (const [index, section] of sections.entries()) {
        console.log(`\nSection ${index + 1}: ${section.heading}`);
        console.log('-'.repeat(40));
        console.log(section.content.join('\n'));
      }
      
      // Store the cleaned content AST for later use
      await transformer.store('article-content', cleanedContentAst);
      console.log('\nCleaned article content stored with ID: article-content');
    } else {
      console.log('No content element found in the article.');
    }
  } catch (error) {
    console.error('Error extracting content:', error);
  }
}

// Run the example
main().catch(console.error);
