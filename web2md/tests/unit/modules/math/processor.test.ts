import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MathProcessor } from '../../../../src/modules/math/processor.js';
import { JSDOM } from 'jsdom';

// Create a mock logger
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  setDebug: vi.fn(),
  isDebugEnabled: vi.fn().mockReturnValue(false)
};

describe('MathProcessor', () => {
  let processor: MathProcessor;
  
  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();
    
    // Create a new processor instance
    processor = new MathProcessor(mockLogger);
  });
  
  describe('preprocessHtml', () => {
    it('should process MathML elements', async () => {
      const html = `
        <html>
          <body>
            <p>Here is some math:</p>
            <math xmlns="http://www.w3.org/1998/Math/MathML">
              <mrow>
                <mi>x</mi>
                <mo>=</mo>
                <mfrac>
                  <mrow>
                    <mo>-</mo>
                    <mi>b</mi>
                    <mo>±</mo>
                    <msqrt>
                      <msup>
                        <mi>b</mi>
                        <mn>2</mn>
                      </msup>
                      <mo>-</mo>
                      <mn>4</mn>
                      <mi>a</mi>
                      <mi>c</mi>
                    </msqrt>
                  </mrow>
                  <mrow>
                    <mn>2</mn>
                    <mi>a</mi>
                  </mrow>
                </mfrac>
              </mrow>
            </math>
          </body>
        </html>
      `;
      
      const processedHtml = await processor.preprocessHtml(html);
      
      // Check if the processor is attempting to convert the MathML
      expect(mockLogger.debug).toHaveBeenCalledWith('Preprocessing HTML for math elements');
      expect(mockLogger.debug).toHaveBeenCalledWith('Found 1 MathML elements');
      
      // Verify that the MathML has been replaced with a div
      const dom = new JSDOM(processedHtml);
      const mathElements = dom.window.document.querySelectorAll('math');
      const mathDivs = dom.window.document.querySelectorAll('div.math-block, div.math-inline');
      
      expect(mathElements.length).toBe(0);
      expect(mathDivs.length).toBe(1);
      expect(mathDivs[0].getAttribute('data-math-format')).toBe('latex');
    });
    
    it('should process script elements with math/tex content', async () => {
      const html = `
        <html>
          <body>
            <p>Inline math: <script type="math/tex">a^2 + b^2 = c^2</script></p>
            <p>Block math: <script type="math/tex; mode=display">\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}</script></p>
          </body>
        </html>
      `;
      
      const processedHtml = await processor.preprocessHtml(html);
      
      // Check if the processor is attempting to convert the math scripts
      expect(mockLogger.debug).toHaveBeenCalledWith('Preprocessing HTML for math elements');
      expect(mockLogger.debug).toHaveBeenCalledWith('Found 2 math script elements');
      
      // Verify that the scripts have been replaced with divs
      const dom = new JSDOM(processedHtml);
      const scripts = dom.window.document.querySelectorAll('script[type="math/tex"]');
      const mathDivs = dom.window.document.querySelectorAll('div.math-block, div.math-inline');
      
      expect(scripts.length).toBe(0);
      expect(mathDivs.length).toBe(2);
      
      // Check that we have one inline and one block div
      const inlineDivs = dom.window.document.querySelectorAll('div.math-inline');
      const blockDivs = dom.window.document.querySelectorAll('div.math-block');
      
      expect(inlineDivs.length).toBe(1);
      expect(blockDivs.length).toBe(1);
      expect(inlineDivs[0].textContent).toBe('a^2 + b^2 = c^2');
      expect(blockDivs[0].textContent).toBe('\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}');
    });
    
    it('should process elements with math data attributes', async () => {
      const html = `
        <html>
          <body>
            <p>Inline math: <span data-latex="E = mc^2"></span></p>
            <div data-math="F = G\\frac{m_1 m_2}{r^2}" class="display-math"></div>
          </body>
        </html>
      `;
      
      const processedHtml = await processor.preprocessHtml(html);
      
      // Check if the processor is attempting to convert the math data elements
      expect(mockLogger.debug).toHaveBeenCalledWith('Preprocessing HTML for math elements');
      expect(mockLogger.debug).toHaveBeenCalledWith('Found 2 elements with math data attributes');
      
      // Verify that the elements have been replaced with divs
      const dom = new JSDOM(processedHtml);
      const originalElements = dom.window.document.querySelectorAll('[data-latex], [data-math]');
      const mathDivs = dom.window.document.querySelectorAll('div.math-block, div.math-inline');
      
      expect(originalElements.length).toBe(0);
      expect(mathDivs.length).toBe(2);
      
      // Check that we have one inline and one block div
      const inlineDivs = dom.window.document.querySelectorAll('div.math-inline');
      const blockDivs = dom.window.document.querySelectorAll('div.math-block');
      
      expect(inlineDivs.length).toBe(1);
      expect(blockDivs.length).toBe(1);
      expect(inlineDivs[0].textContent).toBe('E = mc^2');
      expect(blockDivs[0].textContent).toBe('F = G\\frac{m_1 m_2}{r^2}');
    });
    
    it('should handle errors gracefully', async () => {
      // Test with invalid HTML
      const invalidHtml = '<html><body><math>invalid math without closing tag</body></html>';
      
      // This should not throw an error
      const result = await processor.preprocessHtml(invalidHtml);
      
      // Should log error but return the original HTML
      expect(mockLogger.error).toHaveBeenCalled();
      expect(result).toBe(invalidHtml);
    });
  });
  
  describe('configuration', () => {
    it('should allow customizing delimiters', () => {
      // Configure with custom delimiters
      processor.configure({
        inlineDelimiter: '\\(',
        blockDelimiter: '\\['
      });
      
      // Verify that the logger is called
      expect(mockLogger.debug).not.toHaveBeenCalled(); // No debug logging in this case
    });
  });
});