import { z } from 'zod';

// Schema for form field options (like dropdown options)
const formFieldOptionItemSchema = z.object({
  value: z.string(),
  label: z.string()
});

// Schema for option groups
const formFieldOptionGroupSchema = z.object({
  group: z.string(),
  items: z.array(formFieldOptionItemSchema)
});

// Schema for individual form fields
const formFieldSchema = z.object({
  label: z.string(),
  type: z.string(),
  required: z.boolean().optional(),
  multiple: z.boolean().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  rows: z.number().optional(),
  cols: z.number().optional(),
  options: z.array(
    z.union([
      z.string(),
      formFieldOptionItemSchema,
      formFieldOptionGroupSchema
    ])
  ).optional()
});

// Schema for complete forms
export const formSchema = z.object({
  title: z.string(),
  fields: z.array(formFieldSchema),
  submit: z.string().optional()
});

export type Form = z.infer<typeof formSchema>;
export type FormField = z.infer<typeof formFieldSchema>;
export type FormFieldOption = z.infer<typeof formFieldOptionItemSchema>;
export type FormFieldOptionGroup = z.infer<typeof formFieldOptionGroupSchema>;
