import os
import json
from pathlib import Path
import subprocess
from typing import List, Dict, Optional
from functools import lru_cache
from openai import OpenAI

# Environment variables for external transcription service
EXTERNAL_TRANSCRIPTION_URL = os.getenv("TRANSCRIPTION_API_URL")
EXTERNAL_TRANSCRIPTION_KEY = os.getenv("TRANSCRIPTION_API_KEY")
EXTERNAL_TRANSCRIPTION_MODEL = os.getenv("TRANSCRIPTION_MODEL", "whisper-1")

# Flag to determine which transcription method to use
USE_EXTERNAL_TRANSCRIPTION = bool(EXTERNAL_TRANSCRIPTION_URL and EXTERNAL_TRANSCRIPTION_KEY)

# Always use external transcription service (local Whisper removed)
if not USE_EXTERNAL_TRANSCRIPTION:
    raise ValueError("External transcription service not configured. Please set TRANSCRIPTION_API_URL and TRANSCRIPTION_API_KEY environment variables.")

print(f"Konfiguracja zewnętrznego serwisu transkrypcji: {EXTERNAL_TRANSCRIPTION_URL}")
print(f"Model transkrypcji: {EXTERNAL_TRANSCRIPTION_MODEL}")

def format_timestamp(seconds: float) -> str:
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

def generate_srt(segments: List[Dict]) -> str:
    srt_content = []
    for i, segment in enumerate(segments, 1):
        # Obsługa obu formatów - 'timestamp' i 'start/end'
        if 'timestamp' in segment:
            start = format_timestamp(segment['timestamp'][0])
            end = format_timestamp(segment['timestamp'][1])
        else:
            start = format_timestamp(segment['start'])
            end = format_timestamp(segment['end'])
        
        text = segment['text'].strip()
        
        srt_content.append(f"{i}")
        srt_content.append(f"{start} --> {end}")
        srt_content.append(text)
        srt_content.append("")
    
    return "\n".join(srt_content)

def extract_audio(video_path: Path, audio_path: Path) -> bool:
    try:
        cmd = [
            'ffmpeg', '-i', str(video_path),
            '-vn', '-acodec', 'pcm_s16le',
            '-ar', '16000', '-ac', '1', '-y',
            str(audio_path)
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        return result.returncode == 0
    except Exception as e:
        print(f"Błąd FFmpeg: {e}")
        return False

def transcribe_audio_with_external_service(audio_path: Path, language: Optional[str] = None) -> Dict:
    """Transcribe audio using OpenAI Python SDK client.

    Uses client.audio.transcriptions.create with response_format='srt' as requested.
    Returns a dict with 'text' and 'srt' fields (segments not provided in SRT mode).
    """
    try:
        print(f"Rozpoczynam transkrypcję (OpenAI SDK): {audio_path}")
        print(f"Język: {language or 'auto-detect'}")
        print(f"Serwis: {EXTERNAL_TRANSCRIPTION_URL}")
        print(f"Model: {EXTERNAL_TRANSCRIPTION_MODEL}")

        client = OpenAI(api_key=EXTERNAL_TRANSCRIPTION_KEY, base_url=EXTERNAL_TRANSCRIPTION_URL)

        with open(audio_path, "rb") as audio_file:
            transcription = client.audio.transcriptions.create(
                model=EXTERNAL_TRANSCRIPTION_MODEL,
                file=audio_file,
                response_format="srt",
                language=language or "pl",
                temperature=0.7,
            )

        # Depending on SDK provider, result may be string or object with .text
        if hasattr(transcription, "text"):
            srt_text = transcription.text
        else:
            srt_text = str(transcription)

        return {
            "text": "",           # not provided in SRT mode
            "segments": [],         # not provided in SRT mode
            "language": language or "pl",
            "srt": srt_text,
        }

    except Exception as e:
        print(f"Błąd transkrypcji zewnętrznym serwisem (SDK): {e}")
        raise

def transcribe_audio(audio_path: Path, language: Optional[str] = None) -> Dict:
    """Main transcription function that uses external service only"""
    return transcribe_audio_with_external_service(audio_path, language)

def detect_language(audio_path: Path) -> str:
    try:
        # Language detection handled by transcription service
        return "auto"
    except Exception as e:
        print(f"Błąd wykrywania języka: {e}")
        return "unknown"