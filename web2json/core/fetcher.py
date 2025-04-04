"""
Module for fetching web pages from URLs.
"""

import asyncio
from typing import Dict, Optional, Self

import aiohttp
import structlog
from cachetools import LRUCache

from web2json.models.config import FetchConfig


logger = structlog.get_logger(__name__)


class WebFetcher:
    """
    Component responsible for fetching web pages.
    
    Supports caching and retries to handle transient failures.
    """
    
    def __init__(self, config: FetchConfig) -> None:
        """Initialize the fetcher with the given configuration."""
        self.config = config
        self.session: Optional[aiohttp.ClientSession] = None
        self.cache: LRUCache[str, str] = LRUCache(maxsize=100)
    
    async def __aenter__(self) -> Self:
        """Set up the HTTP session when used as a context manager."""
        headers = {"User-Agent": self.config.user_agent}
        self.session = aiohttp.ClientSession(headers=headers)
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Clean up the HTTP session when exiting the context manager."""
        if self.session:
            await self.session.close()
            self.session = None
    
    async def fetch_url(self, url: str) -> str:
        """
        Fetch HTML content from the given URL.
        
        Args:
            url: The URL to fetch.
            
        Returns:
            The HTML content as a string.
            
        Raises:
            aiohttp.ClientError: If there's an error fetching the URL.
        """
        # Check cache first
        if url in self.cache:
            logger.debug("Cache hit", url=url)
            return self.cache[url]
        
        if not self.session:
            raise RuntimeError("WebFetcher must be used within a context manager")
        
        for attempt in range(1, self.config.max_retries + 1):
            try:
                logger.info("Fetching URL", url=url, attempt=attempt)
                
                async with self.session.get(
                    url,
                    timeout=self.config.timeout,
                    allow_redirects=self.config.follow_redirects,
                    verify_ssl=self.config.verify_ssl,
                ) as response:
                    response.raise_for_status()
                    html = await response.text()
                    
                    # Cache the result
                    self.cache[url] = html
                    logger.debug("Successfully fetched URL", url=url, status=response.status)
                    return html
                    
            except aiohttp.ClientError as e:
                logger.warning(
                    "Error fetching URL", 
                    url=url, 
                    attempt=attempt, 
                    error=str(e)
                )
                
                if attempt < self.config.max_retries:
                    # Exponential backoff
                    wait_time = 2 ** (attempt - 1)
                    logger.info("Retrying after backoff", wait_time=wait_time)
                    await asyncio.sleep(wait_time)
                else:
                    logger.error("Max retries exceeded", url=url)
                    raise
    
    @classmethod
    async def fetch(cls, url: str, config: Optional[FetchConfig] = None) -> str:
        """
        Class method for one-off fetching without managing context manually.
        
        Args:
            url: The URL to fetch.
            config: Optional fetch configuration, uses defaults if not provided.
            
        Returns:
            The HTML content as a string.
        """
        config = config or FetchConfig()
        async with cls(config) as fetcher:
            return await fetcher.fetch_url(url)
