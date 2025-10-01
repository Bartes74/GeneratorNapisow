#!/bin/bash

# Build and push Docker image for subtitle generator
# Platform: linux/amd64
# DockerHub username: dunczyk

set -e

DOCKER_USERNAME="dunczyk"
IMAGE_NAME="generator-napisow"
VERSION="v1.1.0"

echo "🔍 Checking Docker status..."
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

echo "🔍 Checking Docker login..."
if ! docker info 2>&1 | grep -q "Username: $DOCKER_USERNAME"; then
    echo "⚠️  Not logged in to DockerHub as $DOCKER_USERNAME"
    echo "Please login first: docker login -u $DOCKER_USERNAME"
    exit 1
fi

echo "🏗️  Building Docker image for linux/amd64..."
echo "Image: $DOCKER_USERNAME/$IMAGE_NAME:latest"
echo "Tagged: $DOCKER_USERNAME/$IMAGE_NAME:$VERSION"
echo ""

# Build for linux/amd64 platform
docker buildx build \
    --platform linux/amd64 \
    -t $DOCKER_USERNAME/$IMAGE_NAME:latest \
    -t $DOCKER_USERNAME/$IMAGE_NAME:$VERSION \
    --push \
    .

echo ""
echo "✅ Build complete!"
echo ""
echo "📦 Image published to DockerHub:"
echo "   - $DOCKER_USERNAME/$IMAGE_NAME:latest"
echo "   - $DOCKER_USERNAME/$IMAGE_NAME:$VERSION"
echo ""
echo "🚀 To deploy on another machine:"
echo "   docker pull $DOCKER_USERNAME/$IMAGE_NAME:latest"
echo "   docker run -d -p 80:80 -e TRANSCRIPTION_API_KEY=your-key $DOCKER_USERNAME/$IMAGE_NAME:latest"
echo ""
echo "📖 See COMPLETE-DEPLOYMENT-GUIDE.md for detailed deployment instructions"
