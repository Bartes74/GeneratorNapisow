#!/usr/bin/env bash
set -euo pipefail

# Build and push Docker image for linux/amd64
# Usage: ./build-docker.sh [DOCKER_USERNAME] [IMAGE_NAME] [TAG]

DOCKER_USERNAME="${1:-dunczyk}"
IMAGE_NAME="${2:-generator-napisow}"
TAG="${3:-latest}"

FULL_IMAGE="${DOCKER_USERNAME}/${IMAGE_NAME}:${TAG}"

echo "=========================================="
echo "Building Docker image for linux/amd64"
echo "Image: ${FULL_IMAGE}"
echo "=========================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "ERROR: Docker daemon is not running. Please start Docker Desktop."
    exit 1
fi

# Check if logged in to DockerHub
if ! docker info 2>&1 | grep -q "Username:"; then
    echo "WARNING: Not logged in to DockerHub."
    echo "Please run: docker login"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create or use buildx builder
echo "Setting up buildx builder..."
docker buildx create --name multiarch --use 2>/dev/null || docker buildx use multiarch

# Build for linux/amd64
echo "Building image for linux/amd64..."
docker buildx build \
    --platform linux/amd64 \
    --tag "${FULL_IMAGE}" \
    --tag "${DOCKER_USERNAME}/${IMAGE_NAME}:v1.1.0" \
    --push \
    --file Dockerfile \
    .

echo "=========================================="
echo "✅ Build complete!"
echo "Image: ${FULL_IMAGE}"
echo "Also tagged: ${DOCKER_USERNAME}/${IMAGE_NAME}:v1.1.0"
echo "=========================================="
echo ""
echo "To run the container:"
echo "docker run -d -p 80:80 -p 8000:8000 \\"
echo "  -e TRANSCRIPTION_API_KEY=your-key-here \\"
echo "  ${FULL_IMAGE}"
