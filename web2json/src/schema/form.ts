import { z } from 'zod';

// Schema for form fields with various types
const formFieldOptionSchema = z.object({
  value: z.string(),
  label: z.string().optional(),
});

const formFieldOptionGroupSchema = z.object({
  group: z.string(),
  items: z.array(
    z.union([
      z.string(),
      formFieldOptionSchema
    ])
  ),
});

const formFieldSchema = z.object({
  label: z.string(),
  type: z.string(),
  required: z.boolean().optional(),
  options: z.array(
    z.union([
      z.string(),
      formFieldOptionSchema,
      formFieldOptionGroupSchema
    ])
  ).optional(),
  multiple: z.boolean().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  value: z.union([z.string(), z.number()]).optional(),
  rows: z.number().optional(),
  cols: z.number().optional(),
});

// Schema for forms
export const formSchema = z.object({
  title: z.string(),
  fields: z.array(formFieldSchema),
  submit: z.string().optional(),
});

export type Form = z.infer<typeof formSchema>;
export type FormField = z.infer<typeof formFieldSchema>;
