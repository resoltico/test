"""
Memory management utilities for web2json.

This module provides functions for managing memory usage during processing.
"""
import gc
import logging
import sys
from typing import Any, Dict, Optional

# Size threshold for triggering garbage collection (in bytes)
# Objects larger than this will trigger collection when cleared
GC_SIZE_THRESHOLD = 1_000_000  # 1MB


def get_object_size(obj: Any) -> int:
    """Estimate the memory size of an object.
    
    This is an approximation and may not account for all memory usage,
    especially for complex objects with many references.
    
    Args:
        obj: Object to measure
        
    Returns:
        Approximate size in bytes
    """
    try:
        return sys.getsizeof(obj)
    except (TypeError, AttributeError):
        # For objects that don't support getsizeof
        return GC_SIZE_THRESHOLD + 1  # Assume it's large


def clear_reference(context: Dict[str, Any], key: str, force_gc: bool = False) -> None:
    """Clear a reference from a dictionary and optionally collect garbage.
    
    Args:
        context: Dictionary containing the reference
        key: Key to clear
        force_gc: Whether to force garbage collection regardless of object size
    """
    logger = logging.getLogger(__name__)
    
    if key in context and context[key] is not None:
        # Check size before clearing
        obj_size = get_object_size(context[key])
        
        # Clear the reference
        context[key] = None
        
        # Collect garbage if object was large or forced
        if force_gc or obj_size > GC_SIZE_THRESHOLD:
            logger.debug(f"Collecting garbage after clearing {key} ({obj_size} bytes)")
            gc.collect()
        else:
            logger.debug(f"Cleared {key} without garbage collection ({obj_size} bytes)")


def memory_status() -> Dict[str, Any]:
    """Get current memory status information.
    
    Returns:
        Dictionary with memory statistics
    """
    gc_counts = gc.get_count()
    return {
        "gc_counts": {
            "generation0": gc_counts[0],
            "generation1": gc_counts[1],
            "generation2": gc_counts[2]
        },
        "gc_enabled": gc.isenabled(),
        "gc_thresholds": gc.get_threshold(),
        "gc_objects": len(gc.get_objects())
    }


def optimize_memory_settings() -> None:
    """Configure garbage collector for optimal performance."""
    # Ensure garbage collection is enabled
    gc.enable()
    
    # Set more aggressive thresholds for generation 0 (new objects)
    # This makes GC run more frequently for new objects but less for old ones
    gc.set_threshold(700, 10, 10)
    
    # Log current settings
    logger = logging.getLogger(__name__)
    logger.debug(f"Memory optimization applied: {memory_status()}")