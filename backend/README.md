# Subtitle Generator Backend

FastAPI backend for the subtitle generator application with external transcription service integration.

## Features

- Video upload and management
- Audio extraction from video files
- Speech-to-text transcription using external transcription services (OpenAI-compatible APIs)
- Subtitle generation in SRT format
- Video rendering with embedded subtitles

## Prerequisites

- Python 3.13
- FFmpeg
- Docker (for containerized deployment)

## Dependencies

All Python dependencies are listed in [requirements.txt](requirements.txt).

Key dependencies include:
- FastAPI - Web framework
- Requests - HTTP client for external API calls
- FFmpeg - Video processing

## Environment Variables

- `FRONTEND_ORIGINS`: Comma-separated list of allowed origins for CORS (default: "http://localhost:5173,http://localhost")
- `TRANSCRIPTION_API_URL`: URL to external transcription service API (**required**)
- `TRANSCRIPTION_API_KEY`: API key for external transcription service (**required**)
- `TRANSCRIPTION_MODEL`: Model name for external transcription service (default: "whisper-large-v3")

## Directories

The application uses the following directories:
- `uploads`: Uploaded video files
- `temp`: Temporary files during processing
- `output`: Generated subtitle files and final videos

## API Documentation

Once the server is running, API documentation is available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Development

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Production Deployment

Use the provided Dockerfile for containerized deployment:

```bash
docker build -t subtitle-generator-backend .
docker run -p 8000:8000 subtitle-generator-backend
```