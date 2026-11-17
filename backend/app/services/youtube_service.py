import re
import json
import httpx
from typing import Dict, Any, Optional, Tuple, List
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound, VideoUnavailable
from app.services.ai_service import ai_service
from app.utils.responses import SmartLensException, AI_DISCLAIMER

YOUTUBE_REGEX = re.compile(
    r'(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})'
)

def extract_video_id(url: str) -> Optional[str]:
    match = YOUTUBE_REGEX.search(url.strip())
    if match:
        return match.group(1)
    return None

async def fetch_video_metadata(video_id: str) -> Dict[str, Any]:
    oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(oembed_url)
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "title": data.get("title", f"YouTube Video ({video_id})"),
                    "author_name": data.get("author_name", "Unknown Channel"),
                    "thumbnail_url": data.get("thumbnail_url", f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"),
                }
    except Exception:
        pass
    
    return {
        "title": f"YouTube Video ({video_id})",
        "author_name": "Unknown Channel",
        "thumbnail_url": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
    }

def format_timestamp(seconds: float) -> str:
    s = int(seconds)
    hours = s // 3600
    minutes = (s % 3600) // 60
    secs = s % 60
    if hours > 0:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"

def fetch_transcript(video_id: str) -> Tuple[str, List[Dict[str, Any]]]:
    try:
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
        formatted_segments = []
        raw_text_parts = []
        
        for item in transcript_list:
            text = item.get("text", "").replace("\n", " ").strip()
            start = item.get("start", 0.0)
            if text:
                ts_str = format_timestamp(start)
                formatted_segments.append({"timestamp": ts_str, "seconds": start, "text": text})
                raw_text_parts.append(f"[{ts_str}] {text}")

        combined_text = "\n".join(raw_text_parts)
        if not combined_text.strip():
            raise SmartLensException(
                400,
                "No spoken text could be extracted from this video's transcript."
            )
        return combined_text, formatted_segments

    except (TranscriptsDisabled, NoTranscriptFound):
        raise SmartLensException(
            400,
            "Transcripts or closed captions are disabled or unavailable for this video. Cannot process video without a transcript."
        )
    except VideoUnavailable:
        raise SmartLensException(
            400,
            "This video is unavailable, private, deleted, or region-restricted."
        )
    except SmartLensException:
        raise
    except Exception as e:
        raise SmartLensException(
            400,
            f"Unable to retrieve captions for this video. Ensure the video is public and has captions available."
        )

async def summarize_youtube_video(url: str) -> Dict[str, Any]:
    video_id = extract_video_id(url)
    if not video_id:
        raise SmartLensException(
            400,
            "Invalid YouTube URL. Please enter a valid YouTube link (e.g., https://www.youtube.com/watch?v=... or https://youtu.be/...)."
        )

    metadata = await fetch_video_metadata(video_id)
    transcript_text, segments = fetch_transcript(video_id)

    # If transcript is very long, sample or summarize segments
    text_sample = transcript_text[:18000]

    prompt = f"""
You are an expert video content analyst. Analyze the following timestamped video transcript and return ONLY pure JSON (no markdown formatting).

Video Title: {metadata['title']}
Channel: {metadata['author_name']}

Transcript:
{text_sample}

Output format required (pure JSON):
{{
  "summary": "Comprehensive 2-4 paragraph overview of the video's core content...",
  "key_points_with_timestamps": [
    {{"timestamp": "01:23", "point": "Description of concept discussed..."}},
    {{"timestamp": "04:50", "point": "Another key topic covered..."}}
  ],
  "takeaways": [
    "Practical actionable takeaway 1",
    "Practical actionable takeaway 2",
    "Practical actionable takeaway 3"
  ]
}}
"""
    raw_response = await ai_service.generate(prompt, temperature=0.3)
    
    cleaned = raw_response.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    try:
        parsed = json.loads(cleaned)
    except Exception:
        parsed = {
            "summary": raw_response.strip(),
            "key_points_with_timestamps": [],
            "takeaways": []
        }

    return {
        "video_id": video_id,
        "title": metadata["title"],
        "channel": metadata["author_name"],
        "thumbnail": metadata["thumbnail_url"],
        "summary": parsed.get("summary", ""),
        "key_points_with_timestamps": parsed.get("key_points_with_timestamps", []),
        "takeaways": parsed.get("takeaways", []),
        "word_count": len(transcript_text.split()),
        "ai_disclaimer": AI_DISCLAIMER
    }
