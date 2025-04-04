"""
Command-line interface for the web2json application.
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from typing import List, Optional

import structlog
import typer
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

from web2json.config import get_config, get_config_manager
from web2json.core.fetcher import WebFetcher
from web2json.core.serializer import JsonSerializer
from web2json.core.transformer import Transformer
from web2json.models.config import Web2JsonConfig
from web2json.utils.logging_setup import setup_logging


logger = structlog.get_logger(__name__)
console = Console()
app = typer.Typer(help="Transform web pages into structured JSON")


@app.command()
def convert(
    urls: List[str] = typer.Argument(
        ...,
        help="URLs of web pages to transform",
    ),
    output_dir: Optional[str] = typer.Option(
        None,
        "--output-dir", "-o",
        help="Directory to save output files (default: ./output)",
    ),
    config_path: Optional[str] = typer.Option(
        None,
        "--config", "-c",
        help="Path to custom configuration file",
    ),
    format_output: bool = typer.Option(
        True,
        "--format/--no-format",
        help="Format output JSON for readability",
    ),
    verbose: bool = typer.Option(
        False,
        "--verbose", "-v",
        help="Enable verbose output",
    ),
) -> None:
    """
    Convert web pages to structured JSON files.
    """
    # Initialize logging
    log_level = "DEBUG" if verbose else "INFO"
    setup_logging(log_level=log_level)
    
    # Load configuration
    config = get_config(config_path)
    
    # Override output directory if specified
    if output_dir:
        config.output.output_directory = output_dir
    
    # Ensure output directory exists
    os.makedirs(config.output.output_directory, exist_ok=True)
    
    # Set indentation for JSON output
    if not format_output:
        config.output.indent = None
    
    # Create transformer and serializer
    transformer = Transformer.create_default(config)
    serializer = JsonSerializer(config.output)
    
    # Process each URL
    asyncio.run(_process_urls(urls, transformer, serializer, config))


@app.command()
def config(
    set_value: Optional[List[str]] = typer.Option(
        None,
        "--set", "-s",
        help="Set a configuration value (format: key=value)",
    ),
    reset: bool = typer.Option(
        False,
        "--reset",
        help="Reset to default configuration",
    ),
    show: bool = typer.Option(
        False,
        "--show",
        help="Show current configuration",
    ),
    config_path: Optional[str] = typer.Option(
        None,
        "--config", "-c",
        help="Path to custom configuration file",
    ),
) -> None:
    """
    Manage application configuration.
    """
    # Initialize logging
    setup_logging(log_level="INFO")
    
    # Get configuration manager
    config_manager = get_config_manager(config_path)
    
    # Load current configuration
    current_config = config_manager.load()
    
    if reset:
        # Reset to default configuration
        config_manager.reset()
        console.print("[green]Configuration reset to default values.[/green]")
        return
    
    if set_value:
        # Update configuration values
        updates = {}
        for item in set_value:
            if "=" not in item:
                console.print(f"[red]Invalid format for --set: {item}[/red]")
                console.print("Format should be: key=value")
                sys.exit(1)
            
            key, value = item.split("=", 1)
            
            # Parse value to the appropriate type
            try:
                # Try to parse as JSON
                parsed_value = json.loads(value)
                _update_nested_dict(updates, key.split("."), parsed_value)
            except json.JSONDecodeError:
                # Fallback to string
                _update_nested_dict(updates, key.split("."), value)
        
        # Apply updates
        config_manager.update(updates)
        console.print("[green]Configuration updated.[/green]")
    
    if show or not (reset or set_value):
        # Show current configuration
        config_dict = current_config.model_dump()
        _print_config(config_dict, config_manager.config_path)


def _update_nested_dict(d: dict, keys: List[str], value: object) -> None:
    """
    Update a nested dictionary using a list of keys.
    
    Args:
        d: The dictionary to update.
        keys: List of keys defining the path in the nested dictionary.
        value: The value to set.
    """
    if len(keys) == 1:
        d[keys[0]] = value
        return
    
    if keys[0] not in d:
        d[keys[0]] = {}
    
    _update_nested_dict(d[keys[0]], keys[1:], value)


def _print_config(config: dict, config_path: Path) -> None:
    """
    Print configuration in a formatted table.
    
    Args:
        config: The configuration dictionary.
        config_path: Path to the configuration file.
    """
    console.print(f"Configuration file: [blue]{config_path}[/blue]\n")
    
    # Create tables for each section
    for section, values in config.items():
        table = Table(title=f"{section.capitalize()} Configuration")
        table.add_column("Setting", style="cyan")
        table.add_column("Value", style="green")
        
        if isinstance(values, dict):
            for key, value in values.items():
                if isinstance(value, dict):
                    # Nested dictionaries
                    nested_values = ", ".join(f"{k}: {v}" for k, v in value.items())
                    table.add_row(key, nested_values)
                else:
                    table.add_row(key, str(value))
        else:
            table.add_row(section, str(values))
        
        console.print(table)
        console.print()


async def _process_urls(
    urls: List[str],
    transformer: Transformer,
    serializer: JsonSerializer,
    config: Web2JsonConfig,
) -> None:
    """
    Process a list of URLs, transforming them to JSON.
    
    Args:
        urls: List of URLs to process.
        transformer: The transformer to use.
        serializer: The serializer to use.
        config: The application configuration.
    """
    # Show progress
    with Progress(
        SpinnerColumn(),
        TextColumn("[bold blue]{task.description}"),
        console=console,
    ) as progress:
        # Create a fetcher for downloading web pages
        async with WebFetcher(config.fetch) as fetcher:
            for url in urls:
                task = progress.add_task(f"Processing {url}", total=None)
                
                try:
                    # Fetch the web page
                    html = await fetcher.fetch_url(url)
                    
                    # Transform to structured document
                    document = transformer.transform(html, url)
                    
                    # Serialize and save
                    output_path = serializer.save_to_file(document)
                    
                    progress.update(task, description=f"✅ Processed {url}")
                    console.print(f"Output saved to: [green]{output_path}[/green]")
                    
                except Exception as e:
                    progress.update(task, description=f"❌ Failed {url}")
                    logger.exception(f"Error processing {url}", error=str(e))
                    console.print(f"[red]Error processing {url}: {str(e)}[/red]")


def run() -> None:
    """Run the CLI application."""
    app()


if __name__ == "__main__":
    run()
