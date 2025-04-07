import * as cheerio from 'cheerio';
import type { FormSchema, FormFieldSchema } from '../../models/elements/form.js';
import { logger } from '../../utils/logger.js';

export function processForm($form: cheerio.Cheerio<cheerio.Element>): FormSchema {
  const result: FormSchema = {
    title: '',
    fields: [],
    submit: 'Submit'
  };

  // Get form title from legend or first heading
  const $legend = $form.find('legend').first();
  if ($legend.length) {
    result.title = $legend.text().trim();
  } else {
    const $heading = $form.find('h1, h2, h3, h4, h5, h6').first();
    if ($heading.length) {
      result.title = $heading.text().trim();
    }
  }

  // Process form fields
  $form.find('input, select, textarea').each((_, element) => {
    const $el = cheerio.load(element);
    const type = $el(element).attr('type') || $el(element).prop('tagName').toLowerCase();
    const id = $el(element).attr('id');
    let label = '';

    // Find label for this field
    if (id) {
      const $label = $form.find(`label[for="${id}"]`);
      if ($label.length) {
        label = $label.text().trim();
      }
    }

    // If no label found with 'for' attribute, look for parent label
    if (!label && $el(element).parent().is('label')) {
      label = $el(element).parent().text().trim();
      // Remove the input's own text if contained in the label
      const ownText = $el(element).val() as string;
      if (ownText) {
        label = label.replace(ownText, '').trim();
      }
    }

    const field: FormFieldSchema = {
      label,
      type
    };

    // Add required attribute if present
    if ($el(element).attr('required') !== undefined) {
      field.required = true;
    }

    // Handle min/max attributes for number inputs
    if (type === 'number') {
      const min = $el(element).attr('min');
      const max = $el(element).attr('max');
      
      if (min !== undefined) {
        field.min = parseInt(min, 10);
      }
      
      if (max !== undefined) {
        field.max = parseInt(max, 10);
      }
    }

    // Handle select fields
    if (element.tagName.toLowerCase() === 'select') {
      if ($el(element).attr('multiple') !== undefined) {
        field.multiple = true;
      }

      // Process option groups
      const $optgroups = $el(element).find('optgroup');
      if ($optgroups.length) {
        field.options = [];
        $optgroups.each((_, optgroup) => {
          const $optgroup = cheerio.load(optgroup);
          const groupLabel = $optgroup(optgroup).attr('label') || '';
          const items: string[] = [];
          
          $optgroup(optgroup).find('option').each((_, option) => {
            items.push($optgroup(option).text().trim());
          });
          
          if (Array.isArray(field.options)) {
            field.options.push({
              group: groupLabel,
              items
            });
          }
        });
      } else {
        // Process simple options
        field.options = $el(element).find('option').map((_, option) => {
          return $el(option).text().trim();
        }).get();
      }
    }

    // Handle textarea dimensions
    if (element.tagName.toLowerCase() === 'textarea') {
      const rows = $el(element).attr('rows');
      const cols = $el(element).attr('cols');
      
      if (rows !== undefined) {
        field.rows = parseInt(rows, 10);
      }
      
      if (cols !== undefined) {
        field.cols = parseInt(cols, 10);
      }
    }

    // Handle datalist
    if (type === 'text' && $el(element).attr('list')) {
      const listId = $el(element).attr('list');
      const $datalist = $form.find(`datalist#${listId}`);
      
      if ($datalist.length) {
        field.options = $datalist.find('option').map((_, option) => {
          return $el(option).val() as string;
        }).get();
      }
    }

    result.fields.push(field);
  });

  // Get submit button text
  const $submitButton = $form.find('button[type="submit"], input[type="submit"]').first();
  if ($submitButton.length) {
    const submitText = $submitButton.attr('value') || $submitButton.text().trim();
    if (submitText) {
      result.submit = submitText;
    }
  }

  logger.debug(`Processed form with ${result.fields.length} fields`);
  return result;
}
