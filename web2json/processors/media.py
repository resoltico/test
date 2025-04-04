"""
Processor for media elements (images, videos, audio).
"""

from typing import Dict, List, Optional, Any, Union, cast 

import structlog
from bs4 import BeautifulSoup, Tag

from web2json.models.document import Document
from web2json.models.section import Section
from web2json.processors.base import ElementProcessor, ContentItem


logger = structlog.get_logger(__name__)


class MediaProcessor(ElementProcessor):
    """
    Processor for media elements such as images, videos, and audio.
    
    Extracts and processes media elements in the document, preserving
    attributes, sources, and associated metadata.
    """
    
    def process(self, soup: BeautifulSoup, document: Document) -> Document:
        """
        Process media elements in the document.
        
        Args:
            soup: The BeautifulSoup object containing the parsed HTML.
            document: The Document object to enhance with processed elements.
            
        Returns:
            The enhanced Document object.
        """
        logger.info("Processing media elements")
        
        # Process media elements in each section
        self.process_sections(document.content)
        
        return document
    
    def process_section_content(self, section: Section) -> None:
        """
        Process media elements for a single section.
        
        Args:
            section: The section to process.
        """
        # Process figures first (they may contain media)
        for element in section.raw_content_elements:
            if element.name == "figure":
                figure_dict = self._process_figure(element)
                section.add_content(figure_dict)
                
                logger.debug(
                    "Added figure to section", 
                    section_title=section.title,
                    figure_id=element.get("id")
                )
        
        # Process standalone images (not inside figures)
        for element in section.raw_content_elements:
            if element.name == "img" and not element.find_parent("figure"):
                # Skip if inside other containers that will be handled separately
                if self._should_skip_element(element):
                    continue
                    
                image_dict = self._process_image(element)
                if image_dict:
                    section.add_content(image_dict)
                    
                    logger.debug(
                        "Added image to section", 
                        section_title=section.title,
                        image_src=element.get("src", "")[-30:]
                    )
        
        # Process audio and video elements
        for element in section.raw_content_elements:
            if element.name in ["audio", "video"] and not element.find_parent("figure"):
                # Skip if inside other containers
                if self._should_skip_element(element):
                    continue
                    
                if element.name == "audio":
                    media_dict = self._process_audio(element)
                else:  # video
                    media_dict = self._process_video(element)
                
                if media_dict:
                    section.add_content(media_dict)
                    
                    logger.debug(
                        "Added media to section", 
                        section_title=section.title,
                        media_type=element.name
                    )
            
            # Process SVG elements
            elif element.name == "svg" and not element.find_parent("figure"):
                if self._should_skip_element(element):
                    continue
                    
                svg_dict = self._process_svg(element)
                if svg_dict:
                    section.add_content(svg_dict)
                    
                    logger.debug(
                        "Added SVG to section",
                        section_title=section.title
                    )
    
    def _should_skip_element(self, element: Tag) -> bool:
        """
        Determine if a media element should be skipped.
        
        Args:
            element: The element to check.
            
        Returns:
            True if the element should be skipped, False otherwise.
        """
        # Skip elements inside certain containers
        skip_containers = {"table", "form"}
        
        parent = element.parent
        while parent:
            if parent.name in skip_containers:
                return True
            parent = parent.parent
            
        return False
    
    def _process_image(self, img: Tag) -> ContentItem:
        """
        Process an image element.
        
        Args:
            img: The image element to process.
            
        Returns:
            A dictionary representation of the image.
        """
        if not img.get("src"):
            logger.warning("Image without src attribute", element=str(img)[:100])
            return self.create_content_object(
                element_type="image",
                content="Missing source",
                element_id=img.get("id")
            )
        
        # Create an image content object
        result = self.create_content_object(
            element_type="image",
            element_id=img.get("id")
        )
        
        # Add the src attribute
        result["src"] = img["src"]
        
        # Extract common attributes
        for attr in ["alt", "title", "width", "height"]:
            if img.has_attr(attr):
                result[attr] = img[attr]
        
        # Handle responsive image attributes
        if img.has_attr("srcset"):
            result["srcset"] = img["srcset"]
        
        if img.has_attr("sizes"):
            result["sizes"] = img["sizes"]
        
        # Check for an enclosing link
        parent_link = img.find_parent("a")
        if parent_link and parent_link.has_attr("href"):
            result["link"] = parent_link["href"]
        
        return result
    
    def _process_figure(self, figure: Tag) -> ContentItem:
        """
        Process a figure element.
        
        Args:
            figure: The figure element to process.
            
        Returns:
            A dictionary representation of the figure.
        """
        # Create a figure content object
        result = self.create_content_object(
            element_type="figure",
            element_id=figure.get("id")
        )
        
        # Extract figcaption
        figcaption = figure.find("figcaption")
        if figcaption:
            result["caption"] = self.extract_text_content(figcaption)
        
        # Process content elements
        content = []
        
        # Process contained images
        for img in figure.find_all("img", recursive=True):
            image_dict = self._process_image(img)
            content.append(image_dict)
        
        # Process contained videos
        for video in figure.find_all("video", recursive=True):
            video_dict = self._process_video(video)
            content.append(video_dict)
        
        # Process contained audio
        for audio in figure.find_all("audio", recursive=True):
            audio_dict = self._process_audio(audio)
            content.append(audio_dict)
        
        # Process SVG elements
        svg = figure.find("svg")
        if svg:
            svg_dict = self._process_svg(svg)
            content.append(svg_dict)
        
        # If no media content found, extract text (excluding figcaption)
        if not content:
            text = self.extract_text_content(figure, preserve_formatting=True)
            
            # Remove figcaption text if present
            if figcaption:
                caption_text = self.extract_text_content(figcaption)
                text = text.replace(caption_text, "").strip()
            
            if text:
                content.append({"type": "text", "text": text})
        
        result["content"] = content
        
        return result
    
    def _process_video(self, video: Tag) -> ContentItem:
        """
        Process a video element.
        
        Args:
            video: The video element to process.
            
        Returns:
            A dictionary representation of the video.
        """
        # Create a video content object
        result = self.create_content_object(
            element_type="video",
            element_id=video.get("id")
        )
        
        # Extract common attributes
        for attr in ["width", "height", "poster"]:
            if video.has_attr(attr):
                result[attr] = video[attr]
        
        # Handle boolean attributes
        for attr in ["controls", "autoplay", "loop", "muted"]:
            if video.has_attr(attr):
                result[attr] = True
        
        # Extract source elements
        sources = []
        for source in video.find_all("source"):
            if source.has_attr("src"):
                source_dict = {
                    "src": source["src"]
                }
                
                if source.has_attr("type"):
                    source_dict["type"] = source["type"]
                    
                sources.append(source_dict)
        
        # Handle direct src attribute
        if not sources and video.has_attr("src"):
            sources.append({"src": video["src"]})
        
        if sources:
            result["sources"] = sources
        
        # Extract tracks (captions, subtitles)
        tracks = []
        for track in video.find_all("track"):
            if track.has_attr("src"):
                track_dict = {
                    "src": track["src"],
                    "kind": track.get("kind", "subtitles")
                }
                
                if track.has_attr("label"):
                    track_dict["label"] = track["label"]
                    
                if track.has_attr("srclang"):
                    track_dict["srclang"] = track["srclang"]
                    
                tracks.append(track_dict)
        
        if tracks:
            result["tracks"] = tracks
        
        return result
    
    def _process_audio(self, audio: Tag) -> ContentItem:
        """
        Process an audio element.
        
        Args:
            audio: The audio element to process.
            
        Returns:
            A dictionary representation of the audio.
        """
        # Create an audio content object
        result = self.create_content_object(
            element_type="audio",
            element_id=audio.get("id")
        )
        
        # Handle boolean attributes
        for attr in ["controls", "autoplay", "loop", "muted"]:
            if audio.has_attr(attr):
                result[attr] = True
        
        # Extract source elements
        sources = []
        for source in audio.find_all("source"):
            if source.has_attr("src"):
                source_dict = {
                    "src": source["src"]
                }
                
                if source.has_attr("type"):
                    source_dict["type"] = source["type"]
                    
                sources.append(source_dict)
        
        # Handle direct src attribute
        if not sources and audio.has_attr("src"):
            sources.append({"src": audio["src"]})
        
        if sources:
            result["sources"] = sources
        
        return result
    
    def _process_svg(self, svg: Tag) -> ContentItem:
        """
        Process an SVG element.
        
        Args:
            svg: The SVG element to process.
            
        Returns:
            A dictionary representation of the SVG.
        """
        # Create an SVG content object
        result = self.create_content_object(
            element_type="svg",
            element_id=svg.get("id")
        )
        
        # Extract viewBox attribute
        if svg.has_attr("viewBox"):
            result["viewBox"] = svg["viewBox"]
        
        # Extract dimensions
        for attr in ["width", "height"]:
            if svg.has_attr(attr):
                result[attr] = svg[attr]
        
        # Count SVG elements to provide a summary
        element_counts = {}
        for element_type in ["rect", "circle", "path", "line", "text", "g"]:
            count = len(svg.find_all(element_type))
            if count > 0:
                element_counts[element_type] = count
        
        if element_counts:
            result["elements"] = element_counts
        
        return result
