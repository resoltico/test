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
        
        # Process figures first (they may contain other media elements)
        self._process_figures(soup, document)
        
        # Process standalone images (not inside figures)
        self._process_standalone_images(soup, document)
        
        # Process audio and video elements
        self._process_audio_video(soup, document)
        
        return document
    
    def _process_standalone_images(self, soup: BeautifulSoup, document: Document) -> None:
        """
        Process standalone images (not inside figures).
        
        Args:
            soup: The BeautifulSoup object.
            document: The Document object.
        """
        # Find all images not inside figures
        standalone_images = [
            img for img in soup.find_all("img") 
            if not img.find_parent("figure") and not self._is_nested_media(img)
        ]
        
        if not standalone_images:
            logger.debug("No standalone images found")
            return
        
        logger.debug("Found standalone images", count=len(standalone_images))
        
        for img in standalone_images:
            # Find parent section for this image
            parent_section = self.find_parent_section(document, img)
            
            if parent_section:
                # Process the image and add to the parent section
                image_dict = self._process_image(img)
                if image_dict:
                    parent_section.add_content(image_dict)
                    
                    logger.debug(
                        "Added image to section", 
                        section=parent_section.title, 
                        image_src=img.get("src", "")[-30:]
                    )
    
    def _process_figures(self, soup: BeautifulSoup, document: Document) -> None:
        """
        Process figure elements.
        
        Args:
            soup: The BeautifulSoup object.
            document: The Document object.
        """
        figures = soup.find_all("figure")
        
        if not figures:
            logger.debug("No figures found")
            return
        
        logger.debug("Found figures", count=len(figures))
        
        for figure in figures:
            # Skip nested figures
            if figure.find_parent("figure"):
                continue
                
            # Find parent section for this figure
            parent_section = self.find_parent_section(document, figure)
            
            if parent_section:
                # Process the figure and add to the parent section
                figure_dict = self._process_figure(figure)
                parent_section.add_content(figure_dict)
                
                logger.debug(
                    "Added figure to section", 
                    section=parent_section.title, 
                    figure_id=figure.get("id", "")
                )
    
    def _process_audio_video(self, soup: BeautifulSoup, document: Document) -> None:
        """
        Process audio and video elements.
        
        Args:
            soup: The BeautifulSoup object.
            document: The Document object.
        """
        media_elements = [
            media for media in soup.find_all(["audio", "video"]) 
            if not media.find_parent("figure") and not self._is_nested_media(media)
        ]
        
        if not media_elements:
            logger.debug("No standalone audio/video elements found")
            return
        
        logger.debug("Found audio/video elements", count=len(media_elements))
        
        for media in media_elements:
            # Find parent section for this media element
            parent_section = self.find_parent_section(document, media)
            
            if parent_section:
                # Process the media element based on its type
                if media.name == "audio":
                    media_dict = self._process_audio(media)
                else:  # video
                    media_dict = self._process_video(media)
                
                if media_dict:
                    parent_section.add_content(media_dict)
                    
                    logger.debug(
                        "Added media to section", 
                        section=parent_section.title, 
                        media_type=media.name
                    )
    
    def _is_nested_media(self, element: Tag) -> bool:
        """
        Check if a media element is nested inside another media container.
        
        Args:
            element: The media element to check.
            
        Returns:
            True if the element is nested inside another media container, False otherwise.
        """
        # Check if inside audio, video, picture, or object elements
        media_containers = ["audio", "video", "picture", "object"]
        
        parent = element.parent
        while parent:
            if parent.name in media_containers:
                return True
            parent = parent.parent
            
        return False
    
    def _process_image(self, img: Tag) -> Optional[Dict[str, Any]]:
        """
        Process an image element.
        
        Args:
            img: The image element to process.
            
        Returns:
            A dictionary representation of the image, or None if it's not valid.
        """
        if not img.get("src"):
            logger.warning("Image without src attribute", element=str(img)[:100])
            return None
        
        result = {
            "type": "image",
            "src": img["src"]
        }
        
        # Extract common attributes
        for attr in ["alt", "title", "width", "height", "id"]:
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
        
        # If no media content was found, extract text content
        if not result["content"]:
            text_content = figure.get_text().strip()
            
            # Remove figcaption text from content
            if figcaption:
                caption_text = figcaption.get_text().strip()
                if caption_text in text_content:
                    text_content = text_content.replace(caption_text, "").strip()
            
            if text_content:
                result["content"].append({"type": "text", "text": text_content})
        
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
        for attr in ["id", "width", "height", "poster", "controls", "autoplay", "loop", "muted", "preload"]:
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
                    
                if source.has_attr("media"):
                    source_dict["media"] = source["media"]
                    
                sources.append(source_dict)
        
        # Handle direct src attribute on video element
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
                    
                if track.has_attr("default"):
                    track_dict["default"] = True
                    
                tracks.append(track_dict)
        
        if tracks:
            result["tracks"] = tracks
        
        # Include fallback content
        fallback = video.get_text().strip()
        if fallback:
            result["fallback"] = fallback
        
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
        for attr in ["id", "controls", "autoplay", "loop", "muted", "preload"]:
            if audio.has_attr(attr):
                # Convert boolean attributes
                if attr in ["controls", "autoplay", "loop", "muted"]:
                    result[attr] = True
                else:
                    result[attr] = audio[attr]
        
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
        
        # Handle direct src attribute on audio element
        if not sources and audio.has_attr("src"):
            sources.append({"src": audio["src"]})
        
        if sources:
            result["sources"] = sources
        
        # Include fallback content
        fallback = audio.get_text().strip()
        if fallback:
            result["fallback"] = fallback
        
        return result
    
    def _process_svg(self, svg: Tag) -> Dict[str, Any]:
        """
        Process an SVG element.
        
        Args:
            svg: The SVG element to process.
            
        Returns:
            A dictionary representation of the SVG.
        """
        # For SVG, we'll just extract key attributes and dimensions
        result = {
            "type": "svg",
        }
        
        # Extract viewBox
        if svg.has_attr("viewBox"):
            result["viewBox"] = svg["viewBox"]
        
        # Extract dimensions
        for attr in ["width", "height"]:
            if svg.has_attr(attr):
                result[attr] = svg[attr]
        
        # Extract SVG ID
        if svg.has_attr("id"):
            result["id"] = svg["id"]
        
        # Count some key elements
        element_counts = {}
        for element_type in ["rect", "circle", "path", "line", "text", "g"]:
            count = len(svg.find_all(element_type))
            if count > 0:
                element_counts[element_type] = count
        
        if element_counts:
            result["elements"] = element_counts
        
        return result
