"""
Configuration model for web2json application settings.
"""

from typing import List, Optional, Set, Dict, Any

from pydantic import BaseModel, Field, field_validator


class ProcessingConfig(BaseModel):
    """Processing configuration for the HTML to JSON transformation."""
    
    # Headings and content configuration
    heading_tags: Set[str] = Field(
        default={"h1", "h2", "h3", "h4", "h5", "h6"},
        description="HTML tags to treat as headings for structural hierarchy"
    )
    
    content_tags: Set[str] = Field(
        default={
            "p", "ul", "ol", "dl", "pre", "blockquote", "figure", "table",
            "form", "div", "section", "article", "aside", "main", "header",
            "footer", "nav", "details", "time", "address", "search"
        },
        description="HTML tags to process as content elements"
    )
    
    block_tags: Set[str] = Field(
        default={
            "div", "p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "dl", "dt", "dd",
            "table", "tr", "td", "th", "section", "article", "aside", "header", "footer", "nav",
            "form", "fieldset", "pre", "blockquote"
        },
        description="HTML tags that represent block-level elements"
    )
    
    inline_tags: Set[str] = Field(
        default={
            "a", "span", "strong", "em", "b", "i", "u", "s", "code", "small", "sup", "sub",
            "mark", "abbr", "time", "q", "cite", "kbd", "var", "samp", "dfn", "ruby", "rt",
            "bdo", "bdi", "data", "wbr"
        },
        description="HTML tags that represent inline-level elements"
    )
    
    semantic_tags: Set[str] = Field(
        default={
            "article", "aside", "details", "dialog", "summary", "figure", "figcaption",
            "footer", "header", "main", "mark", "nav", "section", "time", "meter",
            "progress", "output", "menu", "address", "blockquote"
        },
        description="HTML tags with semantic meaning"
    )
    
    ignore_tags: Set[str] = Field(
        default={"script", "style", "noscript", "template", "iframe", "meta", "link", "base"},
        description="HTML tags to ignore completely during processing"
    )
    
    # Content processing options
    preserve_html_formatting: bool = Field(
        default=True,
        description="Whether to preserve HTML formatting in text content"
    )
    
    extract_metadata: bool = Field(
        default=True,
        description="Whether to extract metadata from the page"
    )
    
    preserve_inline_formatting: bool = Field(
        default=True,
        description="Whether to preserve inline HTML formatting in the output"
    )
    
    @field_validator("heading_tags", "content_tags", "ignore_tags", "semantic_tags", 
                   "block_tags", "inline_tags", mode="before")
    @classmethod
    def ensure_lowercase(cls, value: Set[str]) -> Set[str]:
        """Ensure all tag names are lowercase."""
        return {tag.lower() for tag in value}


class FetchConfig(BaseModel):
    """Configuration for fetching web pages."""
    
    timeout: float = Field(
        default=30.0,
        description="Timeout in seconds for HTTP requests"
    )
    
    user_agent: str = Field(
        default=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ),
        description="User-Agent header to use for HTTP requests"
    )
    
    max_retries: int = Field(
        default=3,
        description="Maximum number of retry attempts for failed requests"
    )
    
    follow_redirects: bool = Field(
        default=True,
        description="Whether to follow HTTP redirects"
    )
    
    verify_ssl: bool = Field(
        default=True,
        description="Whether to verify SSL certificates"
    )
    
    additional_headers: Dict[str, str] = Field(
        default_factory=dict,
        description="Additional HTTP headers to include in requests"
    )


class OutputConfig(BaseModel):
    """Configuration for JSON output."""
    
    indent: int = Field(
        default=2,
        description="Number of spaces for indentation in the output JSON"
    )
    
    ensure_ascii: bool = Field(
        default=False,
        description="Whether to ensure ASCII encoding in the output JSON"
    )
    
    output_directory: str = Field(
        default="./output",
        description="Directory where output JSON files will be saved"
    )
    
    filename_template: str = Field(
        default="{domain}_{path}.json",
        description="Template for output filenames"
    )
    
    include_metadata: bool = Field(
        default=True,
        description="Whether to include page metadata in the output"
    )
    
    include_url: bool = Field(
        default=True,
        description="Whether to include the source URL in the output"
    )


class Web2JsonConfig(BaseModel):
    """Main configuration for the web2json application."""
    
    processing: ProcessingConfig = Field(default_factory=ProcessingConfig)
    fetch: FetchConfig = Field(default_factory=FetchConfig)
    output: OutputConfig = Field(default_factory=OutputConfig)
    log_level: str = Field(default="INFO")
    
    @classmethod
    def create_default(cls) -> "Web2JsonConfig":
        """Create a configuration with default settings."""
        return cls()
