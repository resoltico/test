"""
Pipeline architecture for web2json processing flow.

This module implements a flexible pipeline system for processing web content.
Each pipeline consists of a series of stages that transform the input data.
"""
import asyncio
import logging
import gc
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Dict, Any, List, Protocol, Optional, TypeVar, Callable, Awaitable, Union

from web2json.core.fetch import fetch_url
from web2json.core.parse import parse_html
from web2json.core.extract import extract_content
from web2json.core.export import export_document
from web2json.models.document import Document
from web2json.utils.filesystem import generate_filename
from web2json.utils.errors import Web2JsonError
from web2json.utils.memory import clear_reference, optimize_memory_settings, memory_status

# Type definitions
T = TypeVar('T')
Context = Dict[str, Any]

# Dedicated thread pool for CPU-bound operations
# Use fewer threads than CPUs to avoid context switching overhead
CPU_BOUND_EXECUTOR = ThreadPoolExecutor(thread_name_prefix="web2json_worker")


class PipelineStage(Protocol):
    """Protocol defining a pipeline stage."""
    
    async def process(self, context: Context) -> Context:
        """Process the context and return the updated context."""
        ...


async def run_pipeline(stages: List[PipelineStage], initial_context: Context) -> Context:
    """Run a pipeline with the provided stages and initial context.
    
    Args:
        stages: List of pipeline stages to execute
        initial_context: Initial context dictionary
        
    Returns:
        Final context after all stages have processed
    """
    logger = logging.getLogger(__name__)
    
    # Configure garbage collection for optimal performance
    optimize_memory_settings()
    
    current_context = initial_context.copy()
    
    for i, stage in enumerate(stages):
        stage_name = stage.__class__.__name__
        logger.debug(f"Executing pipeline stage {i+1}/{len(stages)}: {stage_name}")
        
        try:
            # Process the stage
            current_context = await stage.process(current_context)
            
            # Log memory status after each stage (if in debug mode)
            if logger.isEnabledFor(logging.DEBUG):
                mem_status = memory_status()
                logger.debug(f"Memory after {stage_name}: {mem_status}")
            
        except Exception as e:
            logger.error(f"Error in pipeline stage {stage_name}: {str(e)}")
            # Add error information to the context
            current_context.setdefault("errors", []).append({
                "stage": stage_name,
                "error": str(e),
                "type": type(e).__name__
            })
            # Re-raise the exception
            raise
    
    return current_context


async def run_in_thread(func, *args, **kwargs):
    """Run a CPU-bound function in a dedicated thread pool.
    
    This helps avoid blocking the event loop with CPU-intensive operations.
    The dedicated thread pool is sized appropriately for CPU-bound tasks.
    
    Args:
        func: Function to run
        *args: Positional arguments to pass to the function
        **kwargs: Keyword arguments to pass to the function
        
    Returns:
        Result of the function
    """
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        CPU_BOUND_EXECUTOR,
        lambda: func(*args, **kwargs)
    )


class FetchStage:
    """Pipeline stage for fetching web content."""
    
    async def process(self, context: Context) -> Context:
        """Process context by fetching web content."""
        url = context["url"]
        logger = logging.getLogger(__name__)
        logger.info(f"Fetching content from URL: {url}")
        
        html_content = await fetch_url(url)
        context["html_content"] = html_content
        context["content_length"] = len(html_content)
        
        return context


class ParseStage:
    """Pipeline stage for parsing HTML content."""
    
    async def process(self, context: Context) -> Context:
        """Process context by parsing HTML content."""
        html_content = context["html_content"]
        logger = logging.getLogger(__name__)
        logger.info("Parsing HTML content")
        
        # Use specialized function for running in thread pool
        # This avoids blocking the event loop with CPU-intensive parsing
        soup, title, meta_tags = await run_in_thread(
            parse_html, html_content
        )
        
        # Clear HTML content from memory as it's no longer needed
        clear_reference(context, "html_content")
        
        context["soup"] = soup
        context["title"] = title
        context["meta_tags"] = meta_tags
        
        return context


class ExtractStage:
    """Pipeline stage for extracting structured content."""
    
    async def process(self, context: Context) -> Context:
        """Process context by extracting structured content."""
        soup = context["soup"]
        preserve_styles = context.get("preserve_styles", False)
        logger = logging.getLogger(__name__)
        logger.info("Extracting structured content")
        
        # Use dedicated thread pool for CPU-intensive extraction
        content = await run_in_thread(
            extract_content, soup, preserve_styles
        )
        
        # Clear soup object from memory as it's no longer needed
        clear_reference(context, "soup")
        
        context["content"] = content
        
        return context


class TransformStage:
    """Pipeline stage for transforming content into a document."""
    
    async def process(self, context: Context) -> Context:
        """Process context by transforming content into a document."""
        logger = logging.getLogger(__name__)
        logger.info("Creating document")
        
        # Create document from context
        document = Document(
            title=context["title"],
            content=context["content"],
            metadata={
                "url": context["url"],
                "preserve_styles": context.get("preserve_styles", False),
                "meta": context.get("meta_tags", {})
            }
        )
        
        # Clear content list from memory as it's now in the document
        clear_reference(context, "content")
        clear_reference(context, "meta_tags")
        
        context["document"] = document
        
        return context


class ExportStage:
    """Pipeline stage for exporting the document."""
    
    async def process(self, context: Context) -> Context:
        """Process context by exporting the document."""
        document = context["document"]
        logger = logging.getLogger(__name__)
        
        # Check if output path is provided
        if "output_path" in context and context["output_path"]:
            output_path = context["output_path"]
            logger.info(f"Exporting document to {output_path}")
        else:
            # Generate filename based on URL
            output_dir = context["output_dir"]
            url = context["url"]
            dir_path, filename = generate_filename(url, output_dir)
            output_path = dir_path / filename
            logger.info(f"Exporting document to {output_path}")
            
        # Export document using the thread pool for I/O operations
        await run_in_thread(
            export_document, document, output_path
        )
        
        context["output_path"] = output_path
        
        # Perform final garbage collection
        gc.collect()
        
        return context


async def process_url(
    url: str,
    output_path: Optional[Path] = None,
    output_dir: Optional[Path] = None,
    preserve_styles: bool = False,
) -> Dict[str, Any]:
    """Process a single URL through the pipeline.
    
    Args:
        url: URL to process
        output_path: Optional specific output path
        output_dir: Directory to save output (if output_path not provided)
        preserve_styles: Whether to preserve HTML styles
        
    Returns:
        Dictionary with processing results
    """
    logger = logging.getLogger(__name__)
    logger.info(f"Processing URL: {url}")
    
    # Create pipeline stages
    stages = [
        FetchStage(),
        ParseStage(),
        ExtractStage(),
        TransformStage(),
        ExportStage(),
    ]
    
    # Prepare initial context
    context = {
        "url": url,
        "preserve_styles": preserve_styles,
    }
    
    if output_path:
        context["output_path"] = output_path
    
    if output_dir:
        context["output_dir"] = output_dir
    
    try:
        # Process through pipeline
        result = await run_pipeline(stages, context)
        
        # Clear document from memory after export
        clear_reference(context, "document", force_gc=True)
        
        return {
            "success": True,
            "url": url,
            "output_path": result["output_path"],
            "document": result["document"]
        }
    except Web2JsonError as e:
        logger.error(f"Error processing {url}: {e}")
        # Force garbage collection after error
        gc.collect()
        return {
            "success": False,
            "url": url,
            "error": str(e)
        }
    except Exception as e:
        logger.error(f"Unexpected error processing {url}: {e}")
        # Force garbage collection after error
        gc.collect()
        return {
            "success": False,
            "url": url,
            "error": f"Unexpected error: {e}"
        }


async def bulk_process_urls(
    urls: List[str],
    output_dir: Path,
    preserve_styles: bool = False,
    max_concurrency: int = 5,
) -> List[Dict[str, Any]]:
    """Process multiple URLs in parallel.
    
    Args:
        urls: List of URLs to process
        output_dir: Directory to save outputs
        preserve_styles: Whether to preserve HTML styles
        max_concurrency: Maximum number of concurrent requests
        
    Returns:
        List of processing results for each URL
    """
    logger = logging.getLogger(__name__)
    logger.info(f"Processing {len(urls)} URLs with concurrency {max_concurrency}")
    
    # Configure garbage collection for optimal performance
    optimize_memory_settings()
    
    # Create output directory if it doesn't exist
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Process URLs with semaphore to limit concurrency
    semaphore = asyncio.Semaphore(max_concurrency)
    
    async def process_with_semaphore(url: str) -> Dict[str, Any]:
        async with semaphore:
            result = await process_url(url, output_dir=output_dir, preserve_styles=preserve_styles)
            # Force garbage collection between URLs
            gc.collect()
            return result
    
    # Create tasks for all URLs
    tasks = [process_with_semaphore(url) for url in urls]
    
    # Execute all tasks and collect results
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Handle exceptions in results
    processed_results = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            processed_results.append({
                "success": False,
                "url": urls[i],
                "error": str(result)
            })
        else:
            processed_results.append(result)
    
    # Final garbage collection
    gc.collect()
    
    # Close the executor when done
    # This is done in a non-blocking way to avoid hanging
    CPU_BOUND_EXECUTOR._max_workers = 0
    
    return processed_results