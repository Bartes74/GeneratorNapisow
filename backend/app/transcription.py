import os
import requests
import json
from pathlib import Path
import subprocess
from typing import List, Dict, Optional
from functools import lru_cache

# Environment variables for external transcription service
EXTERNAL_TRANSCRIPTION_URL = os.getenv("TRANSCRIPTION_API_URL")
EXTERNAL_TRANSCRIPTION_KEY = os.getenv("TRANSCRIPTION_API_KEY")
EXTERNAL_TRANSCRIPTION_MODEL = os.getenv("TRANSCRIPTION_MODEL", "whisper-large-v3")

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
    """Transcribe audio using external OpenAI-compatible API service"""
    try:
        print(f"Rozpoczynam transkrypcję zewnętrznym serwisem: {audio_path}")
        print(f"Język: {language or 'auto-detect'}")
        print(f"Serwis: {EXTERNAL_TRANSCRIPTION_URL}")
        print(f"Model: {EXTERNAL_TRANSCRIPTION_MODEL}")
        
        # Prepare headers
        headers = {
            "Authorization": f"Bearer {EXTERNAL_TRANSCRIPTION_KEY}",
            "Content-Type": "multipart/form-data"
        }
        
        # Prepare files and data
        with open(audio_path, 'rb') as audio_file:
            files = {
                'file': (audio_path.name, audio_file, 'audio/wav')
            }
            
            data = {
                'model': EXTERNAL_TRANSCRIPTION_MODEL
            }
            
            if language:
                data['language'] = language
                
            # Make request to external service
            response = requests.post(
                f"{EXTERNAL_TRANSCRIPTION_URL}/audio/transcriptions",
                headers=headers,
                files=files,
                data=data
            )
            
            if response.status_code != 200:
                raise Exception(f"Błąd transkrypcji zewnętrznego serwisu: {response.status_code} - {response.text}")
            
            result = response.json()
            
            # Convert to our expected format
            segments_list = []
            full_text = result.get('text', '')
            
            # Handle segments if provided
            if 'segments' in result:
                for segment in result['segments']:
                    segments_list.append({
                        'text': segment['text'],
                        'start': segment['start'],
                        'end': segment['end'],
                        'timestamp': [segment['start'], segment['end']]
                    })
            else:
                # If no segments, create a single segment
                segments_list.append({
                    'text': full_text,
                    'start': 0.0,
                    'end': 0.0,
                    'timestamp': [0.0, 0.0]
                })
            
            return {
                'text': full_text.strip(),
                'segments': segments_list,
                'language': result.get('language', language or "auto-detected")
            }
            
    except Exception as e:
        print(f"Błąd transkrypcji zewnętrznym serwisem: {e}")
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