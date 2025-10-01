# Docker Quick Start Guide

## Prerequisites

1. **Docker Desktop** installed and running
2. **OpenAI API Key** from https://platform.openai.com/api-keys

---

## Option 1: Pull from DockerHub (Easiest)

### Step 1: Start Docker Desktop
Make sure Docker Desktop is running.

### Step 2: Create .env file
```bash
cp .env.docker.example .env
```

Edit `.env` and add your OpenAI API key:
```
TRANSCRIPTION_API_KEY=sk-proj-YOUR_REAL_KEY_HERE
```

### Step 3: Run with Docker Compose
```bash
docker-compose -f docker-compose-single.yml up -d
```

### Step 4: Access the application
- **Frontend**: http://localhost
- **API**: http://localhost:8000
- **Health**: http://localhost/health

---

## Option 2: Build Locally

### Step 1: Make sure Docker is running
```bash
docker info
```

### Step 2: Build the image
```bash
./build-docker.sh yourusername generator-napisow latest
```

**Note**: Replace `yourusername` with your DockerHub username.

### Step 3: Run the container
```bash
docker run -d \
  -p 80:80 \
  -p 8000:8000 \
  -e TRANSCRIPTION_API_KEY=sk-proj-YOUR_KEY_HERE \
  --name subtitle-generator \
  yourusername/generator-napisow:latest
```

---

## Useful Commands

### View logs
```bash
docker logs -f subtitle-generator
```

### View backend logs specifically
```bash
docker exec subtitle-generator tail -f /var/log/supervisor/backend.log
```

### View nginx logs
```bash
docker exec subtitle-generator tail -f /var/log/supervisor/nginx.log
```

### Stop container
```bash
docker stop subtitle-generator
```

### Remove container
```bash
docker rm subtitle-generator
```

### Restart container
```bash
docker restart subtitle-generator
```

---

## Troubleshooting

### Container won't start?

Check logs:
```bash
docker logs subtitle-generator
```

### "Docker daemon not running"?

Start Docker Desktop application.

### Port already in use?

Change ports in docker-compose-single.yml:
```yaml
ports:
  - "8080:80"    # Changed from 80:80
  - "8001:8000"  # Changed from 8000:8000
```

### API key not working?

1. Check your .env file
2. Make sure the key starts with `sk-proj-` or `sk-`
3. Restart the container after changing .env:
   ```bash
   docker-compose -f docker-compose-single.yml restart
   ```

---

## Production Deployment

For production with SSL:

1. Use a reverse proxy (Traefik, Nginx Proxy Manager, Caddy)
2. Set up SSL certificates (Let's Encrypt)
3. Configure domain name
4. Set resource limits in docker-compose

See `DOCKER.md` for detailed production setup.

---

## File Structure

After running, you'll have:

```
.
├── data/
│   ├── uploads/    # Uploaded videos
│   ├── temp/       # Temporary files
│   ├── output/     # Generated SRT files
│   └── logs/       # Application logs
```

These directories persist your data even if you recreate the container.

---

## Need Help?

1. Check `DOCKER.md` for detailed documentation
2. View logs: `docker logs subtitle-generator`
3. Check health: `curl http://localhost/health`
