"""
Extract stage for web2json pipeline.

This module provides the extract stage for extracting structured content from parsed HTML.
"""
import logging
import time
from typing import Dict, Any

from web2json.core.extractors.hierarchical_extractor import extract_content_hierarchically
from web2json.core.pipeline_stages.base import run_in_thread
from web2json.utils.errors import ExtractError
from web2json.utils.memory import clear_reference

# Type alias
Context = Dict[str, Any]


class ExtractStage:
    """Pipeline stage for extracting structured content."""
    
    def __init__(self, executor=None, hierarchical=True):
        """Initialize the extract stage.
        
        Args:
            executor: Optional ThreadPoolExecutor for CPU-bound operations
            hierarchical: Whether to use hierarchical extraction (default: True)
        """
        self.executor = executor
        self.hierarchical = hierarchical
    
    async def process(self, context: Context) -> Context:
        """Process context by extracting structured content.
        
        Args:
            context: Processing context
            
        Returns:
            Updated context with extracted content
            
        Raises:
            ExtractError: If extraction fails
        """
        soup = context["soup"]
        preserve_styles = context.get("preserve_styles", False)
        logger = logging.getLogger(__name__)
        logger.info("Extracting structured content")
        
        try:
            start_time = time.time()
            
            # Use hierarchical extraction by default
            if self.hierarchical:
                content = await run_in_thread(
                    extract_content_hierarchically, 
                    soup, 
                    preserve_styles,
                    executor=self.executor
                )
            else:
                # Fallback to flat extraction if hierarchical is disabled
                # This maintains backward compatibility
                from web2json.core.extract import extract_content
                content = await run_in_thread(
                    extract_content,
                    soup,
                    preserve_styles,
                    executor=self.executor
                )
            
            elapsed = time.time() - start_time
            logger.debug(f"Extract completed in {elapsed:.2f} seconds")
            
            # Clear soup object from memory as it's no longer needed
            clear_reference(context, "soup")
            
            # Store results in context
            context["content"] = content
            context["extract_time"] = elapsed
            context["hierarchical"] = self.hierarchical
            
            # Count content items for logging
            content_count = len(content)
            logger.info(f"Extracted {content_count} top-level content items")
            
        except Exception as e:
            logger.error(f"Error extracting content: {str(e)}")
            # Ensure we clean up memory even on error
            clear_reference(context, "soup")
            raise ExtractError(f"Failed to extract content: {str(e)}")
        
        return context
