import { z } from 'zod';

// Define a recursive type for SVG elements
// First define a type to handle the recursive nature of SVG elements
type SvgElementType = z.ZodObject<any>;

// Create a placeholder
let svgElementSchema: SvgElementType;

// Schema for SVG elements (rect, circle, text, etc.)
svgElementSchema = z.object({
  type: z.string(),
  // Common SVG attributes
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  // Additional properties for specific element types
  content: z.string().optional(), // For text elements
  fontSize: z.number().optional(),
  fill: z.string().optional(),
  stroke: z.string().optional(),
  // Group elements can have children
  children: z.array(z.lazy(() => svgElementSchema as any)).optional(),
  // Allow for other attributes not explicitly defined
}).passthrough();

// Schema for SVG structure
const svgSchema = z.object({
  width: z.number(),
  height: z.number(),
  elements: z.array(svgElementSchema)
});

// Schema for the overall figure
export const figureSchema = z.object({
  caption: z.string(),
  svg: svgSchema.optional()
});

export type Figure = z.infer<typeof figureSchema>;
export type SvgElement = z.infer<typeof svgElementSchema>;
export type Svg = z.infer<typeof svgSchema>;
