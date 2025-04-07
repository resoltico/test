import { z } from 'zod';

const formFieldSchema = z.object({
  label: z.string(),
  type: z.string(),
  required: z.boolean().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  options: z.array(z.string()).or(
    z.array(
      z.object({
        group: z.string(),
        items: z.array(z.string())
      })
    )
  ).optional(),
  multiple: z.boolean().optional(),
  rows: z.number().optional(),
  cols: z.number().optional()
});

export const formSchema = z.object({
  title: z.string(),
  fields: z.array(formFieldSchema),
  submit: z.string()
});

export type FormSchema = z.infer<typeof formSchema>;
export type FormFieldSchema = z.infer<typeof formFieldSchema>;
