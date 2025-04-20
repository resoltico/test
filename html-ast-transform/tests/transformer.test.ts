import { expect, describe, it } from 'vitest';
import {
  HtmlAstTransform,
  AstTransformer,
  RemoveCommentsOperation,
  RemoveElementsOperation,
  CollapseWhitespaceOperation,
  RemoveAttributesOperation
} from '../src/index.js';

describe('Transformer Operations', () => {
  let transformer: HtmlAstTransform;
  
  beforeEach(() => {
    transformer = new HtmlAstTransform();
  });
  
  describe('RemoveCommentsOperation', () => {
    it('should remove all comments from the AST', async () => {
      const html = `
        <div>
          <!-- Comment 1 -->
          <p>Text 1</p>
          <!-- Comment 2 -->
          <p>Text 2</p>
        </div>
      `;
      
      const { ast } = await transformer.parse(html);
      
      // Add transformation to remove comments
      transformer.addTransformation(new RemoveCommentsOperation());
      
      const { ast: transformedAst } = await transformer.transform(ast);
      
      // Get the div element
      const divNode = transformedAst.children?.[0];
      
      // Check that all comments are removed
      const hasComments = (divNode?.children || []).some(child => child.type === 'comment');
      expect(hasComments).toBe(false);
      
      // Check that only paragraph elements remain
      const paragraphs = (divNode?.children || []).filter(child => 
        child.type === 'element' && child.name === 'p'
      );
      expect(paragraphs.length).toBe(2);
    });
  });
  
  describe('RemoveElementsOperation', () => {
    it('should remove specified elements from the AST', async () => {
      const html = `
        <div>
          <script>console.log('test');</script>
          <p>Paragraph 1</p>
          <style>body { color: red; }</style>
          <p>Paragraph 2</p>
          <iframe src="test.html"></iframe>
        </div>
      `;
      
      const { ast } = await transformer.parse(html);
      
      // Add transformation to remove script, style, and iframe elements
      transformer.addTransformation(
        new RemoveElementsOperation(['script', 'style', 'iframe'])
      );
      
      const { ast: transformedAst } = await transformer.transform(ast);
      
      // Get the div element
      const divNode = transformedAst.children?.[0];
      
      // Check that script, style, and iframe elements are removed
      const hasRemovedElements = (divNode?.children || []).some(child => 
        child.type === 'element' && 
        ['script', 'style', 'iframe'].includes((child as any).name)
      );
      expect(hasRemovedElements).toBe(false);
      
      // Check that only paragraph elements remain
      const elements = (divNode?.children || []).filter(child => child.type === 'element');
      expect(elements.length).toBe(2);
      expect(elements.every(el => (el as any).name === 'p')).toBe(true);
    });
  });
  
  describe('CollapseWhitespaceOperation', () => {
    it('should collapse whitespace in text nodes', async () => {
      const html = `
        <div>
          <p>   Text   with    multiple    spaces   </p>
          <pre>   Preformatted   text   </pre>
        </div>
      `;
      
      const { ast } = await transformer.parse(html);
      
      // Add transformation to collapse whitespace
      transformer.addTransformation(new CollapseWhitespaceOperation());
      
      const { ast: transformedAst } = await transformer.transform(ast);
      
      // Get the p and pre elements
      const divNode = transformedAst.children?.[0];
      const pNode = divNode?.children?.[0];
      const preNode = divNode?.children?.[1];
      
      // Check that whitespace is collapsed in the p element
      const pTextNode = pNode?.children?.[0];
      expect(pTextNode?.type).toBe('text');
      expect(pTextNode?.value).toBe('Text with multiple spaces');
      
      // Pre element's text should also be collapsed since we didn't add special handling
      // In a real-world scenario, you might want to modify the operation to preserve whitespace in <pre>
      const preTextNode = preNode?.children?.[0];
      expect(preTextNode?.type).toBe('text');
      expect(preTextNode?.value).toBe('Preformatted text');
    });
  });
  
  describe('RemoveAttributesOperation', () => {
    it('should remove all attributes when no specific attributes are specified', async () => {
      const html = `
        <div id="main" class="container">
          <a href="https://example.com" target="_blank" rel="noopener">Link</a>
          <img src="image.jpg" alt="Image" width="100" height="100">
        </div>
      `;
      
      const { ast } = await transformer.parse(html);
      
      // Add transformation to remove all attributes
      transformer.addTransformation(new RemoveAttributesOperation());
      
      const { ast: transformedAst } = await transformer.transform(ast);
      
      // Get the elements
      const divNode = transformedAst.children?.[0];
      const aNode = divNode?.children?.[0];
      const imgNode = divNode?.children?.[1];
      
      // Check that all attributes are removed
      expect(Object.keys(divNode?.attributes || {}).length).toBe(0);
      expect(Object.keys(aNode?.attributes || {}).length).toBe(0);
      expect(Object.keys(imgNode?.attributes || {}).length).toBe(0);
    });
    
    it('should remove only specified attributes', async () => {
      const html = `
        <div id="main" class="container" data-test="value">
          <a href="https://example.com" target="_blank" rel="noopener">Link</a>
        </div>
      `;
      
      const { ast } = await transformer.parse(html);
      
      // Add transformation to remove specific attributes
      transformer.addTransformation(
        new RemoveAttributesOperation(['id', 'target', 'rel'])
      );
      
      const { ast: transformedAst } = await transformer.transform(ast);
      
      // Get the elements
      const divNode = transformedAst.children?.[0];
      const aNode = divNode?.children?.[0];
      
      // Check that only specified attributes are removed
      expect(divNode?.attributes?.id).toBeUndefined();
      expect(divNode?.attributes?.class).toBe('container');
      expect(divNode?.attributes?.['data-test']).toBe('value');
      
      expect(aNode?.attributes?.href).toBe('https://example.com');
      expect(aNode?.attributes?.target).toBeUndefined();
      expect(aNode?.attributes?.rel).toBeUndefined();
    });
  });
  
  describe('Chaining transformations', () => {
    it('should apply multiple transformations in order', async () => {
      const html = `
        <div id="main" class="container">
          <!-- Comment -->
          <script>console.log('test');</script>
          <p>  Text  with  spaces  </p>
        </div>
      `;
      
      const { ast } = await transformer.parse(html);
      
      // Add multiple transformations
      transformer.addTransformation(new RemoveCommentsOperation());
      transformer.addTransformation(new RemoveElementsOperation(['script']));
      transformer.addTransformation(new CollapseWhitespaceOperation());
      transformer.addTransformation(new RemoveAttributesOperation(['id']));
      
      const { ast: transformedAst } = await transformer.transform(ast);
      
      // Get the div element
      const divNode = transformedAst.children?.[0];
      
      // Check transformations
      
      // 1. Comments should be removed
      const hasComments = (divNode?.children || []).some(child => child.type === 'comment');
      expect(hasComments).toBe(false);
      
      // 2. Script elements should be removed
      const hasScript = (divNode?.children || []).some(child => 
        child.type === 'element' && (child as any).name === 'script'
      );
      expect(hasScript).toBe(false);
      
      // 3. Whitespace should be collapsed
      const pNode = divNode?.children?.[0];
      const textNode = pNode?.children?.[0];
      expect(textNode?.value).toBe('Text with spaces');
      
      // 4. Specific attributes should be removed
      expect(divNode?.attributes?.id).toBeUndefined();
      expect(divNode?.attributes?.class).toBe('container');
    });
  });
  
  describe('Custom transformation', () => {
    it('should apply custom transformation operations', async () => {
      const html = '<div><p>Text</p></div>';
      
      const { ast } = await transformer.parse(html);
      
      // Define a custom transformation operation
      transformer.addTransformation({
        name: 'addClassName',
        shouldApply: (node) => node.type === 'element' && (node as any).name === 'p',
        transform: (node, _context) => {
          const element = node as any;
          return {
            ...element,
            attributes: {
              ...element.attributes,
              class: element.attributes.class 
                ? `${element.attributes.class} custom-class` 
                : 'custom-class'
            }
          };
        }
      });
      
      const { ast: transformedAst } = await transformer.transform(ast);
      
      // Get the p element
      const divNode = transformedAst.children?.[0];
      const pNode = divNode?.children?.[0];
      
      // Check that the class attribute was added
      expect(pNode?.attributes?.class).toBe('custom-class');
    });
  });
});
