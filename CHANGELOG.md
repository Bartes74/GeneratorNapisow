# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-10-06

### Added
- Performance benchmarks table in README
- Detailed technology stack documentation
- Quick start guide using `./start.sh`
- Enhanced error messages with detailed diagnostics
- Type hints for better code clarity (`tuple[bool, str]`)

### Changed
- **BREAKING**: `extract_audio()` now returns `tuple[bool, str]` instead of `bool`
- File size validation now happens during upload (streaming) instead of after
- Audio encoding quality increased from 32kbps to 64kbps for better transcription
- ThreadPoolExecutor limited to 4 workers (from unlimited)
- All `print()` statements replaced with `logger.info()` and `logger.error()`
- CORS origins parsing now strips whitespace from configuration

### Fixed
- Memory leak in React SubtitleEditor component (blob URLs now properly cleaned up)
- File size validation preventing partial uploads
- CORS configuration handling spaces in environment variable
- Audio extraction error handling with detailed messages

### Removed
- Unused `get_video_duration()` function
- 34 unused Python dependencies (bcrypt, passlib, python-jose, networkx, sympy, etc.)
- Code duplication in video rendering functions (refactored from 2 functions to 1)

### Performance
- Docker image size reduced by ~100MB (-20%)
- Upload validation is now real-time instead of post-upload
- Reduced codebase by 120 lines through refactoring
- Improved logging for production debugging

### Dependencies
```diff
Before: 38 packages
After:  4 packages
- Removed: bcrypt, passlib, python-jose, networkx, sympy, numpy, and 28 others
+ Kept: fastapi, python-multipart, uvicorn, openai
```

## [1.0.0] - 2024-09-30

### Added
- Initial release
- Video upload and transcription
- SRT file generation and editing
- Subtitle styling (font, size, color, stroke)
- Video preview with subtitles (10 seconds)
- Full video rendering with subtitles
- Docker and Docker Compose support
- External transcription service integration (OpenAI-compatible)
- Multi-container and single-container deployment options
- Dark mode support
- File cleanup API endpoint

### Features
- React 19 frontend with TailwindCSS
- FastAPI backend with async support
- FFmpeg video processing
- Pre-extraction of audio for faster processing
- Configurable subtitle styles
- Language detection and selection
- Health check endpoint
