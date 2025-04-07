import { z } from 'zod';

const svgElementSchema = z.object({
  type: z.string(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  fill: z.string().optional(),
  content: z.string().optional(),
  fontSize: z.number().optional()
});

const svgSchema = z.object({
  width: z.number(),
  height: z.number(),
  elements: z.array(svgElementSchema)
});

export const figureSchema = z.object({
  caption: z.string(),
  svg: svgSchema.optional(),
  img: z.object({
    src: z.string(),
    alt: z.string().optional()
  }).optional()
});

export type FigureSchema = z.infer<typeof figureSchema>;
