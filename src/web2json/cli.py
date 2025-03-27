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
    output: Optional[str] = typer.Option(None, "--output", "-o", help="Custom output path/name"),
    output_dir: Path = typer.Option(
        DEFAULT_OUTPUT_FOLDER, "--output-dir", help="Output directory"
    ),
    preserve_styles: bool = typer.Option(
        False, "--preserve-styles", help="Preserve HTML style tags"
    ),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Enable verbose logging"),
):
    """Process URLs and convert to structured JSON."""
    setup_logging(verbose)
    show_banner()
    
    if url and file:
        console.print("[bold red]Error:[/bold red] Cannot specify both URL and file")
        raise typer.Exit(code=1)
        
    if output and not url:
        console.print("[bold red]Error:[/bold red] Custom output path requires single URL")
        raise typer.Exit(code=1)
        
    if not any([url, file]):
        console.print("[bold red]Error:[/bold red] You must specify either a URL or a file containing URLs")
        typer.echo(app.info.help)
        raise typer.Exit(code=1)  # Changed from 0 to 1 to indicate error
    
    # Ensure output directory exists
    output_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        if url:
            if not validate_url(url):
                console.print(f"[bold red]Invalid URL:[/bold red] {url}")
                raise typer.Exit(code=2)
            
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
                    raise typer.Exit(code=2)
                
        elif file:
            try:
                # Read URLs from file
                file_path = Path(file)
                if not file_path.exists():
                    console.print(f"[bold red]Error:[/bold red] File not found: {file}")
                    raise typer.Exit(code=1)
                
                urls = file_path.read_text().splitlines()
                urls = [url.strip() for url in urls if url.strip()]
                
                if not urls:
                    console.print(f"[bold yellow]Warning:[/bold yellow] No URLs found in {file}")
                    raise typer.Exit(code=1)  # Changed from 0 to 1 to indicate error
                
                console.print(f"Processing [blue]{len(urls)}[/blue] URLs from {file}")
                
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
                
                # Set exit code based on success rate
                if success_count == 0 and failure_count > 0:
                    raise typer.Exit(code=2)
                
            except Exception as e:
                console.print(f"[bold red]Error processing URLs file:[/bold red] {str(e)}")
                raise typer.Exit(code=1)
    
    except KeyboardInterrupt:
        console.print("\n[yellow]Operation cancelled by user[/yellow]")
        raise typer.Exit(code=1)
    except Exception as e:
        console.print(f"[bold red]Unexpected error:[/bold red] {str(e)}")
        if verbose:
            console.print_exception()
        raise typer.Exit(code=3)


@app.command()
def version():
    """Show the current version of web2json."""
    version = __import__('web2json').__version__
    console.print(f"web2json version [bold]{version}[/bold]")


if __name__ == "__main__":
    app()