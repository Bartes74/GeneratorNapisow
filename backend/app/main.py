from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from typing import Optional, Dict, Any
import os
import shutil
from pathlib import Path
import uuid
from datetime import datetime
import asyncio
from concurrent.futures import ThreadPoolExecutor
import json
import re
import subprocess
import logging
from app.transcription import transcribe_audio, extract_audio, generate_srt, detect_language

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Inicjalizacja FastAPI
app = FastAPI(title="Subtitle Generator API")

# CORS dla frontendu - updated for production
frontend_origins = [origin.strip() for origin in os.getenv("FRONTEND_ORIGINS", "http://localhost:5173,http://localhost").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ścieżki folderów
BASE_DIR = Path(__file__).parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
AUDIO_DIR = UPLOAD_DIR / "audio"  # Nowy folder na wyodrębnione audio
TEMP_DIR = BASE_DIR / "temp"
OUTPUT_DIR = BASE_DIR / "output"

# Tworzenie folderów jeśli nie istnieją
for dir in [UPLOAD_DIR, AUDIO_DIR, TEMP_DIR, OUTPUT_DIR]:
    dir.mkdir(exist_ok=True)

# Mount uploads directory
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Dozwolone formaty wideo
ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi"}
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB

# Executor dla operacji blokujących - ograniczony do 4 workerów
executor = ThreadPoolExecutor(max_workers=4)

@app.get("/")
async def root():
    return {
        "message": "Subtitle Generator API",
        "version": "1.1.0",
        "description": "Optimized version with pre-extracted audio for faster transcription",
        "endpoints": {
            "upload_video": "POST /api/upload (now extracts audio immediately)",
            "transcribe": "POST /api/transcribe/{video_id} (uses pre-extracted audio)",
            "download_srt": "GET /api/download/srt/{video_id}",
            "upload_srt": "POST /api/upload-srt/{video_id}",
            "render_preview": "POST /api/render-preview/{video_id}",
            "render_final": "POST /api/render-final/{video_id}",
            "cleanup": "DELETE /api/cleanup/{video_id} (removes all files)",
            "health": "GET /api/health"
        }
    }

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "api": "running",
            "whisper": "not used - external service only",
            "ffmpeg": "ready"
        }
    }

@app.post("/api/upload")
async def upload_video(file: UploadFile = File(...)):
    # Walidacja rozszerzenia
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Format {file_ext} nie jest obsługiwany")

    # Generowanie unikalnego ID dla pliku
    video_id = str(uuid.uuid4())
    file_path = UPLOAD_DIR / f"{video_id}{file_ext}"
    audio_path = AUDIO_DIR / f"{video_id}.mp3"  # Changed to MP3 for smaller file size

    # Zapis pliku z walidacją rozmiaru podczas zapisu
    try:
        bytes_written = 0
        with open(file_path, "wb") as buffer:
            while chunk := file.file.read(8192):  # Read in 8KB chunks
                bytes_written += len(chunk)
                if bytes_written > MAX_FILE_SIZE:
                    # Usuń plik natychmiast jeśli przekroczono limit
                    buffer.close()
                    os.remove(file_path)
                    raise HTTPException(400, f"Plik za duży. Max: {MAX_FILE_SIZE/1024/1024}MB")
                buffer.write(chunk)
        file_size = bytes_written
    except HTTPException:
        raise
    except Exception as e:
        if file_path.exists():
            os.remove(file_path)
        raise HTTPException(500, f"Błąd zapisu pliku: {str(e)}")

    # NOWE: Wyodrębnij audio natychmiast po upload
    try:
        success, error_msg = await asyncio.get_event_loop().run_in_executor(
            executor, extract_audio, file_path, audio_path
        )
        if not success:
            # Jeśli wyodrębnianie audio się nie powiedzie, usuń video i zwróć błąd
            if file_path.exists():
                os.remove(file_path)
            raise HTTPException(500, f"Błąd wyodrębniania audio z wideo: {error_msg}")
    except HTTPException:
        raise
    except Exception as e:
        # Jeśli wyodrębnianie audio się nie powiedzie, usuń video i zwróć błąd
        if file_path.exists():
            os.remove(file_path)
        raise HTTPException(500, f"Błąd wyodrębniania audio: {str(e)}")

    return {
        "video_id": video_id,
        "filename": file.filename,
        "size_mb": round(file_size / 1024 / 1024, 2),
        "format": file_ext,
        "audio_extracted": True  # Informacja że audio jest już gotowe
    }

@app.post("/api/transcribe/{video_id}")
async def transcribe_video(
    video_id: str,
    language: Optional[str] = None
):
    # Sprawdź czy istnieje plik wideo (dla walidacji)
    if not find_video_file(video_id):
        raise HTTPException(404, "Nie znaleziono pliku wideo")

    # NOWE: Użyj pre-wyodrębnionego audio
    audio_path = AUDIO_DIR / f"{video_id}.mp3"  # Changed to MP3 format
    srt_path = OUTPUT_DIR / f"{video_id}.srt"

    # Sprawdź czy audio istnieje
    if not audio_path.exists():
        raise HTTPException(404, "Nie znaleziono wyodrębnionego pliku audio. Spróbuj ponownie przesłać wideo.")

    try:
        # Transkrybuj używając pre-wyodrębnionego audio
        result = await asyncio.get_event_loop().run_in_executor(
            executor, transcribe_audio, audio_path, language
        )

        # Generuj SRT (obsługa zarówno verbose_json -> segments, jak i trybu SRT)
        srt_content = result.get('srt') if isinstance(result, dict) else None
        if not srt_content:
            srt_content = generate_srt(result['segments'])

        # Zapisz SRT
        with open(srt_path, 'w', encoding='utf-8') as f:
            f.write(srt_content)

        # UWAGA: Nie usuwamy audio - może być potrzebne do ponownej transkrypcji
        # Audio zostanie usunięte wraz z video podczas czyszczenia

        return {
            "video_id": video_id,
            "transcription": result['text'],
            "segments": result['segments'],
            "language": result['language'],
            "srt_file": f"{video_id}.srt"
        }

    except Exception as e:
        raise HTTPException(500, f"Błąd transkrypcji: {str(e)}")

@app.get("/api/download/srt/{video_id}")
async def download_srt(video_id: str):
    srt_path = OUTPUT_DIR / f"{video_id}.srt"
    if not srt_path.exists():
        raise HTTPException(404, "Plik SRT nie istnieje")
    return FileResponse(
        srt_path,
        media_type="text/plain",
        filename=f"subtitles_{video_id}.srt"
    )

@app.post("/api/upload-srt/{video_id}")
async def upload_edited_srt(
    video_id: str,
    file: UploadFile = File(...)
):
    if not file.filename.endswith('.srt'):
        raise HTTPException(400, "Tylko pliki .srt są akceptowane")

    srt_path = OUTPUT_DIR / f"{video_id}.srt"

    try:
        content = await file.read()
        # Walidacja podstawowa formatu SRT
        text = content.decode('utf-8')
        if not re.search(r'\d+\s*\n\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}', text):
            raise HTTPException(400, "Nieprawidłowy format pliku SRT")

        with open(srt_path, 'wb') as f:
            f.write(content)

        return {
            "message": "Plik SRT zaktualizowany",
            "video_id": video_id
        }

    except Exception as e:
        raise HTTPException(500, f"Błąd zapisu pliku: {str(e)}")

@app.post("/api/render-preview/{video_id}")
async def render_preview(
    video_id: str,
    request_data: Dict[str, Any] = Body(...)
):
    """Generuje 10-sekundową próbkę"""
    try:
        logger.info(f"=== RENDER PREVIEW REQUEST ===")
        logger.info(f"Video ID: {video_id}")
        logger.info(f"Raw request data: {request_data}")

        # Wyciągnij style z request_data
        subtitle_styles = request_data.get('subtitle_styles', {})
        logger.info(f"Extracted subtitle styles: {subtitle_styles}")

        # Znajdź pliki
        video_path = find_video_file(video_id)
        if not video_path:
            raise HTTPException(404, "Nie znaleziono pliku wideo")
        srt_path = OUTPUT_DIR / f"{video_id}.srt"
        preview_path = TEMP_DIR / f"{video_id}_preview.mp4"
        
        if not srt_path.exists():
            raise HTTPException(404, "Plik SRT nie istnieje")
        
        # Generuj 10-sekundową próbkę
        await asyncio.get_event_loop().run_in_executor(
            executor,
            render_video_segment,
            video_path,
            srt_path,
            preview_path,
            subtitle_styles,
            10  # 10 sekund
        )
        
        return FileResponse(
            preview_path,
            media_type="video/mp4",
            filename=f"preview_{video_id}.mp4"
        )
        
    except Exception as e:
        logger.error(f"Błąd generowania podglądu: {e}")
        raise HTTPException(500, f"Błąd generowania podglądu: {str(e)}")

@app.post("/api/render-final/{video_id}")
async def render_final_video(
    video_id: str,
    request_data: Dict[str, Any] = Body(...)
):
    """Renderuje pełny film z napisami"""
    try:
        logger.info(f"=== RENDER FINAL REQUEST ===")
        logger.info(f"Video ID: {video_id}")
        logger.info(f"Raw request data: {request_data}")

        # Wyciągnij style z request_data
        subtitle_styles = request_data.get('subtitle_styles', {})
        logger.info(f"Extracted subtitle styles: {subtitle_styles}")

        # Znajdź pliki
        video_path = find_video_file(video_id)
        if not video_path:
            raise HTTPException(404, "Nie znaleziono pliku wideo")
        srt_path = OUTPUT_DIR / f"{video_id}.srt"
        output_path = OUTPUT_DIR / f"{video_id}_subtitled.mp4"
        
        if not srt_path.exists():
            raise HTTPException(404, "Plik SRT nie istnieje")
        
        # Renderuj pełne wideo z napisami
        await asyncio.get_event_loop().run_in_executor(
            executor,
            render_full_video,
            video_path,
            srt_path,
            output_path,
            subtitle_styles
        )
        
        return {
            "video_id": video_id,
            "output_file": f"{video_id}_subtitled.mp4",
            "download_url": f"/api/download/video/{video_id}",
            "message": "Film został wygenerowany pomyślnie"
        }
        
    except Exception as e:
        logger.error(f"Błąd renderowania: {e}")
        raise HTTPException(500, f"Błąd renderowania: {str(e)}")

@app.get("/api/download/video/{video_id}")
async def download_final_video(video_id: str):
    video_path = OUTPUT_DIR / f"{video_id}_subtitled.mp4"
    if not video_path.exists():
        raise HTTPException(404, "Wideo nie istnieje")
    return FileResponse(
        video_path,
        media_type="video/mp4",
        filename=f"video_with_subtitles_{video_id}.mp4"
    )

@app.delete("/api/cleanup/{video_id}")
async def cleanup_video_files(video_id: str):
    """Usuwa wszystkie pliki związane z danym video_id"""
    try:
        deleted_files = []
        
        # Usuń plik wideo
        video_files = list(UPLOAD_DIR.glob(f"{video_id}.*"))
        for video_file in video_files:
            if video_file.is_file():
                video_file.unlink()
                deleted_files.append(f"video: {video_file.name}")
        
        # Usuń plik audio (both .wav and .mp3 for backward compatibility)
        for ext in ['.mp3', '.wav']:
            audio_file = AUDIO_DIR / f"{video_id}{ext}"
            if audio_file.exists():
                audio_file.unlink()
                deleted_files.append(f"audio: {audio_file.name}")
        
        # Usuń plik SRT
        srt_file = OUTPUT_DIR / f"{video_id}.srt"
        if srt_file.exists():
            srt_file.unlink()
            deleted_files.append(f"srt: {srt_file.name}")
        
        # Usuń wyrenderowane wideo
        rendered_file = OUTPUT_DIR / f"{video_id}_subtitled.mp4"
        if rendered_file.exists():
            rendered_file.unlink()
            deleted_files.append(f"rendered: {rendered_file.name}")
        
        # Usuń plik podglądu
        preview_file = TEMP_DIR / f"{video_id}_preview.mp4"
        if preview_file.exists():
            preview_file.unlink()
            deleted_files.append(f"preview: {preview_file.name}")
        
        return {
            "message": f"Usunięto {len(deleted_files)} plików",
            "deleted_files": deleted_files,
            "video_id": video_id
        }
        
    except Exception as e:
        raise HTTPException(500, f"Błąd czyszczenia plików: {str(e)}")

# Funkcje pomocnicze
def find_video_file(video_id: str) -> Optional[Path]:
    """Znajduje plik wideo po video_id"""
    video_files = list(UPLOAD_DIR.glob(f"{video_id}.*"))
    return video_files[0] if video_files else None

def hex_to_ass_color(hex_color: str) -> str:
    """Konwertuje kolor hex na format ASS (BGR)"""
    if not hex_color.startswith('#'):
        hex_color = '#' + hex_color
    if len(hex_color) != 7:
        return "&H00FFFFFF&"  # default white

    hex_clean = hex_color[1:]  # usuń #
    try:
        r = int(hex_clean[0:2], 16)
        g = int(hex_clean[2:4], 16)
        b = int(hex_clean[4:6], 16)
        # ASS używa formatu &HBBGGRR&
        return f"&H00{b:02X}{g:02X}{r:02X}&"
    except ValueError:
        return "&H00FFFFFF&"  # default white

def render_video_with_subtitles(
    video_path: Path,
    srt_path: Path,
    output_path: Path,
    styles: dict,
    duration: Optional[int] = None,
    preset: str = 'medium',
    crf: int = 20
):
    """Renderuje wideo z napisami - wspólna funkcja dla próbki i pełnego filmu

    Args:
        video_path: Ścieżka do pliku wideo
        srt_path: Ścieżka do pliku SRT
        output_path: Ścieżka wyjściowa
        styles: Słownik ze stylami napisów
        duration: Długość w sekundach (None = pełny film)
        preset: Preset ffmpeg (fast/medium/slow)
        crf: Constant Rate Factor (niższe = lepsza jakość)
    """
    try:
        render_type = "PREVIEW" if duration else "FULL VIDEO"
        logger.info(f"=== RENDER {render_type} ===")
        logger.info(f"Received styles: {styles}")

        # Wyciągnij style z właściwej struktury
        font_family = styles.get('fontFamily', 'Arial')
        font_size = styles.get('fontSize', 24)
        color = styles.get('color', '#FFFFFF')
        stroke_color = styles.get('strokeColor', '#000000')
        stroke_width = styles.get('strokeWidth', 2)

        logger.info(f"Parsed styles: Font={font_family}, Size={font_size}, Color={color}, Stroke={stroke_color}, Width={stroke_width}")

        # Konwersja kolorów z hex na ASS format (BGR)
        color_ass = hex_to_ass_color(color)
        stroke_color_ass = hex_to_ass_color(stroke_color)

        logger.info(f"Converted colors: Text={color_ass}, Stroke={stroke_color_ass}")

        # Usuń stary plik jeśli istnieje
        if output_path.exists():
            output_path.unlink()

        # Buduj komendę ffmpeg
        cmd = [
            'ffmpeg', '-i', str(video_path),
            '-vf',
            f"subtitles={srt_path}:force_style='Fontname={font_family},Fontsize={font_size},PrimaryColour={color_ass},OutlineColour={stroke_color_ass},Outline={stroke_width},Bold=0,BorderStyle=1'",
        ]

        # Dodaj ograniczenie czasu dla próbki
        if duration:
            cmd.extend(['-t', str(duration)])

        # Dodaj parametry kodowania
        cmd.extend([
            '-c:v', 'libx264',
            '-preset', preset,
            '-crf', str(crf),
            '-c:a', 'aac',
            '-y', str(output_path)
        ])

        logger.info(f"FFmpeg command: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            logger.error(f"FFmpeg stderr: {result.stderr}")
            logger.error(f"FFmpeg stdout: {result.stdout}")
            raise Exception(f"FFmpeg error: {result.stderr}")

        logger.info(f"{render_type} wygenerowany pomyślnie")
        return True

    except Exception as e:
        logger.error(f"Błąd renderowania {render_type}: {e}")
        import traceback
        traceback.print_exc()
        raise

def render_video_segment(video_path: Path, srt_path: Path, output_path: Path, styles: dict, duration: int):
    """Renderuje fragment wideo z napisami (próbka)"""
    return render_video_with_subtitles(video_path, srt_path, output_path, styles, duration=duration, preset='fast', crf=23)

def render_full_video(video_path: Path, srt_path: Path, output_path: Path, styles: dict):
    """Renderuje pełne wideo z napisami"""
    return render_video_with_subtitles(video_path, srt_path, output_path, styles, duration=None, preset='medium', crf=20)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)