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
from app.transcription import transcribe_audio, extract_audio, generate_srt, detect_language

# Inicjalizacja FastAPI
app = FastAPI(title="Subtitle Generator API")

# CORS dla frontendu
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ścieżki folderów
BASE_DIR = Path(__file__).parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
TEMP_DIR = BASE_DIR / "temp"
OUTPUT_DIR = BASE_DIR / "output"

# Tworzenie folderów jeśli nie istnieją
for dir in [UPLOAD_DIR, TEMP_DIR, OUTPUT_DIR]:
    dir.mkdir(exist_ok=True)

# Mount uploads directory
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Dozwolone formaty wideo
ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi"}
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB

# Executor dla operacji blokujących
executor = ThreadPoolExecutor(max_workers=3)

@app.get("/")
async def root():
    return {
        "message": "Subtitle Generator API",
        "version": "1.0.0",
        "endpoints": {
            "upload_video": "POST /api/upload",
            "transcribe": "POST /api/transcribe/{video_id}",
            "download_srt": "GET /api/download/srt/{video_id}",
            "upload_srt": "POST /api/upload-srt/{video_id}",
            "render_preview": "POST /api/render-preview/{video_id}",
            "render_final": "POST /api/render-final/{video_id}",
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
            "whisper": "ready",
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

    # Zapis pliku
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(500, f"Błąd zapisu pliku: {str(e)}")

    # Sprawdzenie rozmiaru
    file_size = os.path.getsize(file_path)
    if file_size > MAX_FILE_SIZE:
        os.remove(file_path)
        raise HTTPException(400, f"Plik za duży. Max: {MAX_FILE_SIZE/1024/1024}MB")

    # Pobierz długość wideo
    duration = get_video_duration(file_path)

    return {
        "video_id": video_id,
        "filename": file.filename,
        "size_mb": round(file_size / 1024 / 1024, 2),
        "format": file_ext,
        "duration": duration
    }

@app.post("/api/transcribe/{video_id}")
async def transcribe_video(
    video_id: str,
    language: Optional[str] = None
):
    # Znajdź plik wideo
    video_files = list(UPLOAD_DIR.glob(f"{video_id}.*"))
    if not video_files:
        raise HTTPException(404, "Nie znaleziono pliku wideo")

    video_path = video_files[0]
    audio_path = TEMP_DIR / f"{video_id}.wav"
    srt_path = OUTPUT_DIR / f"{video_id}.srt"

    try:
        # Wyodrębnij audio
        if not await asyncio.get_event_loop().run_in_executor(
            executor, extract_audio, video_path, audio_path
        ):
            raise HTTPException(500, "Błąd wyodrębniania audio")

        # Transkrybuj
        result = await asyncio.get_event_loop().run_in_executor(
            executor, transcribe_audio, audio_path, language
        )

        # Generuj SRT
        srt_content = generate_srt(result['segments'])

        # Zapisz SRT
        with open(srt_path, 'w', encoding='utf-8') as f:
            f.write(srt_content)

        # Usuń tymczasowe audio
        if audio_path.exists():
            audio_path.unlink()

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
        print(f"=== RENDER PREVIEW REQUEST ===")
        print(f"Video ID: {video_id}")
        print(f"Raw request data: {request_data}")
        
        # Wyciągnij style z request_data
        subtitle_styles = request_data.get('subtitle_styles', {})
        print(f"Extracted subtitle styles: {subtitle_styles}")
        
        # Znajdź pliki
        video_files = list(UPLOAD_DIR.glob(f"{video_id}.*"))
        if not video_files:
            raise HTTPException(404, "Nie znaleziono pliku wideo")
        
        video_path = video_files[0]
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
        print(f"Błąd generowania podglądu: {e}")
        raise HTTPException(500, f"Błąd generowania podglądu: {str(e)}")

@app.post("/api/render-final/{video_id}")
async def render_final_video(
    video_id: str,
    request_data: Dict[str, Any] = Body(...)
):
    """Renderuje pełny film z napisami"""
    try:
        print(f"=== RENDER FINAL REQUEST ===")
        print(f"Video ID: {video_id}")
        print(f"Raw request data: {request_data}")
        
        # Wyciągnij style z request_data
        subtitle_styles = request_data.get('subtitle_styles', {})
        print(f"Extracted subtitle styles: {subtitle_styles}")
        
        # Znajdź pliki
        video_files = list(UPLOAD_DIR.glob(f"{video_id}.*"))
        if not video_files:
            raise HTTPException(404, "Nie znaleziono pliku wideo")
        
        video_path = video_files[0]
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
        print(f"Błąd renderowania: {e}")
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

# Funkcje pomocnicze
def get_video_duration(video_path: Path) -> float:
    """Pobiera długość wideo w sekundach"""
    try:
        cmd = [
            'ffprobe', '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            str(video_path)
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        return float(result.stdout.strip())
    except:
        return 0

def render_video_segment(video_path: Path, srt_path: Path, output_path: Path, styles: dict, duration: int):
    """Renderuje fragment wideo z napisami"""
    try:
        print(f"=== RENDER VIDEO SEGMENT ===")
        print(f"Received styles: {styles}")
        
        # Wyciągnij style z właściwej struktury
        font_family = styles.get('fontFamily', 'Arial')
        font_size = styles.get('fontSize', 24)
        color = styles.get('color', '#FFFFFF')
        stroke_color = styles.get('strokeColor', '#000000')
        stroke_width = styles.get('strokeWidth', 2)
        
        print(f"Parsed styles:")
        print(f"  Font: {font_family}")
        print(f"  Size: {font_size}")
        print(f"  Color: {color}")
        print(f"  Stroke Color: {stroke_color}")
        print(f"  Stroke Width: {stroke_width}")
        
        # Konwersja kolorów z hex na ASS format (BGR)
        def hex_to_ass_color(hex_color):
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
        
        color_ass = hex_to_ass_color(color)
        stroke_color_ass = hex_to_ass_color(stroke_color)
        
        print(f"Converted colors:")
        print(f"  Text color ASS: {color_ass}")
        print(f"  Stroke color ASS: {stroke_color_ass}")
        
        # Usuń stary plik jeśli istnieje
        if output_path.exists():
            output_path.unlink()
        
        cmd = [
            'ffmpeg', '-i', str(video_path),
            '-vf',
            f"subtitles={srt_path}:force_style='Fontname={font_family},Fontsize={font_size},PrimaryColour={color_ass},OutlineColour={stroke_color_ass},Outline={stroke_width},Bold=0,BorderStyle=1'",
            '-t', str(duration),
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '23',
            '-c:a', 'aac',
            '-y', str(output_path)
        ]
        
        print(f"FFmpeg command: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"FFmpeg stderr: {result.stderr}")
            print(f"FFmpeg stdout: {result.stdout}")
            raise Exception(f"FFmpeg error: {result.stderr}")
            
        print("Próbka wygenerowana pomyślnie")
        return True
        
    except Exception as e:
        print(f"Błąd renderowania próbki: {e}")
        import traceback
        traceback.print_exc()
        raise

def render_full_video(video_path: Path, srt_path: Path, output_path: Path, styles: dict):
    """Renderuje pełne wideo z napisami"""
    try:
        print(f"=== RENDER FULL VIDEO ===")
        print(f"Received styles: {styles}")
        
        # Wyciągnij style z właściwej struktury
        font_family = styles.get('fontFamily', 'Arial')
        font_size = styles.get('fontSize', 24)
        color = styles.get('color', '#FFFFFF')
        stroke_color = styles.get('strokeColor', '#000000')
        stroke_width = styles.get('strokeWidth', 2)
        
        print(f"Parsed styles:")
        print(f"  Font: {font_family}")
        print(f"  Size: {font_size}")
        print(f"  Color: {color}")
        print(f"  Stroke Color: {stroke_color}")
        print(f"  Stroke Width: {stroke_width}")
        
        # Konwersja kolorów z hex na ASS format (BGR)
        def hex_to_ass_color(hex_color):
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
        
        color_ass = hex_to_ass_color(color)
        stroke_color_ass = hex_to_ass_color(stroke_color)
        
        print(f"Converted colors:")
        print(f"  Text color ASS: {color_ass}")
        print(f"  Stroke color ASS: {stroke_color_ass}")
        
        # Usuń stary plik jeśli istnieje
        if output_path.exists():
            output_path.unlink()
        
        cmd = [
            'ffmpeg', '-i', str(video_path),
            '-vf',
            f"subtitles={srt_path}:force_style='Fontname={font_family},Fontsize={font_size},PrimaryColour={color_ass},OutlineColour={stroke_color_ass},Outline={stroke_width},Bold=0,BorderStyle=1'",
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-crf', '20',
            '-c:a', 'aac',
            '-y', str(output_path)
        ]
        
        print(f"FFmpeg command: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"FFmpeg stderr: {result.stderr}")
            print(f"FFmpeg stdout: {result.stdout}")
            raise Exception(f"FFmpeg error: {result.stderr}")
            
        print("Film wygenerowany pomyślnie")
        return True
        
    except Exception as e:
        print(f"Błąd renderowania filmu: {e}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)