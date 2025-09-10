# Single Container Deployment

This document explains how to deploy the entire Subtitle Generator application using a single Docker container.

## Overview

The single-container approach combines both the frontend and backend services into one container. This is useful for:
- Simplified deployment
- Development and testing environments
- Resource-constrained environments
- Cases where container orchestration is not available

## Prerequisites

- Docker

## Building the Container

```bash
docker build -t subtitle-generator .

# Build with custom API URL for frontend (if backend is on different host)
docker build --build-arg VITE_API_URL=https://twoja-domena.pl -t subtitle-generator .
```

## Running the Container

```bash
# Basic run
docker run --name subtitle-generator -p 80:80 -p 8000:8000 subtitle-generator

# With env file and persistent volumes (recommended)
# Create a file named .env (do not commit) with required variables.
docker run --name subtitle-generator \
  --env-file .env \
  -p 80:80 -p 8000:8000 \
  -v $(pwd)/backend/uploads:/app/uploads \
  -v $(pwd)/backend/temp:/app/temp \
  -v $(pwd)/backend/output:/app/output \
  -d subtitle-generator
```

## Accessing the Application

Once the container is running:
- Frontend: http://localhost
- Backend API: http://localhost:8000

## How It Works

The single Dockerfile uses a multi-stage build process:

1. **Frontend Build Stage**: Uses Node.js to build the React application
2. **Backend Runtime Stage**: 
   - Uses Python 3.13 with all required dependencies
   - Installs system dependencies (ffmpeg, nginx)
   - Copies the built frontend files to nginx serving directory
   - Configures nginx to serve the frontend and proxy API requests
   - Starts both nginx (for frontend) and uvicorn (for backend API)

## Environment Variables

The container supports these environment variables:

- FRONTEND_ORIGINS: Comma-separated allowed origins for CORS
- TRANSCRIPTION_API_URL: Base URL of the external transcription API (required)
- TRANSCRIPTION_API_KEY: API key for the external service (required)
- TRANSCRIPTION_MODEL: Transcription model name (default: whisper-1)

## Directory Structure in Container

```
/app/                    # Backend application
/var/www/html/          # Frontend built files (served by nginx)
/etc/nginx/nginx.conf   # Nginx configuration
```

## Move the Image to Another Machine

To export and import the built image without a registry:

```bash
# On source machine
docker build -t subtitle-generator:latest .
docker save subtitle-generator:latest -o subtitle-generator.tar

# Transfer subtitle-generator.tar to the target machine, then:
docker load -i subtitle-generator.tar
docker run --env-file .env -p 80:80 -p 8000:8000 subtitle-generator:latest
```

## Environment Variables

The container supports the same environment variables as the separate containers:
- `FRONTEND_ORIGINS`: Comma-separated list of allowed origins for CORS

## Limitations

Compared to the multi-container approach, the single container has some limitations:
- Less scalable (both services share the same resources)
- Harder to update individual components
- Larger container image size
- Less fault isolation between frontend and backend

For production deployments, we recommend using the separate Dockerfiles with docker-compose.