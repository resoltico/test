"""
Transform stage for web2json pipeline.

This module provides the transform stage for creating a document from extracted content.
"""
import logging
import time
from datetime import datetime
from typing import Dict, Any

from web2json.models.document import Document, Metadata
from web2json.utils.errors import TransformError
from web2json.utils.memory import clear_reference

# Type alias
Context = Dict[str, Any]


class TransformStage:
    """Pipeline stage for transforming content into a document."""
    
    async def process(self, context: Context) -> Context:
        """Process context by transforming content into a document.
        
        Args:
            context: Processing context
            
        Returns:
            Updated context with document
            
        Raises:
            TransformError: If transformation fails
        """
        logger = logging.getLogger(__name__)
        logger.info("Creating document")
        
        try:
            start_time = time.time()
            
            # Create document metadata
            metadata = Metadata(
                url=context["url"],
                fetched_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                preserve_styles=context.get("preserve_styles", False),
                meta=context.get("meta_tags", {})
            )
            
            # Create document
            document = Document(
                title=context["title"],
                content=context["content"],
                metadata=metadata
            )
            
            elapsed = time.time() - start_time
            logger.debug(f"Transform completed in {elapsed:.2f} seconds")
            
            # Clear content list from memory as it's now in the document
            clear_reference(context, "content")
            clear_reference(context, "meta_tags")
            
            # Store results in context
            context["document"] = document
            context["transform_time"] = elapsed
            
        except Exception as e:
            logger.error(f"Error transforming content into document: {str(e)}")
            # Ensure we clean up memory even on error
            clear_reference(context, "content")
            clear_reference(context, "meta_tags")
            raise TransformError(f"Failed to transform content into document: {str(e)}")
        
        return context
