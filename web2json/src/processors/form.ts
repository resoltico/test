import { Form, FormField } from '../schema/form.js';
import { normalizeTextContent } from '../utils/html.js';

/**
 * Process a form element
 */
export function processForm(formElement: Element): Form {
  // Extract form title from legend
  const legendElement = formElement.querySelector('legend');
  const title = legendElement 
    ? legendElement.textContent || '' 
    : 'Form';
  
  // Process form fields
  const fields: FormField[] = [];
  
  // Process input elements
  const inputElements = formElement.querySelectorAll('input, select, textarea');
  
  inputElements.forEach(input => {
    const field = processFormField(input, formElement);
    if (field) {
      fields.push(field);
    }
  });
  
  // Extract submit button text
  const submitButton = formElement.querySelector('button[type="submit"]');
  const submit = submitButton 
    ? submitButton.textContent || ''
    : 'Submit';
  
  // Create the form object
  return {
    title,
    fields,
    submit
  };
}

/**
 * Process an individual form field
 */
function processFormField(input: Element, formElement: Element): FormField | null {
  const inputType = input.getAttribute('type') || input.tagName.toLowerCase();
  const inputId = input.getAttribute('id');
  
  // Skip hidden, submit, and button inputs
  if (['hidden', 'submit', 'button', 'image'].includes(inputType)) {
    return null;
  }
  
  // Find the label for this input
  let labelText = '';
  if (inputId) {
    const labelElement = formElement.querySelector(`label[for="${inputId}"]`);
    if (labelElement) {
      labelText = labelElement.textContent || '';
    }
  }
  
  // If no label was found, use a fallback
  if (!labelText) {
    labelText = inputId ? `Field ${inputId}` : 'Unnamed field';
  }
  
  // Create the base field object
  const field: FormField = {
    label: labelText,
    type: inputType
  };
  
  // Add required attribute if present
  if (input.hasAttribute('required')) {
    field.required = true;
  }
  
  // Process min/max attributes for number inputs
  if (inputType === 'number') {
    const min = input.getAttribute('min');
    const max = input.getAttribute('max');
    
    if (min) field.min = parseInt(min, 10);
    if (max) field.max = parseInt(max, 10);
  }
  
  // Process options for select elements
  if (input.tagName.toLowerCase() === 'select') {
    field.options = [];
    
    // Check if multiple selection is allowed
    if (input.hasAttribute('multiple')) {
      field.multiple = true;
    }
    
    // Process option groups
    const optgroups = input.querySelectorAll('optgroup');
    if (optgroups.length > 0) {
      optgroups.forEach(group => {
        const groupLabel = group.getAttribute('label') || 'Group';
        const groupItems = Array.from(group.querySelectorAll('option')).map(option => {
          const value = option.getAttribute('value') || '';
          const label = option.textContent || '';
          return { value, label };
        });
        
        field.options?.push({
          group: groupLabel,
          items: groupItems
        });
      });
    } else {
      // Process regular options
      const options = input.querySelectorAll('option');
      options.forEach(option => {
        const value = option.getAttribute('value') || '';
        const label = option.textContent || '';
        field.options?.push(value);
      });
    }
  }
  
  // Process attributes for text area
  if (input.tagName.toLowerCase() === 'textarea') {
    const rows = input.getAttribute('rows');
    const cols = input.getAttribute('cols');
    
    if (rows) field.rows = parseInt(rows, 10);
    if (cols) field.cols = parseInt(cols, 10);
  }
  
  // Process datalist for inputs with list attribute
  const listId = input.getAttribute('list');
  if (listId) {
    const datalist = formElement.ownerDocument.getElementById(listId);
    if (datalist) {
      field.options = [];
      const options = datalist.querySelectorAll('option');
      options.forEach(option => {
        const value = option.getAttribute('value') || '';
        field.options?.push(value);
      });
    }
  }
  
  return field;
}