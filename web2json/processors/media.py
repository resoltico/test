"""
Processor for media elements (images, videos, audio).
"""

from typing import Dict, List, Optional, Any

import structlog
from bs4 import BeautifulSoup, Tag

from web2json.models.document import Document
from web2json.processors.base import ElementProcessor


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
        self._process_sections(document.content)
        
        return document
    
    def _process_sections(self, sections: List) -> None:
        """
        Process all sections recursively.
        
        Args:
            sections: List of sections to process.
        """
        for section in sections:
            # Process media in this section
            self._process_section_media(section)
            
            # Process child sections recursively
            if section.children:
                self._process_sections(section.children)
    
    def _process_section_media(self, section) -> None:
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
    
    def _process_image(self, img: Tag) -> Optional[Dict[str, Any]]:
        """
        Process an image element.
        
        Args:
            img: The image element to process.
            
        Returns:
            A dictionary representation of the image, or None if it's invalid.
        """
        if not img.get("src"):
            logger.warning("Image without src attribute", element=str(img)[:100])
            return None
        
        result = {
            "type": "image",
            "src": img["src"]
        }
        
        # Extract common attributes
        for attr in ["alt", "title", "width", "height"]:
            if img.has_attr(attr):
                result[attr] = img[attr]
        
        # Handle responsive image attributes
        if img.has_attr("srcset"):
            result["srcset"] = img["srcset"]
        
        # Check for an enclosing link
        parent_link = img.find_parent("a")
        if parent_link and parent_link.has_attr("href"):
            result["link"] = parent_link["href"]
        
        return result
    
    def _process_figure(self, figure: Tag) -> Dict[str, Any]:
        """
        Process a figure element.
        
        Args:
            figure: The figure element to process.
            
        Returns:
            A dictionary representation of the figure.
        """
        result = {
            "type": "figure",
            "content": []
        }
        
        # Extract figure ID
        if figure.has_attr("id"):
            result["id"] = figure["id"]
        
        # Extract figcaption
        figcaption = figure.find("figcaption")
        if figcaption:
            result["caption"] = figcaption.get_text().strip()
        
        # Process contained images
        for img in figure.find_all("img", recursive=True):
            image_dict = self._process_image(img)
            if image_dict:
                result["content"].append(image_dict)
        
        # Process contained videos
        for video in figure.find_all("video", recursive=True):
            video_dict = self._process_video(video)
            if video_dict:
                result["content"].append(video_dict)
        
        # Process contained audio
        for audio in figure.find_all("audio", recursive=True):
            audio_dict = self._process_audio(audio)
            if audio_dict:
                result["content"].append(audio_dict)
        
        # Process SVG elements
        svg = figure.find("svg")
        if svg:
            svg_dict = self._process_svg(svg)
            if svg_dict:
                result["content"].append(svg_dict)
        
        # If no media content found, extract text
        if not result["content"]:
            text = figure.get_text().strip()
            
            # Remove figcaption text if present
            if figcaption:
                caption_text = figcaption.get_text().strip()
                if caption_text in text:
                    text = text.replace(caption_text, "").strip()
            
            if text:
                result["content"].append({"type": "text", "text": text})
        
        return result
    
    def _process_video(self, video: Tag) -> Dict[str, Any]:
        """
        Process a video element.
        
        Args:
            video: The video element to process.
            
        Returns:
            A dictionary representation of the video.
        """
        result = {
            "type": "video",
            "sources": []
        }
        
        # Extract common attributes
        for attr in ["width", "height", "poster", "controls", "autoplay", "loop", "muted"]:
            if video.has_attr(attr):
                # Convert boolean attributes
                if attr in ["controls", "autoplay", "loop", "muted"]:
                    result[attr] = True
                else:
                    result[attr] = video[attr]
        
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
    
    def _process_audio(self, audio: Tag) -> Dict[str, Any]:
        """
        Process an audio element.
        
        Args:
            audio: The audio element to process.
            
        Returns:
            A dictionary representation of the audio.
        """
        result = {
            "type": "audio",
            "sources": []
        }
        
        # Extract common attributes
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
    
    def _process_svg(self, svg: Tag) -> Dict[str, Any]:
        """
        Process an SVG element.
        
        Args:
            svg: The SVG element to process.
            
        Returns:
            A dictionary representation of the SVG.
        """
        result = {
            "type": "svg"
        }
        
        # Extract viewBox
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
