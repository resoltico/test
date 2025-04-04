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
        
        # Process forms in each section
        self._process_sections(document.content)
        
        return document
    
    def _process_sections(self, sections: List) -> None:
        """
        Process all sections recursively.
        
        Args:
            sections: List of sections to process.
        """
        for section in sections:
            # Process forms in this section
            self._process_section_forms(section)
            
            # Process child sections recursively
            if section.children:
                self._process_sections(section.children)
    
    def _process_section_forms(self, section) -> None:
        """
        Process forms for a single section.
        
        Args:
            section: The section to process.
        """
        forms = []
        
        # Find all forms in this section's raw content
        for element in section.raw_content_elements:
            if element.name == "form":
                forms.append(element)
        
        # Process each form
        for form in forms:
            form_dict = self._process_form(form)
            section.add_content(form_dict)
            
            logger.debug(
                "Added form to section", 
                section_title=section.title,
                form_id=form.get("id")
            )
    
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
        attributes = {}
        for attr in ["id", "name", "action", "method", "enctype", "target"]:
            if form.get(attr):
                attributes[attr] = form[attr]
        
        if attributes:
            result["attributes"] = attributes
        
        # Process fieldsets first
        for fieldset in form.find_all("fieldset", recursive=False):
            fieldset_data = self._process_fieldset(fieldset)
            if fieldset_data:
                result["fields"].append(fieldset_data)
        
        # Process direct form controls (not inside fieldsets)
        for field in form.find_all(["input", "select", "textarea", "button"], recursive=False):
            field_data = self._process_field(field)
            if field_data:
                result["fields"].append(field_data)
        
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
        
        # Process fields in the fieldset
        for field in fieldset.find_all(["input", "select", "textarea", "button"], recursive=False):
            field_data = self._process_field(field)
            if field_data:
                fieldset_data["fields"].append(field_data)
        
        # Check if we have any fields
        if not fieldset_data["fields"]:
            return None
            
        return fieldset_data
    
    def _process_field(self, field: Tag) -> Optional[FormField]:
        """
        Process a form field element.
        
        Args:
            field: The form field element to process.
            
        Returns:
            A dictionary representation of the field, or None if it's invalid.
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
            A dictionary representation of the input, or None if it's invalid.
        """
        # Get the input type
        input_type = input_field.get("type", "text")
        
        result: FormField = {
            "type": "input",
            "input_type": input_type
        }
        
        # Extract common attributes
        for attr in ["id", "name", "value", "placeholder", "required"]:
            if input_field.has_attr(attr):
                # Convert boolean attributes
                if attr == "required":
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
            A dictionary representation of the select, or None if it's invalid.
        """
        result: FormField = {
            "type": "select",
            "options": []
        }
        
        # Extract common attributes
        for attr in ["id", "name", "required", "multiple"]:
            if select.has_attr(attr):
                # Convert boolean attributes
                if attr in ["required", "multiple"]:
                    result[attr] = True
                else:
                    result[attr] = select[attr]
        
        # Process option groups and options
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
                    
                result["options"].append(option)
                
            elif child.name == "optgroup":
                optgroup = {
                    "label": child.get("label", ""),
                    "options": []
                }
                
                # Process options in the group
                for option in child.find_all("option"):
                    opt = {
                        "value": option.get("value", option.get_text().strip()),
                        "text": option.get_text().strip()
                    }
                    
                    if option.has_attr("selected"):
                        opt["selected"] = True
                        
                    optgroup["options"].append(opt)
                
                if optgroup["options"]:
                    result["options"].append(optgroup)
        
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
            A dictionary representation of the textarea, or None if it's invalid.
        """
        result: FormField = {
            "type": "textarea"
        }
        
        # Extract common attributes
        for attr in ["id", "name", "placeholder", "rows", "cols", "required"]:
            if textarea.has_attr(attr):
                # Convert boolean attributes
                if attr == "required":
                    result[attr] = True
                else:
                    result[attr] = textarea[attr]
        
        # Get content
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
            A dictionary representation of the button, or None if it's invalid.
        """
        result: FormField = {
            "type": "button",
            "button_type": button.get("type", "submit")
        }
        
        # Extract common attributes
        for attr in ["id", "name", "value"]:
            if button.has_attr(attr):
                result[attr] = button[attr]
        
        # Get text
        result["text"] = button.get_text().strip()
        
        return result
    
    def _find_label_for_field(self, field: Tag) -> Optional[str]:
        """
        Find the label text for a form field.
        
        Args:
            field: The form field element.
            
        Returns:
            The label text, or None if no label is found.
        """
        field_id = field.get("id")
        if field_id:
            # Look for a label with a matching "for" attribute
            form = field.find_parent("form")
            if form:
                label = form.find("label", attrs={"for": field_id})
                if label:
                    return label.get_text().strip()
        
        # Check if field is inside a label
        parent_label = field.find_parent("label")
        if parent_label:
            # Get label text excluding the field text
            field_text = field.get_text().strip()
            label_text = parent_label.get_text().strip()
            
            if field_text and field_text in label_text:
                return label_text.replace(field_text, "").strip()
            
            return label_text
        
        return None
