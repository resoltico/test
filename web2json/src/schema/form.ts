// src/schema/form.ts
import { z } from 'zod';

// Schema for form field options
export const FormFieldOptionSchema = z.object({
  value: z.string(),
  text: z.string().optional()
});

export const FormFieldOptionsGroupSchema = z.object({
  group: z.string(),
  items: z.array(z.union([z.string(), FormFieldOptionSchema]))
});

export const FormFieldSchema = z.object({
  label: z.string(),
  type: z.string(),
  required: z.boolean().optional(),
  multiple: z.boolean().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  rows: z.number().optional(),
  cols: z.number().optional(),
  value: z.string().optional(),
  options: z.array(
    z.union([z.string(), FormFieldOptionSchema, FormFieldOptionsGroupSchema])
  ).optional()
});

// Schema for entire form
export const FormSchema = z.object({
  title: z.string().optional(),
  fields: z.array(FormFieldSchema),
  submit: z.string().optional()
});

export type Form = z.infer<typeof FormSchema>;
export type FormField = z.infer<typeof FormFieldSchema>;
export type FormFieldOption = z.infer<typeof FormFieldOptionSchema>;
export type FormFieldOptionsGroup = z.infer<typeof FormFieldOptionsGroupSchema>;
