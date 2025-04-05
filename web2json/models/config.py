"""
Configuration model for web2json application settings.
"""

from typing import Dict, List, Optional, Set, Any

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
            "footer", "nav", "details", "search", "time", "address"
        },
        description="HTML tags to process as content elements"
    )
    
    semantic_tags: Set[str] = Field(
        default={
            "article", "aside", "details", "dialog", "summary", "figure", "figcaption",
            "footer", "header", "main", "mark", "nav", "section", "time", "meter",
            "progress", "output", "menu", "hgroup", "address", "blockquote"
        },
        description="HTML tags with semantic meaning"
    )
    
    # Tags that should be preserved in text content
    preserve_tags: Set[str] = Field(
        default={
            "a", "abbr", "b", "bdi", "bdo", "br", "cite", "code", "data", "dfn", 
            "em", "i", "kbd", "mark", "q", "ruby", "rt", "s", "samp", "small", 
            "span", "strong", "sub", "sup", "time", "u", "var", "wbr",
            # Also preserve some structural elements when in content
            "blockquote", "pre", "hr"
        },
        description="HTML tags to preserve in text content"
    )
    
    inline_tags: Set[str] = Field(
        default={
            "a", "span", "strong", "em", "b", "i", "u", "s", "code", "small", "sup", "sub",
            "mark", "abbr", "time", "q", "cite", "kbd", "var", "samp", "dfn", "ruby", "rt",
            "bdo", "bdi", "data", "wbr"
        },
        description="HTML tags that represent inline-level elements"
    )
    
    ignore_tags: Set[str] = Field(
        default={"script", "style", "noscript", "template", "iframe", "meta", "link", "base"},
        description="HTML tags to ignore completely during processing"
    )
    
    # Content processing options
    extract_metadata: bool = Field(
        default=True,
        description="Whether to extract metadata from the page"
    )
    
    normalize_whitespace: bool = Field(
        default=True,
        description="Whether to normalize whitespace in text content"
    )
    
    # Preserve HTML tags in content text
    preserve_html_tags: bool = Field(
        default=True,
        description="Whether to preserve specified HTML tags in content text"
    )
    
    @field_validator("heading_tags", "content_tags", "ignore_tags", 
                    "semantic_tags", "inline_tags", "preserve_tags")
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
