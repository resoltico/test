"""
Hierarchical export stage for web2json pipeline.

This module provides the export stage for saving documents in the hierarchical format.
"""
import gc
import logging
import time
from pathlib import Path
from typing import Dict, Any

from web2json.core.export import export_document
from web2json.core.pipeline_stages.base import run_in_thread, PipelineStage
from web2json.transform.hierarchical_converter import convert_to_hierarchical
from web2json.utils.errors import ExportError
from web2json.utils.filesystem import generate_filename
from web2json.utils.memory import clear_reference


class HierarchicalExportStage(PipelineStage):
    """Pipeline stage for exporting the document in hierarchical format."""
    
    def __init__(self, executor=None):
        """Initialize the export stage.
        
        Args:
            executor: Optional ThreadPoolExecutor for I/O operations
        """
        self.executor = executor
    
    async def process(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Process context by exporting the document in the hierarchical format.
        
        Args:
            context: Processing context
            
        Returns:
            Updated context with export information
            
        Raises:
            ExportError: If export fails
        """
        document = context["document"]
        preserve_styles = context.get("preserve_styles", False)
        logger = logging.getLogger(__name__)
        
        try:
            start_time = time.time()
            
            # Convert to hierarchical format
            hierarchical_document = convert_to_hierarchical(document)
            
            # Store content statistics
            content_stats = {
                "heading_count": 0,
                "top_level_count": len(hierarchical_document.get("content", [])),
                "total_text_length": 0
            }
            
            # Count headings recursively
            def count_headings(items):
                count = 0
                total_text = 0
                
                for item in items:
                    if item.get("type") == "heading":
                        count += 1
                        
                        # Count text length
                        for text in item.get("content", []):
                            total_text += len(text)
                            
                        # Recursively count children
                        child_count, child_text = count_headings(item.get("children", []))
                        count += child_count
                        total_text += child_text
                
                return count, total_text
            
            heading_count, text_length = count_headings(hierarchical_document.get("content", []))
            content_stats["heading_count"] = heading_count
            content_stats["total_text_length"] = text_length
            
            # Determine output path
            if "output_path" in context and context["output_path"]:
                # Use specified output path
                output_path = context["output_path"]
                logger.info(f"Exporting hierarchical document to {output_path}")
            else:
                # Generate filename based on URL
                output_dir = context.get("output_dir", Path("fetched_jsons"))
                url = context["url"]
                dir_path, filename = generate_filename(url, output_dir)
                output_path = dir_path / filename
                logger.info(f"Exporting hierarchical document to {output_path}")
                
            # Export document using the thread pool for I/O operations
            await run_in_thread(
                export_document, hierarchical_document, output_path, executor=self.executor
            )
            
            elapsed = time.time() - start_time
            logger.debug(f"Hierarchical export completed in {elapsed:.2f} seconds")
            
            # Store results in context
            context["output_path"] = output_path
            context["export_time"] = elapsed
            context["content_stats"] = content_stats
            
            # Clear document from memory after export
            clear_reference(context, "document")
            
            # Perform final garbage collection
            gc.collect()
            
        except Exception as e:
            logger.error(f"Error exporting hierarchical document: {str(e)}")
            # Attempt garbage collection even on error
            clear_reference(context, "document")
            gc.collect()
            raise ExportError(f"Failed to export hierarchical document: {str(e)}")
        
        return context
