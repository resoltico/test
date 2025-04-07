import { z } from 'zod';

// Schema for SVG elements
const svgElementSchema = z.object({
  type: z.string(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  fill: z.string().optional(),
  stroke: z.string().optional(),
  content: z.string().optional(),
  fontSize: z.number().optional(),
  // Additional properties can be added as needed
}).passthrough();

export type SvgElement = z.infer<typeof svgElementSchema>;

// Schema for SVG figure
const svgSchema = z.object({
  width: z.number(),
  height: z.number(),
  elements: z.array(svgElementSchema),
});

// Schema for figures, supporting SVG
export const figureSchema = z.object({
  caption: z.string(),
  svg: svgSchema.optional(),
  // Can extend with other figure types like image, etc.
});

export type Figure = z.infer<typeof figureSchema>;
export type SVG = z.infer<typeof svgSchema>;
