"""
Main entry point for the web2json application.
"""

import asyncio
import sys
from typing import List, Optional

import typer
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn

import structlog
from web2json import __version__
from web2json.core.fetcher import WebFetcher
from web2json.core.serializer import JsonSerializer
from web2json.core.transformer import Transformer
from web2json.models.config import Web2JsonConfig


app = typer.Typer(
    help="Transform web pages into structured JSON",
    add_completion=False,
)
console = Console()
logger = structlog.get_logger(__name__)


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
    pretty: bool = typer.Option(
        True,
        "--pretty/--compact",
        help="Format output JSON for readability",
    ),
    verbose: bool = typer.Option(
        False,
        "--verbose", "-v",
        help="Enable verbose output",
    ),
    display: bool = typer.Option(
        False,
        "--display", "-d",
        help="Display the output in the console",
    ),
):
    """
    Convert web pages to structured JSON files.
    """
    # Configure logging
    log_level = "DEBUG" if verbose else "INFO"
    
    # Load default configuration
    config = Web2JsonConfig.create_default()
    
    # Override output directory if specified
    if output_dir:
        config.output.output_directory = output_dir
    
    # Set indentation for JSON output
    if not pretty:
        config.output.indent = None
    
    # Create transformer and serializer
    transformer = Transformer.create_default(config)
    serializer = JsonSerializer(config.output)
    
    # Process each URL
    asyncio.run(_process_urls(urls, transformer, serializer, config, display))


@app.command()
def version():
    """
    Show the version of web2json.
    """
    console.print(f"web2json version: {__version__}")


async def _process_urls(
    urls: List[str],
    transformer: Transformer,
    serializer: JsonSerializer,
    config: Web2JsonConfig,
    display: bool = False,
) -> None:
    """
    Process a list of URLs, transforming them to JSON.
    
    Args:
        urls: List of URLs to process.
        transformer: The transformer to use.
        serializer: The serializer to use.
        config: The application configuration.
        display: Whether to display the output in the console.
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
                    
                    # Display the document if requested
                    if display:
                        console.print()
                        serializer.pretty_print_document(document)
                        console.print()
                    
                except Exception as e:
                    progress.update(task, description=f"❌ Failed {url}")
                    logger.exception(f"Error processing {url}", error=str(e))
                    console.print(f"[red]Error processing {url}: {str(e)}[/red]")


def main() -> int:
    """
    Main entry point for the web2json application.
    
    Returns:
        Exit code (0 for success, non-zero for failure).
    """
    try:
        app()
        return 0
    except Exception as e:
        logger.exception("Unhandled exception", error=str(e))
        console.print(f"[red]Error: {str(e)}[/red]")
        return 1


if __name__ == "__main__":
    sys.exit(main())
