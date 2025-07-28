from faster_whisper import WhisperModel
from pathlib import Path
import subprocess
from typing import List, Dict, Optional

print("Ładowanie modelu Whisper (faster-whisper)...")
model_size = "large-v3"
device = "cpu"
compute_type = "int8"

transcriber = WhisperModel(model_size, device=device, compute_type=compute_type)
print("Model faster-whisper gotowy!")

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

def transcribe_audio(audio_path: Path, language: Optional[str] = None) -> Dict:
    try:
        print(f"Rozpoczynam transkrypcję pliku: {audio_path}")
        print(f"Język: {language or 'auto-detect'}")
        
        segments, info = transcriber.transcribe(
            str(audio_path), 
            language=language or None, 
            beam_size=5,
            word_timestamps=False
        )

        segments_list = []
        full_text = ""

        for segment in segments:
            # Dodajemy oba formaty dla kompatybilności
            segments_list.append({
                'text': segment.text,
                'start': segment.start,
                'end': segment.end,
                'timestamp': [segment.start, segment.end]  # dla kompatybilności z frontendem
            })
            full_text += segment.text + " "

        print(f"Transkrypcja zakończona. Liczba segmentów: {len(segments_list)}")

        return {
            'text': full_text.strip(),
            'segments': segments_list,
            'language': info.language if info else "auto-detected"
        }
    except Exception as e:
        print(f"Błąd transkrypcji: {e}")
        raise

def detect_language(audio_path: Path) -> str:
    try:
        # Faster-whisper automatycznie wykrywa język podczas transkrypcji
        return "auto"
    except Exception as e:
        print(f"Błąd wykrywania języka: {e}")
        return "unknown"