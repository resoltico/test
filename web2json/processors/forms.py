"""
Processor for HTML forms.
"""

from typing import Dict, List, Optional, TypeAlias, Any

import structlog
from bs4 import BeautifulSoup, Tag

from web2json.models.document import Document
from web2json.processors.base import ElementProcessor


logger = structlog.get_logger(__name__)

# Type alias for form field data
FormField: TypeAlias = Dict[str, Any]


class FormProcessor(ElementProcessor):
    """
    Processor for HTML form elements.
    
    Extracts form structure, fields, and attributes to create
    a structured representation of forms in the document.
    """
    
    def process(self, soup: BeautifulSoup, document: Document) -> Document:
        """
        Process form elements in the document.
        
        Args:
            soup: The BeautifulSoup object containing the parsed HTML.
            document: The Document object to enhance with processed elements.
            
        Returns:
            The enhanced Document object.
        """
        logger.info("Processing form elements")
        
        # Find all forms in the document
        forms = soup.find_all("form")
        if not forms:
            logger.debug("No forms found in document")
            return document
        
        logger.debug("Found forms", count=len(forms))
        
        # Process each form
        for form in forms:
            # Find parent section for this form
            parent_section = self.find_parent_section(document, form)
            
            if parent_section:
                # Process the form and add to the parent section
                form_dict = self._process_form(form)
                parent_section.add_content(form_dict)
                
                logger.debug(
                    "Added form to section", 
                    section=parent_section.title, 
                    form_id=form.get("id")
                )
        
        return document
    
    def _process_form(self, form: Tag) -> Dict[str, Any]:
        """
        Process a single form element.
        
        Args:
            form: The form element to process.
            
        Returns:
            A dictionary representation of the form.
        """
        result = {
            "type": "form",
            "fields": []
        }
        
        # Extract form attributes
        form_attrs = {}
        for attr in ["id", "name", "action", "method", "enctype", "target"]:
            if form.get(attr):
                form_attrs[attr] = form[attr]
        
        if form_attrs:
            result["attributes"] = form_attrs
        
        # Process fieldsets first
        fieldsets = []
        for fieldset in form.find_all("fieldset", recursive=True):
            fieldset_data = self._process_fieldset(fieldset)
            if fieldset_data:
                fieldsets.append(fieldset_data)
        
        # Process standalone form controls (not inside fieldsets)
        standalone_fields = []
        for field in form.find_all(["input", "select", "textarea", "button"], recursive=True):
            # Skip fields inside fieldsets (already processed)
            if field.find_parent("fieldset") or not field.parent:
                continue
                
            field_data = self._process_field(field)
            if field_data:
                standalone_fields.append(field_data)
        
        # Combine fieldsets and standalone fields
        result["fields"] = fieldsets + standalone_fields
        
        return result
    
    def _process_fieldset(self, fieldset: Tag) -> Optional[FormField]:
        """
        Process a fieldset element.
        
        Args:
            fieldset: The fieldset element to process.
            
        Returns:
            A dictionary representation of the fieldset, or None if it's empty.
        """
        fieldset_data = {
            "type": "fieldset",
            "fields": []
        }
        
        # Extract legend
        legend = fieldset.find("legend")
        if legend:
            fieldset_data["legend"] = legend.get_text().strip()
        
        # Extract fieldset attributes
        if fieldset.get("id"):
            fieldset_data["id"] = fieldset["id"]
        if fieldset.get("name"):
            fieldset_data["name"] = fieldset["name"]
        
        # Process fields in the fieldset
        fields = []
        for field in fieldset.find_all(["input", "select", "textarea", "button"], recursive=True):
            # Skip nested elements
            if field.parent == fieldset or field.parent.parent == fieldset:
                field_data = self._process_field(field)
                if field_data:
                    fields.append(field_data)
        
        if fields:
            fieldset_data["fields"] = fields
            return fieldset_data
        
        return None
    
    def _process_field(self, field: Tag) -> Optional[FormField]:
        """
        Process a form field element.
        
        Args:
            field: The form field element to process.
            
        Returns:
            A dictionary representation of the field, or None if it's not valid.
        """
        field_type = field.name
        
        if field_type == "input":
            return self._process_input(field)
        elif field_type == "select":
            return self._process_select(field)
        elif field_type == "textarea":
            return self._process_textarea(field)
        elif field_type == "button":
            return self._process_button(field)
        
        return None
    
    def _process_input(self, input_field: Tag) -> Optional[FormField]:
        """
        Process an input element.
        
        Args:
            input_field: The input element to process.
            
        Returns:
            A dictionary representation of the input, or None if it's not valid.
        """
        # Get the input type
        input_type = input_field.get("type", "text")
        
        result: FormField = {
            "type": "input",
            "input_type": input_type
        }
        
        # Extract common attributes
        for attr in ["id", "name", "value", "placeholder", "required", "disabled", "readonly"]:
            if input_field.has_attr(attr):
                # Convert boolean attributes
                if attr in ["required", "disabled", "readonly"]:
                    result[attr] = True
                else:
                    result[attr] = input_field[attr]
        
        # Handle specific input types
        if input_type in ["checkbox", "radio"]:
            if input_field.has_attr("checked"):
                result["checked"] = True
        elif input_type in ["number", "range"]:
            for attr in ["min", "max", "step"]:
                if input_field.has_attr(attr):
                    result[attr] = input_field[attr]
        elif input_type in ["date", "datetime-local", "month", "week", "time"]:
            for attr in ["min", "max"]:
                if input_field.has_attr(attr):
                    result[attr] = input_field[attr]
        
        # Find associated label
        label = self._find_label_for_field(input_field)
        if label:
            result["label"] = label
        
        return result
    
    def _process_select(self, select: Tag) -> Optional[FormField]:
        """
        Process a select element.
        
        Args:
            select: The select element to process.
            
        Returns:
            A dictionary representation of the select, or None if it's not valid.
        """
        result: FormField = {
            "type": "select",
            "options": []
        }
        
        # Extract common attributes
        for attr in ["id", "name", "required", "disabled", "multiple"]:
            if select.has_attr(attr):
                # Convert boolean attributes
                if attr in ["required", "disabled", "multiple"]:
                    result[attr] = True
                else:
                    result[attr] = select[attr]
        
        # Extract options and option groups
        options = []
        
        for child in select.children:
            if not isinstance(child, Tag):
                continue
                
            if child.name == "option":
                option = {
                    "value": child.get("value", child.get_text().strip()),
                    "text": child.get_text().strip()
                }
                
                if child.has_attr("selected"):
                    option["selected"] = True
                if child.has_attr("disabled"):
                    option["disabled"] = True
                    
                options.append(option)
                
            elif child.name == "optgroup":
                optgroup = {
                    "label": child.get("label", ""),
                    "options": []
                }
                
                if child.has_attr("disabled"):
                    optgroup["disabled"] = True
                
                # Process options in the option group
                group_options = []
                for option in child.find_all("option"):
                    opt = {
                        "value": option.get("value", option.get_text().strip()),
                        "text": option.get_text().strip()
                    }
                    
                    if option.has_attr("selected"):
                        opt["selected"] = True
                    if option.has_attr("disabled"):
                        opt["disabled"] = True
                        
                    group_options.append(opt)
                
                if group_options:
                    optgroup["options"] = group_options
                    options.append(optgroup)
        
        result["options"] = options
        
        # Find associated label
        label = self._find_label_for_field(select)
        if label:
            result["label"] = label
        
        return result
    
    def _process_textarea(self, textarea: Tag) -> Optional[FormField]:
        """
        Process a textarea element.
        
        Args:
            textarea: The textarea element to process.
            
        Returns:
            A dictionary representation of the textarea, or None if it's not valid.
        """
        result: FormField = {
            "type": "textarea"
        }
        
        # Extract common attributes
        for attr in ["id", "name", "placeholder", "rows", "cols", "required", "disabled", "readonly"]:
            if textarea.has_attr(attr):
                # Convert boolean attributes
                if attr in ["required", "disabled", "readonly"]:
                    result[attr] = True
                else:
                    result[attr] = textarea[attr]
        
        # Get the default value (content)
        result["value"] = textarea.get_text().strip()
        
        # Find associated label
        label = self._find_label_for_field(textarea)
        if label:
            result["label"] = label
        
        return result
    
    def _process_button(self, button: Tag) -> Optional[FormField]:
        """
        Process a button element.
        
        Args:
            button: The button element to process.
            
        Returns:
            A dictionary representation of the button, or None if it's not valid.
        """
        result: FormField = {
            "type": "button",
            "button_type": button.get("type", "submit")
        }
        
        # Extract common attributes
        for attr in ["id", "name", "value", "disabled"]:
            if button.has_attr(attr):
                # Convert boolean attributes
                if attr in ["disabled"]:
                    result[attr] = True
                else:
                    result[attr] = button[attr]
        
        # Get the button text
        result["text"] = button.get_text().strip()
        
        return result
    
    def _find_label_for_field(self, field: Tag) -> Optional[str]:
        """
        Find the label text for a form field.
        
        Args:
            field: The form field element.
            
        Returns:
            The label text, or None if no label was found.
        """
        field_id = field.get("id")
        if field_id:
            # Look for a label with a matching "for" attribute
            form = field.find_parent("form")
            if form:
                label = form.find("label", attrs={"for": field_id})
                if label:
                    return label.get_text().strip()
        
        # Check if the field is inside a label
        parent_label = field.find_parent("label")
        if parent_label:
            # Extract label text excluding the field itself
            text = parent_label.get_text().strip()
            if field.get_text().strip():
                text = text.replace(field.get_text().strip(), "").strip()
            return text
        
        return None
