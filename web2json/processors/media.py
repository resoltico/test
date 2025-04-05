"""
Media processor for handling images, videos, audio, and other media elements.
"""

from typing import Dict, List, Any, Optional

import structlog
from bs4 import Tag

from web2json.models.section import Section
from web2json.processors.base import ElementProcessor


logger = structlog.get_logger(__name__)


class MediaProcessor(ElementProcessor):
    """
    Processor for media elements.
    
    This processor extracts structured data from images, videos, audio,
    and other media elements.
    """
    
    def process(self, element: Tag, section: Section) -> None:
        """
        Process a media element and add the result to the section.
        
        Args:
            element: The media element to process.
            section: The section to add the processed content to.
        """
        if element.name == "img":
            self._process_image(element, section)
        elif element.name == "figure":
            self._process_figure(element, section)
        elif element.name == "video":
            self._process_video(element, section)
        elif element.name == "audio":
            self._process_audio(element, section)
        elif element.name == "iframe":
            self._process_iframe(element, section)
        elif element.name == "svg":
            self._process_svg(element, section)
    
    def _process_image(self, element: Tag, section: Section) -> None:
        """
        Process an image element.
        
        Args:
            element: The image element.
            section: The section to add the processed content to.
        """
        # Skip images inside figures (they'll be processed with the figure)
        if element.find_parent("figure"):
            return
        
        image_data = {
            "type": "image",
            "src": element.get("src", ""),
            "alt": element.get("alt", "")
        }
        
        # Add width and height if available
        width = element.get("width")
        if width:
            image_data["width"] = width
        
        height = element.get("height")
        if height:
            image_data["height"] = height
        
        # Add title if available
        title = element.get("title")
        if title:
            image_data["title"] = title
        
        section.add_content(image_data)
    
    def _process_figure(self, element: Tag, section: Section) -> None:
        """
        Process a figure element.
        
        Args:
            element: The figure element.
            section: The section to add the processed content to.
        """
        figure_data = {
            "type": "figure"
        }
        
        # Extract figcaption
        figcaption = element.find("figcaption")
        if figcaption:
            figure_data["caption"] = self.get_text_content(figcaption)
        
        # Extract image
        img = element.find("img")
        if img:
            figure_data["src"] = img.get("src", "")
            figure_data["alt"] = img.get("alt", "")
            
            # Add width and height if available
            width = img.get("width")
            if width:
                figure_data["width"] = width
            
            height = img.get("height")
            if height:
                figure_data["height"] = height
        
        # Extract SVG
        svg = element.find("svg")
        if svg:
            figure_data["svg"] = str(svg)
        
        # Add the figure to the section content
        if "caption" in figure_data or "src" in figure_data or "svg" in figure_data:
            section.add_content(figure_data)
    
    def _process_video(self, element: Tag, section: Section) -> None:
        """
        Process a video element.
        
        Args:
            element: The video element.
            section: The section to add the processed content to.
        """
        video_data = {
            "type": "video",
            "sources": []
        }
        
        # Extract video sources
        for source in element.find_all("source"):
            source_data = {
                "src": source.get("src", ""),
                "type": source.get("type", "")
            }
            
            video_data["sources"].append(source_data)
        
        # Add poster if available
        poster = element.get("poster")
        if poster:
            video_data["poster"] = poster
        
        # Add controls attribute
        if element.has_attr("controls"):
            video_data["controls"] = True
        
        # Add autoplay attribute
        if element.has_attr("autoplay"):
            video_data["autoplay"] = True
        
        # Add loop attribute
        if element.has_attr("loop"):
            video_data["loop"] = True
        
        # Add width and height if available
        width = element.get("width")
        if width:
            video_data["width"] = width
        
        height = element.get("height")
        if height:
            video_data["height"] = height
        
        # Add the video to the section content
        section.add_content(video_data)
    
    def _process_audio(self, element: Tag, section: Section) -> None:
        """
        Process an audio element.
        
        Args:
            element: The audio element.
            section: The section to add the processed content to.
        """
        audio_data = {
            "type": "audio",
            "sources": []
        }
        
        # Extract audio sources
        for source in element.find_all("source"):
            source_data = {
                "src": source.get("src", ""),
                "type": source.get("type", "")
            }
            
            audio_data["sources"].append(source_data)
        
        # Add controls attribute
        if element.has_attr("controls"):
            audio_data["controls"] = True
        
        # Add autoplay attribute
        if element.has_attr("autoplay"):
            audio_data["autoplay"] = True
        
        # Add loop attribute
        if element.has_attr("loop"):
            audio_data["loop"] = True
        
        # Add the audio to the section content
        section.add_content(audio_data)
    
    def _process_iframe(self, element: Tag, section: Section) -> None:
        """
        Process an iframe element.
        
        Args:
            element: The iframe element.
            section: The section to add the processed content to.
        """
        iframe_data = {
            "type": "iframe",
            "src": element.get("src", "")
        }
        
        # Add width and height if available
        width = element.get("width")
        if width:
            iframe_data["width"] = width
        
        height = element.get("height")
        if height:
            iframe_data["height"] = height
        
        # Add title if available
        title = element.get("title")
        if title:
            iframe_data["title"] = title
        
        # Add the iframe to the section content
        section.add_content(iframe_data)
    
    def _process_svg(self, element: Tag, section: Section) -> None:
        """
        Process an SVG element.
        
        Args:
            element: The SVG element.
            section: The section to add the processed content to.
        """
        # Skip SVGs inside figures (they'll be processed with the figure)
        if element.find_parent("figure"):
            return
        
        svg_data = {
            "type": "svg",
            "content": str(element)
        }
        
        # Add width and height if available
        width = element.get("width")
        if width:
            svg_data["width"] = width
        
        height = element.get("height")
        if height:
            svg_data["height"] = height
        
        # Add the SVG to the section content
        section.add_content(svg_data)
