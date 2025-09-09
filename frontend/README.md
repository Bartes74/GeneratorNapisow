# Subtitle Generator Frontend

React frontend for the subtitle generator application.

## Features

- Video upload interface
- Subtitle editing
- Real-time preview
- Customizable subtitle styling
- Video rendering with embedded subtitles

## Prerequisites

- Node.js 18+
- Docker (for containerized deployment)

## Dependencies

All dependencies are listed in [package.json](package.json).

Key dependencies include:
- React - UI library
- Vite - Build tool
- TailwindCSS - Styling framework
- Axios - HTTP client
- Video.js - Video player

## Development

```bash
npm install
npm run dev
```

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Production Deployment

Use the provided Dockerfile for containerized deployment:

```bash
docker build -t subtitle-generator-frontend .
docker run -p 80:80 subtitle-generator-frontend
```

## Nginx Configuration

The application uses Nginx for serving static files and proxying API requests to the backend. The configuration is in [nginx.conf](nginx.conf).

Key features of the Nginx configuration:
- Static file serving
- API proxy to backend
- Client-side routing support
- Gzip compression