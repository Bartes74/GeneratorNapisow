# Multi-stage Dockerfile for the entire application
# Stage 1: Build the React frontend
FROM node:18-alpine AS frontend-build

# Set working directory
WORKDIR /app

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source code
COPY frontend/ .

# Build the frontend application
RUN npm run build

# Stage 2: Set up the backend with Python and frontend files
FROM python:3.13-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# Set work directory
WORKDIR /app

# Install system dependencies for both frontend serving and backend processing
RUN apt-get update && apt-get install -y \
    build-essential \
    ffmpeg \
    git \
    nginx \
    supervisor \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /var/log/supervisor

# Copy backend requirements
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Create directories for uploads, temp and output
RUN mkdir -p uploads temp output

# Copy backend source code
COPY backend/ .

# Copy built frontend files to nginx directory
COPY --from=frontend-build /app/dist /var/www/html

# Copy nginx configuration
COPY frontend/nginx.conf /etc/nginx/nginx.conf

# Copy supervisor configuration
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose both ports
EXPOSE 80 8000

# Start both nginx and the backend application using supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]