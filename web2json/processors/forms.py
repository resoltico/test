"""
Processor for HTML forms.
"""

from typing import Dict, List, Optional, TypeAlias, cast

import structlog
from bs4 import BeautifulSoup, Tag

from web2json.models.document import Document
from web2json.models.section import Section
from web2json.processors.base import ElementProcessor


logger = structlog.get_logger(__name__)

# Type alias for form field data
FormField: TypeAlias = Dict[str, str | bool | List[str] | Dict]


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
            # Extract the form data
            form_dict = self._process_form(form)
            
            # Find the appropriate section to add this form to
            section = self._find_parent_section(document, form)
            
            if section:
                # Add the form to the section's content
                section.add_content(form_dict)
                logger.debug(
                    "Added form to section", 
                    section=section.title, 
                    form_id=form.get("id")
                )
        
        return document
    
    def _process_form(self, form: Tag) -> Dict:
        """
        Process a single form element.
        
        Args:
            form: The form element to process.
            
        Returns:
            A dictionary representation of the form.
        """
        result: Dict = {
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
        
        # Extract form fields
        fields: List[FormField] = []
        
        # Process fieldsets first to maintain structure
        for fieldset in form.find_all("fieldset", recursive=True):
            fieldset_data = self._process_fieldset(fieldset)
            if fieldset_data:
                fields.append(fieldset_data)
        
        # Process other form controls
        for field in form.find_all(["input", "select", "textarea", "button"], recursive=True):
            # Skip fields inside fieldsets (already processed)
            if field.find_parent("fieldset"):
                continue
                
            field_data = self._process_field(field)
            if field_data:
                fields.append(field_data)
        
        result["fields"] = fields
        return result
    
    def _process_fieldset(self, fieldset: Tag) -> Optional[FormField]:
        """
        Process a fieldset element.
        
        Args:
            fieldset: The fieldset element to process.
            
        Returns:
            A dictionary representation of the fieldset, or None if it's empty.
        """
        fieldset_data: FormField = {
            "type": "fieldset",
            "fields": []
        }
        
        # Extract legend
        legend = fieldset.find("legend")
        if legend:
            fieldset_data["legend"] = legend.get_text().strip()
        
        # Extract ID and name
        if fieldset.get("id"):
            fieldset_data["id"] = fieldset["id"]
        if fieldset.get("name"):
            fieldset_data["name"] = fieldset["name"]
        
        # Process fields in the fieldset
        fields: List[FormField] = []
        for field in fieldset.find_all(["input", "select", "textarea", "button"], recursive=True):
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
        options: List[Dict] = []
        
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
            label = field.find_parent("form").find("label", attrs={"for": field_id})
            if label:
                return label.get_text().strip()
        
        # Check if the field is inside a label
        parent_label = field.find_parent("label")
        if parent_label:
            # Extract label text excluding the field itself
            field.extract()  # Temporarily remove the field
            label_text = parent_label.get_text().strip()
            parent_label.append(field)  # Put the field back
            return label_text
        
        return None
    
    def _find_parent_section(self, document: Document, element: Tag) -> Optional[Section]:
        """
        Find the appropriate parent section for an element.
        
        This uses a heuristic approach to determine which section the element
        belongs to based on its position in the document.
        
        Args:
            document: The Document object.
            element: The HTML element to find a parent for.
            
        Returns:
            The parent Section object, or None if no suitable parent was found.
        """
        # This is a simplified implementation that needs to be improved
        # in a real application to accurately place elements in the right sections
        
        # Get all headings that precede this element
        preceding_headings = []
        current = element.previous_element
        while current:
            if current.name and current.name in ["h1", "h2", "h3", "h4", "h5", "h6"]:
                preceding_headings.append((current.name, current.get_text().strip()))
            current = current.previous_element
        
        # Reverse the list to get them in document order
        preceding_headings.reverse()
        
        if not preceding_headings:
            # If no headings found, use the first top-level section
            for item in document.content:
                if isinstance(item, Section):
                    return item
            return None
        
        # Find the matching section based on the nearest heading
        last_heading = preceding_headings[-1]
        return self._find_section_by_title(document.content, last_heading[1])
    
    def _find_section_by_title(
        self, content: List, title: str
    ) -> Optional[Section]:
        """
        Find a section by its title.
        
        Args:
            content: The content list to search in.
            title: The title to match.
            
        Returns:
            The matching Section object, or None if not found.
        """
        for item in content:
            if isinstance(item, Section):
                if item.title == title:
                    return item
                
                # Recursively search in children
                result = self._find_section_by_title(item.children, title)
                if result:
                    return result
        
        # If no exact match found, return the first section as a fallback
        for item in content:
            if isinstance(item, Section):
                return item
        
        return None
