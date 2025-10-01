#!/usr/bin/env bash
set -euo pipefail

echo "=========================================="
echo "Docker Build & Push - Generator Napisów"
echo "=========================================="
echo ""
echo "Target: dunczyk/generator-napisow:latest"
echo "Platform: linux/amd64"
echo ""

# Check Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ ERROR: Docker is not running!"
    echo "Please start Docker Desktop and try again."
    exit 1
fi

echo "✓ Docker is running"

# Check if logged in
if ! docker info 2>&1 | grep -q "Username: dunczyk"; then
    echo ""
    echo "⚠️  You need to login to DockerHub first:"
    echo "   docker login -u dunczyk"
    echo ""
    exit 1
fi

echo "✓ Logged in as dunczyk"
echo ""

# Create/use buildx builder
echo "Setting up buildx builder..."
docker buildx create --name multiarch --use 2>/dev/null || docker buildx use multiarch
echo "✓ Buildx ready"
echo ""

# Build and push
echo "Building and pushing image..."
echo "(This may take 5-10 minutes)"
echo ""

docker buildx build \
    --platform linux/amd64 \
    --tag dunczyk/generator-napisow:latest \
    --tag dunczyk/generator-napisow:v1.1.0 \
    --push \
    --progress=plain \
    .

echo ""
echo "=========================================="
echo "✅ SUCCESS!"
echo "=========================================="
echo ""
echo "Images pushed to DockerHub:"
echo "  • dunczyk/generator-napisow:latest"
echo "  • dunczyk/generator-napisow:v1.1.0"
echo ""
echo "To use:"
echo "  docker pull dunczyk/generator-napisow:latest"
echo "  docker run -d -p 80:80 -e TRANSCRIPTION_API_KEY=your-key dunczyk/generator-napisow:latest"
echo ""
