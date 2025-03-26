"""
Export stage for the web2json pipeline.

This stage exports the document to a file or returns it as a dictionary.
"""
from typing import Dict, Any, Optional
from pathlib import Path
import logging
from .base import PipelineStage
from ....exceptions import ExportError
from ....serialization.json import save_to_file, validate_document


class ExportStage(PipelineStage):
    """Pipeline stage for exporting documents.
    
    This stage takes the document from the context and either
    exports it to a file or keeps it in the context.
    """
    
    def __init__(self, indent: int = 2, encoding: str = 'utf-8'):
        """Initialize the export stage.
        
        Args:
            indent: JSON indentation level
            encoding: File encoding
        """
        super().__init__()
        self.indent = indent
        self.encoding = encoding
    
    def process(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Process the context by exporting the document.
        
        Args:
            context: Pipeline context containing 'document'
            
        Returns:
            Updated context
            
        Raises:
            ValueError: If document is missing from context
            ExportError: If export fails
        """
        self.validate_context(context, ['document'])
        
        document = context['document']
        
        try:
            # Validate document
            validate_document(document)
            
            # Export to file if output_path is provided
            if 'output_path' in context and context['output_path']:
                output_path = context['output_path']
                self.logger.info(f"Exporting document to {output_path}")
                
                try:
                    # Save to file
                    save_to_file(
                        document, 
                        output_path,
                        indent=self.indent,
                        encoding=self.encoding
                    )
                    
                    context['exported'] = True
                    context['export_path'] = output_path
                except Exception as e:
                    self.logger.error(f"Error saving document: {str(e)}")
                    context['exported'] = False
                    context['export_error'] = str(e)
            else:
                self.logger.info("No output path provided, skipping export")
                context['exported'] = False
            
            return context
            
        except ValueError as e:
            self.logger.error(f"Invalid document structure: {str(e)}")
            raise
        except Exception as e:
            self.logger.error(f"Error in export stage: {str(e)}")
            raise ExportError(f"Failed to export document: {str(e)}")