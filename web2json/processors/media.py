"""
Processor for media elements (images, videos, audio).
"""

from typing import Dict, List, Optional, TypeAlias, cast
from urllib.parse import urljoin

import structlog
from bs4 import BeautifulSoup, Tag

from web2json.models.document import Document
from web2json.models.section import Section
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
        
        # Process images
        self._process_images(soup, document)
        
        # Process figures (which may contain images, videos, etc.)
        self._process_figures(soup, document)
        
        # Process audio and video elements
        self._process_audio_video(soup, document)
        
        return document
    
    def _process_images(self, soup: BeautifulSoup, document: Document) -> None:
        """
        Process image elements in the document.
        
        Args:
            soup: The BeautifulSoup object.
            document: The Document object.
        """
        # Find all images not inside figures (those will be processed separately)
        standalone_images = [
            img for img in soup.find_all("img") 
            if not img.find_parent("figure")
        ]
        
        if not standalone_images:
            logger.debug("No standalone images found")
            return
        
        logger.debug("Found standalone images", count=len(standalone_images))
        
        for img in standalone_images:
            image_dict = self._process_image(img)
            
            # Find the appropriate section to add this image to
            section = self._find_parent_section(document, img)
            
            if section and image_dict:
                # Add the image to the section's content
                section.add_content(image_dict)
                logger.debug(
                    "Added image to section", 
                    section=section.title, 
                    image_src=img.get("src", "")[-30:]
                )
    
    def _process_figures(self, soup: BeautifulSoup, document: Document) -> None:
        """
        Process figure elements in the document.
        
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
            figure_dict = self._process_figure(figure)
            
            # Find the appropriate section to add this figure to
            section = self._find_parent_section(document, figure)
            
            if section and figure_dict:
                # Add the figure to the section's content
                section.add_content(figure_dict)
                logger.debug(
                    "Added figure to section", 
                    section=section.title, 
                    figure_id=figure.get("id", "")
                )
    
    def _process_audio_video(self, soup: BeautifulSoup, document: Document) -> None:
        """
        Process audio and video elements in the document.
        
        Args:
            soup: The BeautifulSoup object.
            document: The Document object.
        """
        media_elements = soup.find_all(["audio", "video"])
        
        if not media_elements:
            logger.debug("No audio/video elements found")
            return
        
        logger.debug("Found audio/video elements", count=len(media_elements))
        
        for media in media_elements:
            # Process based on type
            if media.name == "audio":
                media_dict = self._process_audio(media)
            else:  # video
                media_dict = self._process_video(media)
            
            # Find the appropriate section to add this media to
            section = self._find_parent_section(document, media)
            
            if section and media_dict:
                # Add the media to the section's content
                section.add_content(media_dict)
                logger.debug(
                    "Added media to section", 
                    section=section.title, 
                    media_type=media.name, 
                    media_id=media.get("id", "")
                )
    
    def _process_image(self, img: Tag) -> Optional[Dict]:
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
        for attr in ["alt", "title", "width", "height", "id", "loading"]:
            if img.has_attr(attr):
                result[attr] = img[attr]
        
        # Handle srcset for responsive images
        if img.has_attr("srcset"):
            result["srcset"] = img["srcset"]
        
        # Handle sizes attribute
        if img.has_attr("sizes"):
            result["sizes"] = img["sizes"]
        
        return result
    
    def _process_figure(self, figure: Tag) -> Dict:
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
        for img in figure.find_all("img"):
            image_dict = self._process_image(img)
            if image_dict:
                result["content"].append(image_dict)
        
        # Process contained videos
        for video in figure.find_all("video"):
            video_dict = self._process_video(video)
            if video_dict:
                result["content"].append(video_dict)
        
        # Process contained audio
        for audio in figure.find_all("audio"):
            audio_dict = self._process_audio(audio)
            if audio_dict:
                result["content"].append(audio_dict)
        
        # Process other content if no media found
        if not result["content"]:
            # Extract text content
            text_content = figure.get_text().strip()
            if text_content and figcaption:
                # Remove the figcaption text from the content
                text_content = text_content.replace(figcaption.get_text().strip(), "").strip()
            
            if text_content:
                result["content"].append({"type": "text", "text": text_content})
        
        return result
    
    def _process_video(self, video: Tag) -> Dict:
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
            source_dict = {
                "src": source["src"]
            }
            
            if source.has_attr("type"):
                source_dict["type"] = source["type"]
                
            if source.has_attr("media"):
                source_dict["media"] = source["media"]
                
            sources.append(source_dict)
        
        if sources:
            result["sources"] = sources
        elif video.has_attr("src"):
            # Single source without source elements
            result["sources"] = [{"src": video["src"]}]
        
        # Extract tracks (captions, subtitles, etc.)
        tracks = []
        for track in video.find_all("track"):
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
        
        # Fallback content (displayed if video can't be played)
        fallback = video.get_text().strip()
        if fallback:
            result["fallback"] = fallback
        
        return result
    
    def _process_audio(self, audio: Tag) -> Dict:
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
            source_dict = {
                "src": source["src"]
            }
            
            if source.has_attr("type"):
                source_dict["type"] = source["type"]
                
            if source.has_attr("media"):
                source_dict["media"] = source["media"]
                
            sources.append(source_dict)
        
        if sources:
            result["sources"] = sources
        elif audio.has_attr("src"):
            # Single source without source elements
            result["sources"] = [{"src": audio["src"]}]
        
        # Fallback content (displayed if audio can't be played)
        fallback = audio.get_text().strip()
        if fallback:
            result["fallback"] = fallback
        
        return result
    
    def _find_parent_section(self, document: Document, element: Tag) -> Optional[Section]:
        """
        Find the appropriate parent section for an element.
        
        This uses a heuristic approach to determine which section the element
        belongs to based on its position in the document.
        
        Args:
            document: The Document object.
            element: The HTML element to find a parent for.
            
        Returns:
            The parent Section object, or None if no suitable parent was found.
        """
        # This is a simplified implementation that needs to be improved
        # in a real application to accurately place elements in the right sections
        
        # Get all headings that precede this element
        preceding_headings = []
        current = element.previous_element
        while current:
            if current.name and current.name in ["h1", "h2", "h3", "h4", "h5", "h6"]:
                preceding_headings.append((current.name, current.get_text().strip()))
            current = current.previous_element
        
        # Reverse the list to get them in document order
        preceding_headings.reverse()
        
        if not preceding_headings:
            # If no headings found, use the first top-level section
            for item in document.content:
                if isinstance(item, Section):
                    return item
            return None
        
        # Find the matching section based on the nearest heading
        last_heading = preceding_headings[-1]
        return self._find_section_by_title(document.content, last_heading[1])
    
    def _find_section_by_title(
        self, content: List, title: str
    ) -> Optional[Section]:
        """
        Find a section by its title.
        
        Args:
            content: The content list to search in.
            title: The title to match.
            
        Returns:
            The matching Section object, or None if not found.
        """
        for item in content:
            if isinstance(item, Section):
                if item.title == title:
                    return item
                
                # Recursively search in children
                result = self._find_section_by_title(item.children, title)
                if result:
                    return result
        
        # If no exact match found, return the first section as a fallback
        for item in content:
            if isinstance(item, Section):
                return item
        
        return None
