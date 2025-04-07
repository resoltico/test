import { Form, FormField, FormFieldOption, FormFieldOptionGroup } from '../schema/form.js';
import { logger } from '../utils/logger.js';

/**
 * Process a form element into structured JSON format
 */
export function processForm(formElement: Element): Form {
  logger.debug('Processing form element');
  
  // Extract form title from fieldset/legend or create a default
  const legend = formElement.querySelector('legend');
  const title = legend ? legend.textContent || 'Form' : 'Form';
  
  // Process form fields
  const fields = extractFormFields(formElement);
  
  // Extract submit button text
  const submitButton = formElement.querySelector('button[type="submit"]');
  const submit = submitButton ? submitButton.textContent || 'Submit' : 'Submit';
  
  // Create the form object
  return {
    title,
    fields,
    submit
  };
}

/**
 * Extract all form fields from the form element
 */
function extractFormFields(formElement: Element): FormField[] {
  const fields: FormField[] = [];
  
  // Find all form control elements
  const fieldElements = formElement.querySelectorAll('input, select, textarea');
  
  for (const element of Array.from(fieldElements)) {
    // Skip hidden, submit, and button inputs
    const type = element.getAttribute('type') || element.tagName.toLowerCase();
    if (['hidden', 'submit', 'button', 'image', 'reset'].includes(type)) {
      continue;
    }
    
    // Process the field
    const field = processFormField(element, formElement);
    if (field) {
      fields.push(field);
    }
  }
  
  return fields;
}

/**
 * Process an individual form field element
 */
function processFormField(element: Element, formElement: Element): FormField | null {
  const elementType = element.tagName.toLowerCase();
  const inputType = element.getAttribute('type') || elementType;
  const id = element.getAttribute('id');
  
  // Find the label for this field
  let label = '';
  
  if (id) {
    // Try to find a label with matching 'for' attribute
    const labelElement = formElement.querySelector(`label[for="${id}"]`);
    if (labelElement) {
      label = labelElement.textContent || '';
    }
  }
  
  // If no label found, look for a preceding label
  if (!label && element.previousElementSibling?.tagName.toLowerCase() === 'label') {
    label = element.previousElementSibling.textContent || '';
  }
  
  // If still no label, use a fallback
  if (!label) {
    label = element.getAttribute('name') || element.getAttribute('placeholder') || inputType;
  }
  
  // Trim the label and add a colon if not present
  label = label.trim();
  if (!label.endsWith(':')) {
    label += ':';
  }
  
  // Create the base field
  const field: FormField = {
    label,
    type: inputType
  };
  
  // Add required attribute if present
  if (element.hasAttribute('required')) {
    field.required = true;
  }
  
  // Add multiple attribute for multi-select
  if (elementType === 'select' && element.hasAttribute('multiple')) {
    field.multiple = true;
  }
  
  // Process min/max for range and number inputs
  if (['range', 'number'].includes(inputType)) {
    const min = element.getAttribute('min');
    const max = element.getAttribute('max');
    
    if (min) field.min = parseInt(min, 10);
    if (max) field.max = parseInt(max, 10);
  }
  
  // Process rows/cols for textarea
  if (elementType === 'textarea') {
    const rows = element.getAttribute('rows');
    const cols = element.getAttribute('cols');
    
    if (rows) field.rows = parseInt(rows, 10);
    if (cols) field.cols = parseInt(cols, 10);
  }
  
  // Process options for select elements
  if (elementType === 'select') {
    field.options = extractSelectOptions(element as HTMLSelectElement);
  }
  
  // Process datalist for input elements with list attribute
  const listId = element.getAttribute('list');
  if (listId) {
    const datalist = formElement.ownerDocument.getElementById(listId);
    if (datalist) {
      field.options = extractDatalistOptions(datalist);
    }
  }
  
  return field;
}

/**
 * Extract options from a select element
 */
function extractSelectOptions(selectElement: HTMLSelectElement): Array<string | FormFieldOption | FormFieldOptionGroup> {
  const options: Array<string | FormFieldOption | FormFieldOptionGroup> = [];
  
  // Check if there are option groups
  const optgroups = selectElement.querySelectorAll('optgroup');
  
  if (optgroups.length > 0) {
    // Process option groups
    for (const group of Array.from(optgroups)) {
      const groupLabel = group.getAttribute('label') || 'Group';
      const items: FormFieldOption[] = [];
      
      // Process options within this group
      const groupOptions = group.querySelectorAll('option');
      for (const option of Array.from(groupOptions)) {
        const value = option.getAttribute('value') || '';
        const label = option.textContent || '';
        
        items.push({ value, label });
      }
      
      options.push({ group: groupLabel, items });
    }
  } else {
    // Process options directly
    const selectOptions = selectElement.querySelectorAll('option');
    for (const option of Array.from(selectOptions)) {
      const value = option.getAttribute('value') || '';
      const label = option.textContent || '';
      
      // Use simple string options when value matches label
      if (value === label) {
        options.push(value);
      } else {
        options.push({ value, label });
      }
    }
  }
  
  return options;
}

/**
 * Extract options from a datalist element
 */
function extractDatalistOptions(datalist: HTMLElement): string[] {
  const options: string[] = [];
  
  // Process all option elements
  const optionElements = datalist.querySelectorAll('option');
  for (const option of Array.from(optionElements)) {
    const value = option.getAttribute('value') || '';
    options.push(value);
  }
  
  return options;
}
