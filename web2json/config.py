"""
Configuration management for the web2json application.
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, Optional

import structlog

from web2json.models.config import Web2JsonConfig


logger = structlog.get_logger(__name__)


class ConfigManager:
    """
    Manages configuration loading, saving, and access.
    """
    
    DEFAULT_CONFIG_PATH = Path.home() / ".config" / "web2json" / "config.json"
    
    def __init__(self, config_path: Optional[str] = None) -> None:
        """
        Initialize the configuration manager.
        
        Args:
            config_path: Optional path to the configuration file.
        """
        self.config_path = Path(config_path) if config_path else self.DEFAULT_CONFIG_PATH
        self.config = Web2JsonConfig.create_default()
    
    def load(self) -> Web2JsonConfig:
        """
        Load configuration from file.
        
        Returns:
            The loaded configuration object.
        """
        # If config file doesn't exist, create a default one
        if not self.config_path.exists():
            logger.info("No config file found, creating default", path=str(self.config_path))
            self._ensure_config_dir()
            self.save(self.config)
            return self.config
        
        try:
            logger.info("Loading config", path=str(self.config_path))
            with open(self.config_path, "r", encoding="utf-8") as f:
                config_data = json.load(f)
            
            # Create a new config object from the loaded data
            self.config = Web2JsonConfig.model_validate(config_data)
            
            logger.debug("Config loaded successfully")
            return self.config
            
        except Exception as e:
            logger.error("Error loading config", error=str(e))
            logger.info("Using default config")
            return self.config
    
    def save(self, config: Web2JsonConfig) -> None:
        """
        Save configuration to file.
        
        Args:
            config: The configuration object to save.
        """
        self._ensure_config_dir()
        
        try:
            # Convert to dictionary and save as JSON
            config_dict = config.model_dump()
            
            logger.info("Saving config", path=str(self.config_path))
            with open(self.config_path, "w", encoding="utf-8") as f:
                json.dump(config_dict, f, indent=2)
            
            logger.debug("Config saved successfully")
            
        except Exception as e:
            logger.error("Error saving config", error=str(e))
    
    def update(self, updates: Dict[str, Any]) -> Web2JsonConfig:
        """
        Update the configuration with new values.
        
        Args:
            updates: Dictionary of configuration updates.
            
        Returns:
            The updated configuration object.
        """
        # Convert the current config to a dictionary
        config_dict = self.config.model_dump()
        
        # Apply the updates
        self._deep_update(config_dict, updates)
        
        # Create a new config object with the updated values
        self.config = Web2JsonConfig.model_validate(config_dict)
        
        # Save the updated config
        self.save(self.config)
        
        return self.config
    
    def reset(self) -> Web2JsonConfig:
        """
        Reset to default configuration.
        
        Returns:
            The default configuration object.
        """
        logger.info("Resetting to default config")
        self.config = Web2JsonConfig.create_default()
        self.save(self.config)
        return self.config
    
    def _ensure_config_dir(self) -> None:
        """Ensure the configuration directory exists."""
        config_dir = self.config_path.parent
        config_dir.mkdir(parents=True, exist_ok=True)
    
    def _deep_update(self, target: Dict[str, Any], updates: Dict[str, Any]) -> None:
        """
        Recursively update a nested dictionary.
        
        Args:
            target: The dictionary to update.
            updates: The updates to apply.
        """
        for key, value in updates.items():
            if key in target and isinstance(target[key], dict) and isinstance(value, dict):
                # Recursively update nested dictionaries
                self._deep_update(target[key], value)
            else:
                # Update or add the value
                target[key] = value


# Singleton instance for global access
_config_manager: Optional[ConfigManager] = None


def get_config_manager(config_path: Optional[str] = None) -> ConfigManager:
    """
    Get the global configuration manager instance.
    
    Args:
        config_path: Optional path to the configuration file.
        
    Returns:
        The configuration manager instance.
    """
    global _config_manager
    
    if _config_manager is None:
        _config_manager = ConfigManager(config_path)
    elif config_path and str(_config_manager.config_path) != config_path:
        # Create a new instance if the path changed
        _config_manager = ConfigManager(config_path)
    
    return _config_manager


def get_config(config_path: Optional[str] = None) -> Web2JsonConfig:
    """
    Get the current configuration.
    
    Args:
        config_path: Optional path to the configuration file.
        
    Returns:
        The current configuration object.
    """
    config_manager = get_config_manager(config_path)
    
    # Load the configuration if not already loaded
    if not config_manager.config:
        config_manager.load()
    
    return config_manager.config
