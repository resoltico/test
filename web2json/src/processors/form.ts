import { Form, FormField, FormFieldOption, FormFieldOptionGroup } from '../schema/form.js';
import { logger } from '../utils/logger.js';
import { normalizeTextContent } from '../utils/html.js';

/**
 * Process a form element into structured JSON format
 */
export function processForm(formElement: Element): Form {
  logger.debug('Processing form element');
  
  // Extract form title from fieldset/legend or create a default
  let title = 'Form';
  
  // First check for a legend in a fieldset
  const fieldset = formElement.querySelector('fieldset');
  if (fieldset) {
    const legend = fieldset.querySelector('legend');
    if (legend) {
      title = normalizeTextContent(legend.textContent || 'Form');
    }
  }
  
  // Process form fields
  const fields = extractFormFields(formElement);
  
  // Extract submit button text
  const submitButton = formElement.querySelector('button[type="submit"], input[type="submit"]');
  let submit = 'Submit';
  
  if (submitButton) {
    if (submitButton.tagName.toLowerCase() === 'button') {
      submit = normalizeTextContent(submitButton.textContent || 'Submit');
    } else { // input[type="submit"]
      submit = normalizeTextContent(submitButton.getAttribute('value') || 'Submit');
    }
  }
  
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
  
  // Find the fieldset if present (to limit our scope)
  const fieldset = formElement.querySelector('fieldset') || formElement;
  
  // Find all form control elements
  const fieldElements = fieldset.querySelectorAll(
    'input, select, textarea, meter, progress, output, button[type="button"]'
  );
  
  for (const element of Array.from(fieldElements)) {
    // Skip hidden, submit, reset, and button inputs
    const type = element.getAttribute('type') || element.tagName.toLowerCase();
    if (['hidden', 'submit', 'button', 'image', 'reset'].includes(type.toLowerCase())) {
      continue;
    }
    
    // Process the field
    const field = processFormField(element, fieldset);
    if (field) {
      fields.push(field);
    }
  }
  
  return fields;
}

/**
 * Process an individual form field element
 */
function processFormField(element: Element, container: Element): FormField | null {
  const elementType = element.tagName.toLowerCase();
  const inputType = element.getAttribute('type') || elementType;
  const id = element.getAttribute('id');
  const name = element.getAttribute('name');
  
  // Find the label for this field using multiple approaches
  let label = '';
  
  // Approach 1: Try to find a label with matching 'for' attribute
  if (id) {
    const labelElement = container.querySelector(`label[for="${id}"]`);
    if (labelElement) {
      label = normalizeTextContent(labelElement.textContent || '');
    }
  }
  
  // Approach 2: Check if the element is inside a label
  if (!label) {
    const parentLabel = element.closest('label');
    if (parentLabel) {
      // Clone the label to remove the input element before getting text
      const labelClone = parentLabel.cloneNode(true) as Element;
      const inputInLabel = labelClone.querySelector(elementType);
      if (inputInLabel) {
        inputInLabel.remove();
      }
      label = normalizeTextContent(labelClone.textContent || '');
    }
  }
  
  // Approach 3: If no label found, look for a preceding label
  if (!label && element.previousElementSibling?.tagName.toLowerCase() === 'label') {
    label = normalizeTextContent(element.previousElementSibling.textContent || '');
  }
  
  // If still no label, use a fallback
  if (!label) {
    label = name || element.getAttribute('placeholder') || 
            element.getAttribute('aria-label') || inputType;
  }
  
  // Trim the label and add a colon if not present
  label = label.trim();
  if (!label.endsWith(':')) {
    label += ':';
  }
  
  // Create the base field
  const field: FormField = {
    label,
    type: inputType.toLowerCase()
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
  if (['range', 'number', 'meter', 'progress'].includes(inputType.toLowerCase())) {
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
    const datalist = container.ownerDocument.getElementById(listId);
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
        const value = option.getAttribute('value') || option.textContent || '';
        const label = normalizeTextContent(option.textContent || '');
        
        items.push({ value, label });
      }
      
      if (items.length > 0) {
        options.push({ group: groupLabel, items });
      }
    }
  } else {
    // Process options directly
    const selectOptions = selectElement.querySelectorAll('option');
    for (const option of Array.from(selectOptions)) {
      const value = option.getAttribute('value') || '';
      const label = normalizeTextContent(option.textContent || '');
      
      // Use simple string options when value matches label
      if (value === label || (!value && label)) {
        options.push(label);
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
    const value = option.getAttribute('value') || option.textContent || '';
    options.push(value);
  }
  
  return options;
}