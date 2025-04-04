"""
Utility functions for working with JSON.
"""

import json
import re
from typing import Any, Dict, List, Optional, Union


def clean_json_keys(obj: Union[Dict, List, Any]) -> Union[Dict, List, Any]:
    """
    Clean JSON keys to ensure they're valid and consistent.
    
    Args:
        obj: The object to clean.
        
    Returns:
        The cleaned object.
    """
    if isinstance(obj, dict):
        # Create a new dictionary with cleaned keys
        return {
            clean_key(k): clean_json_keys(v)
            for k, v in obj.items()
        }
    elif isinstance(obj, list):
        # Recursively clean items in the list
        return [clean_json_keys(item) for item in obj]
    else:
        # Return primitive values as-is
        return obj


def clean_key(key: str) -> str:
    """
    Clean a JSON key by replacing invalid characters.
    
    Args:
        key: The key to clean.
        
    Returns:
        The cleaned key.
    """
    # Replace spaces with underscores
    key = re.sub(r'\s+', '_', key)
    
    # Replace invalid characters with underscores
    key = re.sub(r'[^\w\d_]', '_', key)
    
    # Ensure the key starts with a letter or underscore
    if key and not (key[0].isalpha() or key[0] == '_'):
        key = f"_{key}"
    
    return key


def sort_json_keys(obj: Union[Dict, List, Any]) -> Union[Dict, List, Any]:
    """
    Sort JSON object keys for consistent output.
    
    Args:
        obj: The object to sort keys in.
        
    Returns:
        The object with sorted keys.
    """
    if isinstance(obj, dict):
        # Create a new dictionary with sorted keys
        return {
            k: sort_json_keys(obj[k])
            for k in sorted(obj.keys())
        }
    elif isinstance(obj, list):
        # Recursively sort keys in list items
        return [sort_json_keys(item) for item in obj]
    else:
        # Return primitive values as-is
        return obj


def pretty_json(obj: Any, indent: int = 2) -> str:
    """
    Format an object as pretty-printed JSON.
    
    Args:
        obj: The object to format.
        indent: Number of spaces for indentation.
        
    Returns:
        Pretty-printed JSON string.
    """
    return json.dumps(
        obj, 
        indent=indent, 
        ensure_ascii=False,
        sort_keys=True
    )


def minify_json(obj: Any) -> str:
    """
    Format an object as minified JSON.
    
    Args:
        obj: The object to format.
        
    Returns:
        Minified JSON string.
    """
    return json.dumps(
        obj, 
        separators=(',', ':'), 
        ensure_ascii=False
    )


def is_valid_json(json_str: str) -> bool:
    """
    Check if a string is valid JSON.
    
    Args:
        json_str: The JSON string to check.
        
    Returns:
        True if the string is valid JSON, False otherwise.
    """
    try:
        json.loads(json_str)
        return True
    except json.JSONDecodeError:
        return False


def compare_json_structures(obj1: Any, obj2: Any) -> List[str]:
    """
    Compare the structures of two JSON objects and return a list of differences.
    
    Args:
        obj1: The first object.
        obj2: The second object.
        
    Returns:
        A list of difference descriptions.
    """
    differences = []
    
    def _compare(path: str, o1: Any, o2: Any) -> None:
        if type(o1) != type(o2):
            differences.append(f"{path}: Type mismatch: {type(o1).__name__} vs {type(o2).__name__}")
            return
        
        if isinstance(o1, dict):
            # Check for missing keys
            for k in o1:
                if k not in o2:
                    differences.append(f"{path}: Key '{k}' missing in second object")
                else:
                    _compare(f"{path}.{k}", o1[k], o2[k])
            
            for k in o2:
                if k not in o1:
                    differences.append(f"{path}: Key '{k}' missing in first object")
        
        elif isinstance(o1, list):
            if len(o1) != len(o2):
                differences.append(f"{path}: List length mismatch: {len(o1)} vs {len(o2)}")
            
            # Compare elements up to the length of the shorter list
            for i in range(min(len(o1), len(o2))):
                _compare(f"{path}[{i}]", o1[i], o2[i])
    
    _compare("$", obj1, obj2)
    return differences


class JsonPathFinder:
    """Utility for finding elements in a JSON structure using JSONPath-like syntax."""
    
    @staticmethod
    def find(obj: Any, path: str) -> Optional[Any]:
        """
        Find elements in a JSON structure using a simplified JSONPath syntax.
        
        Args:
            obj: The JSON object to search in.
            path: The path to the element (e.g., "$.content[0].title").
            
        Returns:
            The found element, or None if not found.
        """
        # Split the path into components
        if path.startswith("$."):
            path = path[2:]
        
        components = path.split(".")
        current = obj
        
        for component in components:
            # Handle array indexing
            if "[" in component and component.endswith("]"):
                name, index_str = component.split("[", 1)
                index = int(index_str[:-1])  # Remove the closing bracket
                
                if name:
                    # Object property followed by array index
                    if not isinstance(current, dict) or name not in current:
                        return None
                    current = current[name]
                    
                    if not isinstance(current, list) or index >= len(current):
                        return None
                    current = current[index]
                else:
                    # Direct array index
                    if not isinstance(current, list) or index >= len(current):
                        return None
                    current = current[index]
            else:
                # Regular object property
                if not isinstance(current, dict) or component not in current:
                    return None
                current = current[component]
        
        return current
