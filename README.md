# Subtitle Generator Application

A full-stack application for generating subtitles from video files using external AI-powered transcription services.

## Architecture

- **Frontend**: React with Vite, TailwindCSS
- **Backend**: FastAPI with external transcription service integration (OpenAI-compatible APIs)
- **Infrastructure**: Docker & Docker Compose for containerization

## Prerequisites

- Docker
- Docker Compose

## Deployment

### Using Docker Compose (Recommended)

1. Build and start the services:
   ```bash
   docker-compose up --build
   ```

2. Access the application:
   - Frontend: http://localhost
   - Backend API: http://localhost:8000

### Single Container Deployment (Alternative)

For simpler deployments, you can use a single container that includes both the frontend and backend:

1. Build the single container:
   ```bash
   # default build (frontend will use relative /api in production)
   docker build -t subtitle-generator .

   # build with explicit API URL for frontend (if backend under different domain)
   docker build --build-arg VITE_API_URL=https://twoja-domena.pl -t subtitle-generator .
   ```

2. Run the container (basic):
   ```bash
   docker run --name subtitle-generator -p 80:80 -p 8000:8000 subtitle-generator
   ```

3. Run the container with env-file and volumes (recommended for persistence):
   ```bash
   # Create a .env file with required variables (see below)
   docker run --name subtitle-generator \
     --env-file .env \
     -p 80:80 -p 8000:8000 \
     -v $(pwd)/backend/uploads:/app/uploads \
     -v $(pwd)/backend/temp:/app/temp \
     -v $(pwd)/backend/output:/app/output \
     -d subtitle-generator
   ```

4. Access the application:
   - Frontend: http://localhost
   - Backend API: http://localhost:8000

5. Move the built image to another machine (no registry):
   ```bash
   # On source machine
   docker build -t subtitle-generator:latest .
   docker save subtitle-generator:latest -o subtitle-generator.tar

   # On target machine
   docker load -i subtitle-generator.tar
   docker run --env-file .env -p 80:80 -p 8000:8000 subtitle-generator:latest
   ```

See [DOCKER_SINGLE_CONTAINER.md](DOCKER_SINGLE_CONTAINER.md) for more details about this deployment option.

### Individual Docker Images

#### Backend
```bash
# Build the backend image
docker build -t subtitle-generator-backend ./backend

# Run the backend container
docker run -p 8000:8000 -v $(pwd)/backend/uploads:/app/uploads -v $(pwd)/backend/temp:/app/temp -v $(pwd)/backend/output:/app/output subtitle-generator-backend
```

#### Frontend
```bash
# Build the frontend image
docker build -t subtitle-generator-frontend ./frontend

# Run the frontend container
docker run -p 80:80 subtitle-generator-frontend
```

## Environment Variables

### Backend
- `FRONTEND_ORIGINS`: Comma-separated list of allowed origins for CORS (default: "http://localhost:5173,http://localhost")
- `TRANSCRIPTION_API_URL`: URL to external transcription service API (**required**)
- `TRANSCRIPTION_API_KEY`: API key for external transcription service (**required**)
- `TRANSCRIPTION_MODEL`: Model name for external transcription service (default: "whisper-large-v3")

## Directories

The application uses the following directories for persistent storage:
- `backend/uploads`: Uploaded video files
- `backend/temp`: Temporary files during processing
- `backend/output`: Generated subtitle files and final videos

## API Endpoints

- `GET /`: API information
- `GET /api/health`: Health check
- `POST /api/upload`: Upload video file
- `POST /api/transcribe/{video_id}`: Transcribe video audio
- `GET /api/download/srt/{video_id}`: Download SRT file
- `POST /api/upload-srt/{video_id}`: Upload edited SRT file
- `POST /api/render-preview/{video_id}`: Render 10-second preview
- `POST /api/render-final/{video_id}`: Render full video with subtitles
- `GET /api/download/video/{video_id}`: Download final video with subtitles

## Development

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```