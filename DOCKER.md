# Docker Deployment Guide

## Quick Start

### Pull from DockerHub

```bash
docker pull dunczyk/generator-napisow:latest
```

### Run the container

```bash
docker run -d \
  -p 80:80 \
  -p 8000:8000 \
  -e TRANSCRIPTION_API_KEY=your-openai-api-key \
  -e TRANSCRIPTION_API_URL=https://api.openai.com/v1 \
  -e TRANSCRIPTION_MODEL=whisper-1 \
  --name subtitle-generator \
  dunczyk/generator-napisow:latest
```

### Access the application

- **Frontend**: http://localhost
- **API**: http://localhost:8000
- **Health check**: http://localhost/health

## Building Your Own Image

### Prerequisites

1. Docker Desktop installed and running
2. DockerHub account (for pushing images)

### Login to DockerHub

```bash
docker login
```

### Build and Push

#### Option 1: Using the build script (recommended)

```bash
./build-docker.sh [DOCKER_USERNAME] [IMAGE_NAME] [TAG]
```

Example:
```bash
./build-docker.sh dunczyk generator-napisow latest
```

#### Option 2: Manual build

```bash
# Create buildx builder
docker buildx create --name multiarch --use

# Build for linux/amd64
docker buildx build \
  --platform linux/amd64 \
  --tag dunczyk/generator-napisow:latest \
  --tag dunczyk/generator-napisow:v1.1.0 \
  --push \
  .
```

## Environment Variables

### Required

- `TRANSCRIPTION_API_KEY` - Your OpenAI API key
- `TRANSCRIPTION_API_URL` - OpenAI API endpoint (default: https://api.openai.com/v1)
- `TRANSCRIPTION_MODEL` - Whisper model to use (default: whisper-1)

### Optional

- `FRONTEND_ORIGINS` - CORS origins (default: http://localhost,http://localhost:5173)
- `PUBLIC_API_BASE` - Public API base URL for frontend (for custom domains)

## Architecture

This is a **single-container deployment** that includes:

- **Nginx** (port 80) - Serves frontend and proxies API requests
- **FastAPI Backend** (port 8000) - Handles video processing and transcription
- **Supervisor** - Manages both Nginx and FastAPI processes

### Ports

- `80` - HTTP (Nginx frontend + API proxy)
- `8000` - Direct backend API access (optional)

## Docker Compose

### Single Container

```yaml
version: '3.8'

services:
  subtitle-generator:
    image: dunczyk/generator-napisow:latest
    ports:
      - "80:80"
      - "8000:8000"
    environment:
      - TRANSCRIPTION_API_KEY=your-api-key-here
      - TRANSCRIPTION_API_URL=https://api.openai.com/v1
      - TRANSCRIPTION_MODEL=whisper-1
    volumes:
      - ./data/uploads:/app/uploads
      - ./data/temp:/app/temp
      - ./data/output:/app/output
    restart: unless-stopped
```

### Run with Docker Compose

```bash
docker-compose up -d
```

## Troubleshooting

### Check container logs

```bash
docker logs subtitle-generator
```

### Check specific service logs

```bash
# Backend logs
docker exec subtitle-generator tail -f /var/log/supervisor/backend.log

# Nginx logs
docker exec subtitle-generator tail -f /var/log/supervisor/nginx.log
```

### Enter container shell

```bash
docker exec -it subtitle-generator bash
```

### Restart services inside container

```bash
docker exec subtitle-generator supervisorctl restart all
```

## Image Details

- **Base Image**: Python 3.13-slim
- **Platform**: linux/amd64
- **Size**: ~1.2GB (includes FFmpeg, Node.js build tools)
- **Components**:
  - Python 3.13
  - FFmpeg (for audio/video processing)
  - Nginx (web server)
  - Supervisor (process manager)

## Production Considerations

### SSL/TLS

Use a reverse proxy like Traefik or Nginx Proxy Manager:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.subtitle-gen.rule=Host(`subtitle.yourdomain.com`)"
  - "traefik.http.routers.subtitle-gen.entrypoints=websecure"
  - "traefik.http.routers.subtitle-gen.tls.certresolver=letsencrypt"
```

### Resource Limits

```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 4G
    reservations:
      cpus: '1'
      memory: 2G
```

### Data Persistence

Mount volumes for data persistence:

```yaml
volumes:
  - ./data/uploads:/app/uploads
  - ./data/temp:/app/temp
  - ./data/output:/app/output
```

## Optimizations Applied

This image includes the following optimizations:

1. ✅ Multi-stage build (smaller final image)
2. ✅ Audio compression (MP3 32kbps instead of WAV)
3. ✅ Optimized ThreadPoolExecutor (auto CPU detection)
4. ✅ Cached API base configuration
5. ✅ Memory leak fixes (URL.createObjectURL cleanup)
6. ✅ Reduced code duplication
7. ✅ Improved error logging

## Version History

### v1.1.0 (2025-09-30)
- ✨ MP3 audio compression (reduces file size by 80-90%)
- ✨ Optimized ThreadPoolExecutor
- ✨ Frontend memory leak fixes
- ✨ Improved code structure and performance
- 🐛 Fixed OpenAI API 413 error (file too large)

### v1.0.0
- Initial release
- WAV audio format
- Basic transcription features
