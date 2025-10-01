# Opcje Wdrożenia / Deployment Options

Ta aplikacja wspiera 3 różne scenariusze wdrożenia. Wybierz odpowiedni dla swojej sytuacji.

---

## 🎯 Opcja 1: Single Container (ZALECANA dla produkcji)

**Jeden kontener zawiera: Frontend (Nginx) + Backend (FastAPI)**

### Kiedy użyć?
- ✅ Proste wdrożenie na serwerze
- ✅ Mniejsze zużycie zasobów
- ✅ Łatwiejsze zarządzanie
- ✅ Idealne dla małych/średnich aplikacji

### Jak uruchomić?

#### Z DockerHub:
```bash
docker pull dunczyk/generator-napisow:latest

docker run -d -p 80:80 \
  -e TRANSCRIPTION_API_KEY=your-key \
  -v ./data/uploads:/app/uploads \
  -v ./data/temp:/app/temp \
  -v ./data/output:/app/output \
  --name subtitle-gen \
  dunczyk/generator-napisow:latest
```

#### Lub z docker-compose:
```bash
# Użyj pliku docker-compose-single.yml
docker-compose -f docker-compose-single.yml up -d
```

### Architektura:
```
┌─────────────────────────────────────┐
│  Container: subtitle-generator      │
│  ┌──────────────────────────────┐   │
│  │  Nginx (port 80)             │   │
│  │  ├─ Frontend static files    │   │
│  │  └─ Proxy → localhost:8000   │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │  FastAPI Backend (port 8000) │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │  Supervisor (zarządza nimi)  │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

### Pliki:
- `Dockerfile` (główny)
- `frontend/nginx-single-container.conf` → proxy do `localhost:8000`
- `supervisord.conf`
- `docker-entrypoint.sh`

---

## 🔧 Opcja 2: Multi-Container (dla developmentu)

**Dwa osobne kontenery: Frontend (Nginx) + Backend (FastAPI)**

### Kiedy użyć?
- ✅ Development / testowanie
- ✅ Gdy chcesz skalować frontend i backend osobno
- ✅ Łatwiejsze debugowanie
- ✅ Niezależne restart'y serwisów

### Jak uruchomić?

```bash
docker-compose up -d
```

### Architektura:
```
┌──────────────────────────┐      ┌──────────────────────────┐
│  Container: frontend     │      │  Container: backend      │
│  ┌────────────────────┐  │      │  ┌────────────────────┐  │
│  │ Nginx (port 80)    │  │      │  │ FastAPI (port 8000)│  │
│  │ Frontend files     │  │      │  │ Python app         │  │
│  │ Proxy → backend:8000│─┼──────┼─→│                    │  │
│  └────────────────────┘  │      │  └────────────────────┘  │
└──────────────────────────┘      └──────────────────────────┘
           │                                    │
           └────────────────┬───────────────────┘
                     Docker Network
                      (app-network)
```

### Pliki:
- `docker-compose.yml`
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `frontend/nginx-multi-container.conf` → proxy do `backend:8000`

---

## 🖥️ Opcja 3: Local Development (bez Dockera)

**Backend i Frontend uruchamiane lokalnie**

### Kiedy użyć?
- ✅ Development
- ✅ Debugging z IDE
- ✅ Szybkie iteracje
- ✅ Nie masz Dockera

### Jak uruchomić?

```bash
./start.sh
```

### Architektura:
```
Frontend (Vite dev server)    Backend (Uvicorn)
    http://localhost:5173  →  http://localhost:8000
```

### Pliki:
- `start.sh`
- `stop.sh`
- `.env`

---

## 📊 Porównanie

| Feature | Single Container | Multi-Container | Local Dev |
|---------|-----------------|-----------------|-----------|
| **Łatwość wdrożenia** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Zużycie zasobów** | 🟢 Niskie | 🟡 Średnie | 🟢 Niskie |
| **Skalowanie** | 🟡 Średnie | 🟢 Dobre | 🔴 Nie dotyczy |
| **Debugging** | 🟡 Średnie | 🟢 Łatwe | 🟢 Bardzo łatwe |
| **Produkcja** | ✅ Zalecane | ⚠️ OK | ❌ Nie |
| **Development** | ⚠️ OK | ✅ Zalecane | ✅ Zalecane |

---

## 🚀 Przenoszenie między środowiskami

### Scenario 1: Development → Production

**Development (local)**:
```bash
./start.sh
# Test na http://localhost:5173
```

**Production (single container)**:
```bash
# Build i push
./docker-build-and-push.sh

# Na serwerze produkcyjnym
docker pull dunczyk/generator-napisow:latest
docker run -d -p 80:80 -e TRANSCRIPTION_API_KEY=key dunczyk/generator-napisow
```

### Scenario 2: Testowanie Multi-Container → Single Container

**Test multi-container**:
```bash
docker-compose up -d
# Frontend: http://localhost:8080
# Backend: http://localhost:8000
```

**Deploy single-container**:
```bash
docker-compose -f docker-compose-single.yml up -d
# Wszystko: http://localhost
```

---

## 🔍 Jak sprawdzić co używam?

### Jeśli masz już uruchomione kontenery:

```bash
# Lista kontenerów
docker ps

# Jeśli widzisz 1 kontener "subtitle-generator" → Single Container
# Jeśli widzisz 2 kontenery "frontend" i "backend" → Multi-Container
```

### Sprawdź nginx config:
```bash
# Single container
docker exec subtitle-generator cat /etc/nginx/nginx.conf | grep proxy_pass
# Output: http://localhost:8000  ← Single

# Multi container
docker exec frontend cat /etc/nginx/nginx.conf | grep proxy_pass
# Output: http://backend:8000  ← Multi
```

---

## ❓ FAQ

### Q: Który wybrać dla produkcji?
**A**: Single Container (`dunczyk/generator-napisow:latest`) - prosty, wydajny, łatwy w zarządzaniu.

### Q: Mogę zmienić z multi na single?
**A**: Tak! Zatrzymaj multi-container (`docker-compose down`) i uruchom single-container.

### Q: Który jest szybszy?
**A**: Single container ma mniejszy overhead (brak dodatkowej sieci Docker), ale różnice są minimalne.

### Q: Co jeśli chcę skalować frontend i backend osobno?
**A**: Użyj multi-container + Docker Swarm/Kubernetes lub load balancer.

### Q: Localhost vs backend - co to zmienia?
**A**:
- `localhost:8000` - backend jest w tym samym kontenerze (single)
- `backend:8000` - backend jest w osobnym kontenerze (multi)

---

## 📝 Wybór szybki:

**Chcę szybko wdrożyć na serwerze:** → Single Container + DockerHub
**Chcę rozwijać aplikację lokalnie:** → Local Development (`./start.sh`)
**Chcę testować w Dockerze przed produkcją:** → Multi-Container (`docker-compose up`)

---

## 🆘 Pomoc

Więcej informacji:
- Single Container: `DOCKER-QUICKSTART.md`
- Multi Container: `docker-compose.yml`
- Local Dev: `README.md` (Development section)
