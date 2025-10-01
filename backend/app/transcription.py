import os
import json
from pathlib import Path
import subprocess
from typing import List, Dict, Optional
from functools import lru_cache
from openai import OpenAI
import re

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
        # Use MP3 format to reduce file size (OpenAI API limit: 25MB)
        # Convert .wav extension to .mp3 for proper format
        audio_path_mp3 = audio_path.with_suffix('.mp3')

        cmd = [
            'ffmpeg', '-i', str(video_path),
            '-vn',  # no video
            '-acodec', 'libmp3lame',  # MP3 codec
            '-ar', '16000',  # 16kHz sample rate (good for speech)
            '-ac', '1',  # mono
            '-b:a', '32k',  # 32kbps bitrate (sufficient for speech)
            '-y',  # overwrite
            str(audio_path_mp3)
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)

        # Rename to original path if user expects .wav extension
        if result.returncode == 0 and audio_path_mp3.exists():
            if audio_path != audio_path_mp3:
                audio_path_mp3.rename(audio_path.with_suffix('.mp3'))

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

        # Depending on SDK/provider, result may be str, object with .text, or JSON string
        srt_text = None
        if isinstance(transcription, str):
            srt_text = transcription
        elif hasattr(transcription, "text"):
            srt_text = transcription.text
        else:
            raw = str(transcription)
            # Try parse JSON carrying {"text": "...srt..."}
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, dict) and "text" in parsed:
                    srt_text = parsed["text"]
                else:
                    srt_text = raw
            except Exception:
                srt_text = raw

        srt_text = normalize_srt_text(srt_text)

        return {
            "text": "",           # not provided in SRT mode
            "segments": [],         # not provided in SRT mode
            "language": language or "pl",
            "srt": srt_text,
        }

    except Exception as e:
        print(f"Błąd transkrypcji zewnętrznym serwisem (SDK): {e}")
        raise

def normalize_srt_text(srt_text: str, max_line_length: int = 38) -> str:
    """
    Ensure SRT plain-text format:
      - If input looks like JSON with {"text": "..."}, extract text
      - Reflow each cue's text to at most 2 lines, wrapping at word boundaries
    """
    # If accidental JSON string passed in
    try:
        maybe = json.loads(srt_text)
        if isinstance(maybe, dict) and "text" in maybe:
            srt_text = maybe["text"]
    except Exception:
        pass

    blocks = re.split(r"\r?\n\r?\n", srt_text.strip())
    out_blocks = []
    for block in blocks:
        lines = block.splitlines()
        if not lines:
            continue
        # Expect first line index, second line timestamp
        idx_line = lines[0].strip()
        ts_line = lines[1].strip() if len(lines) > 1 else ""
        text_lines = lines[2:] if len(lines) > 2 else []
        text = " ".join(l.strip() for l in text_lines if l.strip())

        if not text:
            out_blocks.append("\n".join([idx_line, ts_line]).strip())
            continue

        # Wrap into chunks: each chunk up to 2 lines x max_line_length
        words = text.split()
        chunks = []
        cur_lines = [[], []]
        cur_line_idx = 0
        for w in words:
            candidate = (" ".join(cur_lines[cur_line_idx] + [w])).strip()
            if len(candidate) <= max_line_length or not cur_lines[cur_line_idx]:
                cur_lines[cur_line_idx].append(w)
            else:
                if cur_line_idx == 0:
                    cur_line_idx = 1
                    cur_lines[cur_line_idx] = [w]
                else:
                    # finalize chunk
                    chunks.append([" ".join(cur_lines[0]).strip(), " ".join(cur_lines[1]).strip()])
                    cur_lines = [[w], []]
                    cur_line_idx = 0
        # flush last
        if cur_lines[0] or cur_lines[1]:
            line1 = " ".join(cur_lines[0]).strip()
            line2 = " ".join(cur_lines[1]).strip()
            chunks.append([line1, line2] if line2 else [line1])

        # Distribute original cue duration proportionally across chunks
        # Parse timestamps
        m = re.match(r"(\d{2}:\d{2}:\d{2},\d{3})\s*--\>\s*(\d{2}:\d{2}:\d{2},\d{3})", ts_line)
        if not m or len(chunks) == 1:
            # No split or cannot parse – keep as one
            wrapped = "\n".join(chunks[0])
            out_blocks.append("\n".join([idx_line, ts_line, wrapped]).strip())
        else:
            def to_ms(ts: str) -> int:
                hh, mm, ss_ms = ts.split(":")
                ss, ms = ss_ms.split(",")
                return (int(hh)*3600 + int(mm)*60 + int(ss))*1000 + int(ms)
            def from_ms(ms: int) -> str:
                hh = ms // 3600000; ms%=3600000
                mm = ms // 60000; ms%=60000
                ss = ms // 1000; ms%=1000
                return f"{hh:02d}:{mm:02d}:{ss:02d},{ms:03d}"

            start_ms = to_ms(m.group(1))
            end_ms = to_ms(m.group(2))
            total_ms = max(1, end_ms - start_ms)

            # weight by characters in each chunk
            lengths = [sum(len(l) for l in c) for c in chunks]
            total_len = max(1, sum(lengths))

            cur_start = start_ms
            part_idx = 0
            next_idx = len(out_blocks) + 1
            for c, clen in zip(chunks, lengths):
                part_idx += 1
                share = int(total_ms * (clen / total_len))
                # Ensure last chunk ends exactly at end_ms
                part_end = end_ms if part_idx == len(chunks) else cur_start + max(200, share)
                new_ts = f"{from_ms(cur_start)} --> {from_ms(part_end)}"
                new_lines = ["\n".join(c).strip()]
                out_blocks.append("\n".join([str(next_idx), new_ts] + new_lines).strip())
                next_idx += 1
                cur_start = part_end

    return "\n\n".join(out_blocks) + "\n"

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