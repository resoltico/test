"""
Transform stage for web2json pipeline.

This module provides the transform stage for creating a document from extracted content.
"""
import logging
import time
from datetime import datetime
from typing import Dict, Any, List

from web2json.models.document import Document, Metadata
from web2json.models.content import ContentItem
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
            
            # Convert content items to dictionaries if they're objects
            content_list = context.get("content", [])
            content_dicts = self._convert_content_to_dicts(content_list)
            
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
                content=content_dicts,
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
    
    def _convert_content_to_dicts(self, content_items):
        """Convert content items to dictionaries recursively.
        
        Handles both Pydantic models and dictionary objects.
        
        Args:
            content_items: List of content items
            
        Returns:
            List of content items as dictionaries
        """
        result = []
        
        for item in content_items:
            if item is None:
                continue
                
            # Handle Pydantic models
            if hasattr(item, 'model_dump'):
                # Convert Pydantic model to dict
                item_dict = item.model_dump()
                
                # Handle nested content in sections
                if item_dict.get('type') == 'section' and 'content' in item_dict:
                    item_dict['content'] = self._convert_content_to_dicts(item_dict['content'])
                    
                result.append(item_dict)
                
            elif isinstance(item, dict):
                # Already a dict, but may have nested content
                item_copy = item.copy()
                
                if item_copy.get('type') == 'section' and 'content' in item_copy:
                    item_copy['content'] = self._convert_content_to_dicts(item_copy['content'])
                    
                result.append(item_copy)
                
            else:
                # Try to convert to dict if it has a __dict__ attribute
                try:
                    if hasattr(item, '__dict__'):
                        item_dict = vars(item)
                        
                        # Handle nested content
                        if item_dict.get('type') == 'section' and 'content' in item_dict:
                            item_dict['content'] = self._convert_content_to_dicts(item_dict['content'])
                            
                        result.append(item_dict)
                    else:
                        # Last resort - try to convert to a simple dict with type and contents
                        item_dict = {"type": "unknown"}
                        
                        # Try to get common attributes
                        for attr in ['text', 'level', 'items', 'language', 'caption', 'list_type']:
                            if hasattr(item, attr):
                                item_dict[attr] = getattr(item, attr)
                                
                        result.append(item_dict)
                except Exception as e:
                    logging.warning(f"Could not convert item to dict: {str(e)}")
        
        return result
