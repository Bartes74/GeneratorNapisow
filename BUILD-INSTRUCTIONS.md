# Instrukcje budowania i publikowania obrazu Docker

## Konto DockerHub: `dunczyk`

---

## Szybki start (Recommended)

### 1. Uruchom Docker Desktop
Upewnij się, że Docker Desktop jest uruchomiony.

### 2. Zaloguj się do DockerHub
```bash
docker login -u dunczyk
```
Podaj hasło gdy zostaniesz poproszony.

### 3. Zbuduj i opublikuj obraz
```bash
./docker-build-and-push.sh
```

To automatycznie:
- ✅ Sprawdzi czy Docker działa
- ✅ Sprawdzi czy jesteś zalogowany
- ✅ Zbuduje obraz dla linux/amd64
- ✅ Opublikuje obraz jako:
  - `dunczyk/generator-napisow:latest`
  - `dunczyk/generator-napisow:v1.1.0`

---

## Weryfikacja

Po zakończeniu build, sprawdź czy obraz jest dostępny:

```bash
# Sprawdź lokalnie
docker images | grep generator-napisow

# Sprawdź na DockerHub (w przeglądarce)
https://hub.docker.com/r/dunczyk/generator-napisow
```

---

## Testowanie obrazu

### Pull i uruchom
```bash
# Pull z DockerHub
docker pull dunczyk/generator-napisow:latest

# Uruchom
docker run -d -p 80:80 \
  -e TRANSCRIPTION_API_KEY=your-api-key \
  --name test-subtitle-gen \
  dunczyk/generator-napisow:latest

# Sprawdź czy działa
curl http://localhost/health

# Zobacz logi
docker logs test-subtitle-gen

# Zatrzymaj i usuń
docker stop test-subtitle-gen
docker rm test-subtitle-gen
```

---

## Troubleshooting

### "Cannot connect to Docker daemon"
Uruchom Docker Desktop.

### "unauthorized: incorrect username or password"
Zaloguj się ponownie:
```bash
docker logout
docker login -u dunczyk
```

### "no builder instance found"
```bash
docker buildx create --name multiarch --use
```

### Build jest wolny
- Pierwsze budowanie zajmie 5-10 minut
- Kolejne buildy będą szybsze dzięki cache

---

## Aktualizacja obrazu

Gdy wprowadzisz zmiany w kodzie:

1. Zatwierdź zmiany w git (opcjonalnie)
2. Uruchom build:
   ```bash
   ./docker-build-and-push.sh
   ```
3. Obraz zostanie automatycznie nadpisany

---

## Zarządzanie tagami

Obecne tagi:
- `latest` - zawsze najnowsza wersja
- `v1.1.0` - konkretna wersja z optymalizacjami

Aby dodać nowy tag:
```bash
docker buildx build \
  --platform linux/amd64 \
  --tag dunczyk/generator-napisow:v1.2.0 \
  --push \
  .
```

---

## Informacje o obrazie

- **Repository**: https://hub.docker.com/r/dunczyk/generator-napisow
- **Wielkość**: ~1.2GB (zawiera Python, FFmpeg, Nginx)
- **Platforma**: linux/amd64
- **Base image**: python:3.13-slim
- **Zawiera**:
  - Backend FastAPI (Python)
  - Frontend React (built)
  - Nginx (reverse proxy)
  - FFmpeg (przetwarzanie wideo)
  - Supervisor (zarządzanie procesami)

---

## Co dalej?

Po opublikowaniu obrazu, inni mogą go używać:

```bash
docker pull dunczyk/generator-napisow:latest
docker run -d -p 80:80 -e TRANSCRIPTION_API_KEY=key dunczyk/generator-napisow
```

Dokumentacja dla użytkowników:
- `README.md` - Główna dokumentacja
- `DOCKER-QUICKSTART.md` - Szybki start
- `DOCKER.md` - Szczegółowa dokumentacja Docker
