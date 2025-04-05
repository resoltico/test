"""
Form processor for handling HTML forms and form elements.
"""

from typing import Dict, List, Any, Optional

import structlog
from bs4 import Tag

from web2json.models.section import Section
from web2json.processors.base import ElementProcessor


logger = structlog.get_logger(__name__)


class FormProcessor(ElementProcessor):
    """
    Processor for HTML form elements.
    
    This processor extracts structured data from form elements,
    including fields, buttons, and other form controls.
    """
    
    def process(self, element: Tag, section: Section) -> None:
        """
        Process a form element and add the result to the section.
        
        Args:
            element: The form element to process.
            section: The section to add the processed content to.
        """
        if element.name != "form":
            return
        
        # Create a form structure
        form_data = {
            "type": "form",
            "title": "",
            "fields": []
        }
        
        # Extract form attributes
        form_attrs = self.get_attributes(element)
        if "action" in form_attrs:
            form_data["action"] = form_attrs["action"]
        
        if "method" in form_attrs:
            form_data["method"] = form_attrs["method"]
        
        # Extract form title from legend if present
        legend = element.find("legend")
        if legend:
            form_data["title"] = legend.get_text().strip()
        
        # Process fieldsets
        for fieldset in element.find_all("fieldset"):
            self._process_fieldset(fieldset, form_data)
        
        # Process form fields outside fieldsets
        for field in element.find_all(["input", "select", "textarea", "button", "output", "datalist"]):
            # Skip fields inside fieldsets (already processed)
            if field.find_parent("fieldset") and field.find_parent("fieldset") in element.find_all("fieldset"):
                continue
            
            field_data = self._process_field(field)
            if field_data:
                form_data["fields"].append(field_data)
        
        # Add the form to the section content
        section.add_content(form_data)
    
    def _process_fieldset(self, fieldset: Tag, form_data: Dict[str, Any]) -> None:
        """
        Process a fieldset element.
        
        Args:
            fieldset: The fieldset element.
            form_data: The form data dictionary to update.
        """
        # Get fieldset legend
        legend = fieldset.find("legend")
        fieldset_title = legend.get_text().strip() if legend else ""
        
        # Process fields in the fieldset
        for field in fieldset.find_all(["input", "select", "textarea", "button", "output", "datalist"]):
            field_data = self._process_field(field)
            if field_data:
                # Add fieldset title to field data
                if fieldset_title:
                    field_data["group"] = fieldset_title
                
                form_data["fields"].append(field_data)
    
    def _process_field(self, field: Tag) -> Optional[Dict[str, Any]]:
        """
        Process a form field element.
        
        Args:
            field: The form field element.
            
        Returns:
            A dictionary with field data, or None if the field is not valid.
        """
        field_type = field.get("type", "text") if field.name == "input" else field.name
        
        # Create field data
        field_data = {
            "type": field_type,
            "name": field.get("name", "")
        }
        
        # Add label text if available
        field_id = field.get("id")
        if field_id:
            label = field.find_previous("label", attrs={"for": field_id})
            if not label:
                label = field.find_next("label", attrs={"for": field_id})
            
            if label:
                field_data["label"] = label.get_text().strip()
        
        # Process specific field types
        if field.name == "input":
            return self._process_input_field(field, field_data)
        elif field.name == "select":
            return self._process_select_field(field, field_data)
        elif field.name == "textarea":
            return self._process_textarea_field(field, field_data)
        elif field.name == "button":
            return self._process_button_field(field, field_data)
        elif field.name == "output":
            return self._process_output_field(field, field_data)
        elif field.name == "datalist":
            return self._process_datalist_field(field, field_data)
        
        return field_data
    
    def _process_input_field(self, field: Tag, field_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process an input field.
        
        Args:
            field: The input field element.
            field_data: The field data dictionary to update.
            
        Returns:
            The updated field data dictionary.
        """
        # Copy all relevant attributes
        for attr in ["value", "placeholder", "min", "max", "step", "pattern", "required", "readonly", "disabled"]:
            if field.has_attr(attr):
                # For boolean attributes, just check if they exist
                if field[attr] in [None, "", True]:
                    field_data[attr] = True
                else:
                    field_data[attr] = field[attr]
        
        # Process checkbox and radio fields
        if field["type"] in ["checkbox", "radio"]:
            field_data["checked"] = field.has_attr("checked")
        
        return field_data
    
    def _process_select_field(self, field: Tag, field_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a select field.
        
        Args:
            field: The select field element.
            field_data: The field data dictionary to update.
            
        Returns:
            The updated field data dictionary.
        """
        # Copy all relevant attributes
        for attr in ["required", "multiple", "disabled"]:
            if field.has_attr(attr):
                field_data[attr] = True
        
        # Process options
        options = []
        for option in field.find_all("option"):
            option_data = {
                "value": option.get("value", option.get_text().strip()),
                "text": option.get_text().strip(),
                "selected": option.has_attr("selected")
            }
            
            options.append(option_data)
        
        # Process option groups
        optgroups = []
        for optgroup in field.find_all("optgroup"):
            optgroup_data = {
                "label": optgroup.get("label", ""),
                "options": []
            }
            
            for option in optgroup.find_all("option"):
                option_data = {
                    "value": option.get("value", option.get_text().strip()),
                    "text": option.get_text().strip(),
                    "selected": option.has_attr("selected")
                }
                
                optgroup_data["options"].append(option_data)
            
            optgroups.append(optgroup_data)
        
        # Add options and optgroups to field data
        if options:
            field_data["options"] = options
        
        if optgroups:
            field_data["optgroups"] = optgroups
        
        return field_data
    
    def _process_textarea_field(self, field: Tag, field_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a textarea field.
        
        Args:
            field: The textarea field element.
            field_data: The field data dictionary to update.
            
        Returns:
            The updated field data dictionary.
        """
        # Copy all relevant attributes
        for attr in ["rows", "cols", "placeholder", "required", "readonly", "disabled"]:
            if field.has_attr(attr):
                # For boolean attributes, just check if they exist
                if field[attr] in [None, "", True]:
                    field_data[attr] = True
                else:
                    field_data[attr] = field[attr]
        
        # Add default value
        if field.string:
            field_data["value"] = field.string.strip()
        
        return field_data
    
    def _process_button_field(self, field: Tag, field_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a button field.
        
        Args:
            field: The button field element.
            field_data: The field data dictionary to update.
            
        Returns:
            The updated field data dictionary.
        """
        # Copy all relevant attributes
        for attr in ["disabled", "formaction", "formmethod", "formtarget"]:
            if field.has_attr(attr):
                # For boolean attributes, just check if they exist
                if field[attr] in [None, "", True]:
                    field_data[attr] = True
                else:
                    field_data[attr] = field[attr]
        
        # Add button text
        field_data["text"] = field.get_text().strip()
        
        return field_data
    
    def _process_output_field(self, field: Tag, field_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process an output field.
        
        Args:
            field: The output field element.
            field_data: The field data dictionary to update.
            
        Returns:
            The updated field data dictionary.
        """
        # Copy all relevant attributes
        for attr in ["for"]:
            if field.has_attr(attr):
                field_data[attr] = field[attr]
        
        # Add output text
        field_data["text"] = field.get_text().strip()
        
        return field_data
    
    def _process_datalist_field(self, field: Tag, field_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a datalist field.
        
        Args:
            field: The datalist field element.
            field_data: The field data dictionary to update.
            
        Returns:
            The updated field data dictionary.
        """
        # Process options
        options = []
        for option in field.find_all("option"):
            option_data = {
                "value": option.get("value", option.get_text().strip())
            }
            
            options.append(option_data)
        
        # Add options to field data
        if options:
            field_data["options"] = options
        
        return field_data
