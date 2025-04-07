// src/processors/form.ts
import * as cheerio from 'cheerio';
import { Element } from 'domhandler';
import { Form, FormField, FormFieldOption, FormFieldOptionsGroup } from '../schema/form.js';
import { cleanHtmlContent, extractTextContent } from '../utils/html.js';

/**
 * Process a form element
 */
export function processForm($: cheerio.CheerioAPI, formElement: Element): Form {
  const $form = $(formElement);
  const form: Form = {
    fields: []
  };
  
  // Get form title from legend if available
  const $legend = $form.find('fieldset > legend').first();
  if ($legend.length > 0) {
    form.title = extractTextContent($legend.html() || '');
  }
  
  // Process form fields
  $form.find('input, select, textarea, meter, progress, output').each((_, el) => {
    const $el = $(el);
    const field: FormField = {
      label: '',
      type: $el.attr('type') || el.tagName
    };
    
    // Try to find associated label
    const id = $el.attr('id');
    if (id) {
      const $label = $form.find(`label[for="${id}"]`);
      if ($label.length > 0) {
        field.label = extractTextContent($label.html() || '');
      }
    }
    
    // If no label found through for/id, try parent label
    if (!field.label) {
      const $parentLabel = $el.closest('label');
      if ($parentLabel.length > 0) {
        // Extract label text without the input element text
        const labelClone = $parentLabel.clone();
        labelClone.find('input, select, textarea, meter, progress, output').remove();
        field.label = extractTextContent(labelClone.html() || '');
      } else {
        field.label = $el.attr('placeholder') || $el.attr('name') || 'Unlabeled Field';
      }
    }
    
    // Check if required
    if ($el.attr('required') !== undefined) {
      field.required = true;
    }
    
    // Handle select options
    if (el.tagName === 'select') {
      const options: Array<string | FormFieldOption | FormFieldOptionsGroup> = [];
      
      // Handle option groups
      $el.find('optgroup').each((_, group) => {
        const $group = $(group);
        const groupLabel = $group.attr('label') || '';
        
        const groupOptions = $group.find('option')
          .map((_, option) => {
            const $option = $(option);
            return {
              value: $option.attr('value') || $option.text(),
              text: $option.text()
            };
          })
          .get();
        
        if (groupOptions.length > 0) {
          options.push({
            group: groupLabel,
            items: groupOptions
          });
        }
      });
      
      // Handle direct options (not in groups)
      const directOptions = $el.find('> option')
        .map((_, option) => {
          const $option = $(option);
          return {
            value: $option.attr('value') || $option.text(),
            text: $option.text()
          };
        })
        .get();
      
      if (directOptions.length > 0) {
        options.push(...directOptions);
      }
      
      if (options.length > 0) {
        field.options = options;
      }
      
      // Check if multiple
      if ($el.attr('multiple') !== undefined) {
        field.multiple = true;
      }
    }
    
    // Handle number inputs
    if (field.type === 'number') {
      if ($el.attr('min') !== undefined) {
        field.min = parseInt($el.attr('min') || '0', 10);
      }
      if ($el.attr('max') !== undefined) {
        field.max = parseInt($el.attr('max') || '100', 10);
      }
    }
    
    // Handle meters and progress
    if (el.tagName === 'meter' || el.tagName === 'progress') {
      if ($el.attr('min') !== undefined) {
        field.min = parseFloat($el.attr('min') || '0');
      }
      if ($el.attr('max') !== undefined) {
        field.max = parseFloat($el.attr('max') || '100');
      }
      if ($el.attr('value') !== undefined) {
        field.value = $el.attr('value') || '';
      }
    }
    
    // Handle textarea dimensions
    if (el.tagName === 'textarea') {
      if ($el.attr('rows') !== undefined) {
        field.rows = parseInt($el.attr('rows') || '3', 10);
      }
      if ($el.attr('cols') !== undefined) {
        field.cols = parseInt($el.attr('cols') || '20', 10);
      }
    }
    
    // Handle datalist
    const listId = $el.attr('list');
    if (listId) {
      const $datalist = $(`#${listId}`);
      if ($datalist.length > 0) {
        const options = $datalist.find('option')
          .map((_, option) => $(option).attr('value') || $(option).text())
          .get();
        
        if (options.length > 0) {
          field.options = options;
        }
      }
    }
    
    form.fields.push(field);
  });
  
  // Get form submit button text
  const $submit = $form.find('button[type="submit"], input[type="submit"]').first();
  if ($submit.length > 0) {
    form.submit = $submit.attr('value') || $submit.text() || 'Submit';
  }
  
  return form;
}
