"""
Processor for HTML forms.
"""

from typing import Dict, List, Optional, Any, Union, cast

import structlog
from bs4 import BeautifulSoup, Tag

from web2json.models.document import Document
from web2json.models.section import Section
from web2json.processors.base import ElementProcessor, ContentItem


logger = structlog.get_logger(__name__)


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
        
        # Process each section's content for forms
        self.process_sections(document.content)
        
        return document
    
    def process_section_content(self, section: Section) -> None:
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
    
    def _process_form(self, form: Tag) -> ContentItem:
        """
        Process a single form element.
        
        Args:
            form: The form element to process.
            
        Returns:
            A dictionary representation of the form.
        """
        # Create a form content object
        result = self.create_content_object(
            element_type="form",
            element_id=form.get("id")
        )
        
        # Extract form attributes
        attributes = {}
        for attr in ["action", "method", "enctype", "target", "name"]:
            if form.has_attr(attr):
                attributes[attr] = form[attr]
        
        if attributes:
            result["attributes"] = attributes
        
        # Process form fields
        fields = []
        
        # Process fieldsets first
        for fieldset in form.find_all("fieldset", recursive=False):
            fieldset_data = self._process_fieldset(fieldset)
            if fieldset_data:
                fields.append(fieldset_data)
        
        # Process direct form controls (not inside fieldsets)
        for field in form.find_all(["input", "select", "textarea", "button"], recursive=False):
            field_data = self._process_field(field)
            if field_data:
                fields.append(field_data)
        
        result["fields"] = fields
        
        return result
    
    def _process_fieldset(self, fieldset: Tag) -> Optional[Dict[str, Any]]:
        """
        Process a fieldset element.
        
        Args:
            fieldset: The fieldset element to process.
            
        Returns:
            A dictionary representation of the fieldset, or None if it's empty.
        """
        # Create a fieldset object
        result = {
            "type": "fieldset",
            "fields": []
        }
        
        # Extract fieldset ID
        if fieldset.has_attr("id"):
            result["id"] = fieldset["id"]
        
        # Extract legend
        legend = fieldset.find("legend")
        if legend:
            result["legend"] = self.extract_text_content(legend)
        
        # Process fields in the fieldset
        for field in fieldset.find_all(["input", "select", "textarea", "button"]):
            # Skip fields that are in nested fieldsets
            if field.find_parent("fieldset") != fieldset:
                continue
                
            field_data = self._process_field(field)
            if field_data:
                result["fields"].append(field_data)
        
        # Return None if no fields found
        if not result["fields"]:
            return None
            
        return result
    
    def _process_field(self, field: Tag) -> Optional[Dict[str, Any]]:
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
    
    def _process_input(self, input_field: Tag) -> Dict[str, Any]:
        """
        Process an input element.
        
        Args:
            input_field: The input element to process.
            
        Returns:
            A dictionary representation of the input.
        """
        # Get the input type
        input_type = input_field.get("type", "text")
        
        # Create an input field object
        result = {
            "type": "input",
            "input_type": input_type
        }
        
        # Extract common attributes
        for attr in ["id", "name", "value", "placeholder"]:
            if input_field.has_attr(attr):
                result[attr] = input_field[attr]
        
        # Handle boolean attributes
        for attr in ["required", "disabled", "readonly", "checked"]:
            if input_field.has_attr(attr):
                result[attr] = True
        
        # Handle specific input types
        if input_type in ["number", "range"]:
            for attr in ["min", "max", "step"]:
                if input_field.has_attr(attr):
                    result[attr] = input_field[attr]
        elif input_type == "file":
            if input_field.has_attr("accept"):
                result["accept"] = input_field["accept"]
            if input_field.has_attr("multiple"):
                result["multiple"] = True
        elif input_type == "image":
            for attr in ["src", "alt"]:
                if input_field.has_attr(attr):
                    result[attr] = input_field[attr]
        
        # Find associated label
        label = self._find_label_for_field(input_field)
        if label:
            result["label"] = label
        
        return result
    
    def _process_select(self, select: Tag) -> Dict[str, Any]:
        """
        Process a select element.
        
        Args:
            select: The select element to process.
            
        Returns:
            A dictionary representation of the select.
        """
        # Create a select field object
        result = {
            "type": "select",
            "options": []
        }
        
        # Extract common attributes
        for attr in ["id", "name"]:
            if select.has_attr(attr):
                result[attr] = select[attr]
        
        # Handle boolean attributes
        for attr in ["required", "disabled", "multiple"]:
            if select.has_attr(attr):
                result[attr] = True
        
        # Process option groups and options
        options = []
        
        for child in select.children:
            if not isinstance(child, Tag):
                continue
                
            if child.name == "option":
                option = self._process_option(child)
                if option:
                    options.append(option)
            elif child.name == "optgroup":
                group = self._process_optgroup(child)
                if group:
                    options.append(group)
        
        result["options"] = options
        
        # Find associated label
        label = self._find_label_for_field(select)
        if label:
            result["label"] = label
        
        return result
    
    def _process_option(self, option: Tag) -> Dict[str, Any]:
        """
        Process a select option.
        
        Args:
            option: The option element to process.
            
        Returns:
            A dictionary representation of the option.
        """
        # Create an option object
        result = {
            "text": self.extract_text_content(option)
        }
        
        # Extract value attribute
        if option.has_attr("value"):
            result["value"] = option["value"]
        else:
            # Use text content as value if no value attribute
            result["value"] = result["text"]
        
        # Handle selected attribute
        if option.has_attr("selected"):
            result["selected"] = True
        
        # Handle disabled attribute
        if option.has_attr("disabled"):
            result["disabled"] = True
        
        return result
    
    def _process_optgroup(self, optgroup: Tag) -> Dict[str, Any]:
        """
        Process a select optgroup.
        
        Args:
            optgroup: The optgroup element to process.
            
        Returns:
            A dictionary representation of the optgroup.
        """
        # Create an optgroup object
        result = {
            "type": "optgroup",
            "options": []
        }
        
        # Extract label attribute
        if optgroup.has_attr("label"):
            result["label"] = optgroup["label"]
        
        # Handle disabled attribute
        if optgroup.has_attr("disabled"):
            result["disabled"] = True
        
        # Process options in the group
        options = []
        for option in optgroup.find_all("option"):
            option_data = self._process_option(option)
            if option_data:
                options.append(option_data)
        
        result["options"] = options
        
        return result
    
    def _process_textarea(self, textarea: Tag) -> Dict[str, Any]:
        """
        Process a textarea element.
        
        Args:
            textarea: The textarea element to process.
            
        Returns:
            A dictionary representation of the textarea.
        """
        # Create a textarea field object
        result = {
            "type": "textarea",
            "value": textarea.get_text()
        }
        
        # Extract common attributes
        for attr in ["id", "name", "placeholder", "rows", "cols"]:
            if textarea.has_attr(attr):
                result[attr] = textarea[attr]
        
        # Handle boolean attributes
        for attr in ["required", "disabled", "readonly"]:
            if textarea.has_attr(attr):
                result[attr] = True
        
        # Find associated label
        label = self._find_label_for_field(textarea)
        if label:
            result["label"] = label
        
        return result
    
    def _process_button(self, button: Tag) -> Dict[str, Any]:
        """
        Process a button element.
        
        Args:
            button: The button element to process.
            
        Returns:
            A dictionary representation of the button.
        """
        # Create a button field object
        result = {
            "type": "button",
            "button_type": button.get("type", "submit"),
            "text": self.extract_text_content(button)
        }
        
        # Extract common attributes
        for attr in ["id", "name", "value", "form"]:
            if button.has_attr(attr):
                result[attr] = button[attr]
        
        # Handle disabled attribute
        if button.has_attr("disabled"):
            result["disabled"] = True
        
        return result
    
    def _find_label_for_field(self, field: Tag) -> Optional[str]:
        """
        Find the label text for a form field.
        
        Args:
            field: The form field element.
            
        Returns:
            The label text, or None if no label is found.
        """
        # Check for a label with a matching "for" attribute
        if field.has_attr("id"):
            form = field.find_parent("form")
            if form:
                labels = form.find_all("label", attrs={"for": field["id"]})
                if labels:
                    return self.extract_text_content(labels[0])
        
        # Check if the field is inside a label
        parent_label = field.find_parent("label")
        if parent_label:
            # Get the label text excluding the field's own text
            label_text = self.extract_text_content(parent_label)
            field_text = self.extract_text_content(field)
            
            # Remove the field's text from the label text
            if field_text and field_text in label_text:
                label_text = label_text.replace(field_text, "").strip()
            
            return label_text
        
        return None
