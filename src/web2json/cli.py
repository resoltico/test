"""Command-line interface for web2json."""
import asyncio
import logging
import os
from pathlib import Path
from typing import Optional, List

import typer
from rich.console import Console
from rich.logging import RichHandler
from rich.progress import Progress, SpinnerColumn, TextColumn

from web2json.core.pipeline import process_url, bulk_process_urls
from web2json.utils.url import validate_url

# Create Typer app
app = typer.Typer(
    help="Web page to structured JSON converter",
    add_completion=False,
)

# Initialize rich console
console = Console()

# Default output directory
DEFAULT_OUTPUT_FOLDER = Path("fetched_jsons")

# Exit code constants for better readability and consistency
EXIT_SUCCESS = 0
EXIT_ERROR_GENERAL = 1
EXIT_ERROR_PROCESSING = 2
EXIT_ERROR_UNEXPECTED = 3


def setup_logging(verbose: bool = False) -> None:
    """Configure logging with rich formatting."""
    log_level = logging.DEBUG if verbose else logging.INFO
    
    logging.basicConfig(
        level=log_level,
        format="%(message)s",
        datefmt="[%X]",
        handlers=[RichHandler(rich_tracebacks=True)]
    )


def show_banner() -> None:
    """Display program banner."""
    console.print(f"""
[bold blue]web2json v{__import__('web2json').__version__}[/bold blue]
[italic]Web page to structured JSON converter[/italic]
    """)


@app.command()
def process(
    url: Optional[str] = typer.Option(None, "--url", "-u", help="Single URL to process"),
    file: Optional[Path] = typer.Option(None, "--file", "-f", help="File containing URLs (one per line)"),
    output: Optional[str] = typer.Option(None, "--output", "-o", help="Custom output filename (without extension)"),
    output_dir: Path = typer.Option(
        DEFAULT_OUTPUT_FOLDER, "--output-dir", "-d", help="Directory to save output files"
    ),
    preserve_styles: bool = typer.Option(
        False, "--preserve-styles", help="Preserve HTML style tags"
    ),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Enable verbose logging"),
):
    """Process URLs and convert to structured JSON.
    
    For a single URL (--url), the output will be saved as:
      - With --output: [output_dir]/[output].json
      - Without --output: [output_dir]/[auto_generated_name].json
    
    For multiple URLs (--file), each output will be saved with auto-generated names in [output_dir].
    """
    setup_logging(verbose)
    show_banner()
    
    if url and file:
        console.print("[bold red]Error:[/bold red] Cannot specify both URL and file")
        raise typer.Exit(code=EXIT_ERROR_GENERAL)
        
    if output and not url:
        console.print("[bold red]Error:[/bold red] Custom output filename (--output) can only be used with a single URL (--url)")
        raise typer.Exit(code=EXIT_ERROR_GENERAL)
        
    if not any([url, file]):
        console.print("[bold red]Error:[/bold red] You must specify either a URL (--url) or a file containing URLs (--file)")
        typer.echo(app.info.help)
        raise typer.Exit(code=EXIT_ERROR_GENERAL)
    
    # Ensure output directory exists
    output_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        if url:
            if not validate_url(url):
                console.print(f"[bold red]Invalid URL:[/bold red] {url}")
                raise typer.Exit(code=EXIT_ERROR_PROCESSING)
            
            console.print(f"Processing: [blue]{url}[/blue]")
            
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console,
                transient=True,
            ) as progress:
                progress.add_task("Fetching content...", total=None)
                
                # Construct output path if provided
                output_path = None
                if output:
                    output_path = output_dir / f"{output}.json"
                    console.print(f"Output will be saved to: [blue]{output_path}[/blue]")
                else:
                    console.print(f"Output will be saved to: [blue]{output_dir}/[auto_generated_name].json[/blue]")
                
                # Process URL
                result = asyncio.run(process_url(
                    url=url,
                    output_path=output_path,
                    output_dir=output_dir,
                    preserve_styles=preserve_styles
                ))
                
                if result["success"]:
                    console.print(f"[green]Success:[/green] Processed {url}")
                    console.print(f"Output saved to: [blue]{result['output_path']}[/blue]")
                else:
                    console.print(f"[red]Error:[/red] {result['error']}")
                    raise typer.Exit(code=EXIT_ERROR_PROCESSING)
                
        elif file:
            try:
                # Read URLs from file
                file_path = Path(file)
                if not file_path.exists():
                    console.print(f"[bold red]Error:[/bold red] File not found: {file}")
                    raise typer.Exit(code=EXIT_ERROR_GENERAL)
                
                urls = file_path.read_text().splitlines()
                urls = [url.strip() for url in urls if url.strip()]
                
                if not urls:
                    console.print(f"[bold yellow]Warning:[/bold yellow] No URLs found in {file}")
                    raise typer.Exit(code=EXIT_ERROR_GENERAL)
                
                console.print(f"Processing [blue]{len(urls)}[/blue] URLs from {file}")
                console.print(f"Outputs will be saved to: [blue]{output_dir}/[auto_generated_names].json[/blue]")
                
                # Process URLs
                results = asyncio.run(bulk_process_urls(
                    urls=urls,
                    output_dir=output_dir,
                    preserve_styles=preserve_styles
                ))
                
                # Show results
                success_count = sum(1 for r in results if r["success"])
                failure_count = len(results) - success_count
                
                console.print(f"\n[bold]Results:[/bold]")
                console.print(f"  [green]Success:[/green] {success_count}")
                console.print(f"  [red]Failure:[/red] {failure_count}")
                
                if failure_count > 0:
                    console.print("\n[bold]Failed URLs:[/bold]")
                    for result in results:
                        if not result["success"]:
                            console.print(f"  [red]{result['url']}[/red]: {result['error']}")
                
                # UPDATED: Return error code if ANY URLs fail (instead of only when ALL fail)
                if failure_count > 0:
                    raise typer.Exit(code=EXIT_ERROR_PROCESSING)
                
            except Exception as e:
                console.print(f"[bold red]Error processing URLs file:[/bold red] {str(e)}")
                raise typer.Exit(code=EXIT_ERROR_GENERAL)
    
    except KeyboardInterrupt:
        console.print("\n[yellow]Operation cancelled by user[/yellow]")
        raise typer.Exit(code=EXIT_ERROR_GENERAL)
    except Exception as e:
        console.print(f"[bold red]Unexpected error:[/bold red] {str(e)}")
        if verbose:
            console.print_exception()
        raise typer.Exit(code=EXIT_ERROR_UNEXPECTED)


@app.command()
def version():
    """Show the current version of web2json."""
    version = __import__('web2json').__version__
    console.print(f"web2json version [bold]{version}[/bold]")


if __name__ == "__main__":
    app()