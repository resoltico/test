/**
 * Rule for preserving raw link URLs exactly as they appear in the HTML
 */
export default {
  name: 'rawLinks',
  
  filter: (node) => {
    // Only match 'a' elements with href attributes
    return node.nodeName.toLowerCase() === 'a' && node.hasAttribute('href');
  },
  
  replacement: (content, node) => {
    // Get the raw href attribute without any processing
    const href = node.getAttribute('href');
    // Return the markdown link format with the raw href
    return `[${content}](${href})`;
  }
};