# 🎬 Generator Napisów - Instrukcja Instalacji

Generator napisów wideo z wykorzystaniem transkrypcji AI (OpenAI Whisper).

---

## 📋 Wymagania

Przed rozpoczęciem upewnij się, że masz:

1. **Serwer z Linuxem** (Ubuntu 20.04+, Debian 11+, CentOS 8+) lub komputer z Dockerem
2. **Docker** zainstalowany (instrukcja instalacji poniżej)
3. **OpenAI API Key** - uzyskaj na: https://platform.openai.com/api-keys
4. **Wolne porty**: 80 (dla aplikacji webowej)

---

## 🚀 Instalacja Krok po Kroku

### Krok 1: Zainstaluj Docker (jeśli jeszcze nie masz)

#### Na Ubuntu/Debian:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker
```

#### Weryfikacja:
```bash
docker --version
```
Powinno wyświetlić wersję Dockera, np. `Docker version 24.0.7`

---

### Krok 2: Uruchom Aplikację

#### Opcja A: Szybkie Uruchomienie (Jedna Komenda) ⚡

```bash
docker run -d \
  --name subtitle-generator \
  -p 80:80 \
  -e TRANSCRIPTION_API_KEY="TWOJ-OPENAI-API-KEY" \
  -v $(pwd)/subtitle-data/uploads:/app/uploads \
  -v $(pwd)/subtitle-data/temp:/app/temp \
  -v $(pwd)/subtitle-data/output:/app/output \
  --restart unless-stopped \
  dunczyk/generator-napisow:latest
```

**⚠️ WAŻNE:** Zamień `TWOJ-OPENAI-API-KEY` na prawdziwy klucz API!

---

#### Opcja B: Uruchomienie z Docker Compose (Zalecane) 🔧

##### 1. Utwórz katalog dla aplikacji:
```bash
mkdir -p ~/subtitle-generator
cd ~/subtitle-generator
```

##### 2. Utwórz plik konfiguracyjny `.env`:
```bash
nano .env
```

Wklej następującą zawartość (zamień `TWOJ-OPENAI-API-KEY` na prawdziwy klucz):
```bash
# OpenAI API Configuration
TRANSCRIPTION_API_KEY=TWOJ-OPENAI-API-KEY
TRANSCRIPTION_API_URL=https://api.openai.com/v1
TRANSCRIPTION_MODEL=whisper-1
```

Zapisz plik (`Ctrl+X`, potem `Y`, potem `Enter`).

##### 3. Utwórz plik `docker-compose.yml`:
```bash
nano docker-compose.yml
```

Wklej następującą zawartość:
```yaml
version: '3.8'

services:
  subtitle-generator:
    image: dunczyk/generator-napisow:latest
    container_name: subtitle-generator
    ports:
      - "80:80"
    environment:
      - TRANSCRIPTION_API_KEY=${TRANSCRIPTION_API_KEY}
      - TRANSCRIPTION_API_URL=${TRANSCRIPTION_API_URL:-https://api.openai.com/v1}
      - TRANSCRIPTION_MODEL=${TRANSCRIPTION_MODEL:-whisper-1}
    volumes:
      - ./data/uploads:/app/uploads
      - ./data/temp:/app/temp
      - ./data/output:/app/output
      - ./data/logs:/var/log/supervisor
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

Zapisz plik (`Ctrl+X`, potem `Y`, potem `Enter`).

##### 4. Uruchom aplikację:
```bash
docker-compose up -d
```

---

### Krok 3: Sprawdź czy działa ✅

#### Sprawdź status kontenera:
```bash
docker ps
```

Powinieneś zobaczyć kontener `subtitle-generator` ze statusem `Up`.

#### Sprawdź logi:
```bash
docker logs subtitle-generator
```

Lub dla docker-compose:
```bash
docker-compose logs
```

#### Test połączenia:
```bash
curl http://localhost/health
```

Powinno zwrócić: `{"status":"ok"}`

---

### Krok 4: Otwórz Aplikację w Przeglądarce 🌐

#### Jeśli instalujesz lokalnie:
```
http://localhost
```

#### Jeśli instalujesz na serwerze:
```
http://IP-TWOJEGO-SERWERA
```

Aby znaleźć IP serwera:
```bash
curl ifconfig.me
```

---

## 🎯 Jak Korzystać z Aplikacji

1. **Wgraj wideo** - kliknij przycisk upload i wybierz plik wideo
2. **Generuj transkrypcję** - aplikacja automatycznie wyśle audio do OpenAI Whisper
3. **Edytuj napisy** (opcjonalnie) - dostosuj tekst, rozmiar, kolor, pozycję
4. **Pobierz plik SRT** - otrzymasz plik z napisami do użycia w odtwarzaczach wideo

---

## 🔧 Zarządzanie Aplikacją

### Zatrzymanie aplikacji:
```bash
# Dla docker run:
docker stop subtitle-generator

# Dla docker-compose:
docker-compose stop
```

### Uruchomienie ponownie:
```bash
# Dla docker run:
docker start subtitle-generator

# Dla docker-compose:
docker-compose start
```

### Restart:
```bash
# Dla docker run:
docker restart subtitle-generator

# Dla docker-compose:
docker-compose restart
```

### Wyświetl logi na żywo:
```bash
# Dla docker run:
docker logs -f subtitle-generator

# Dla docker-compose:
docker-compose logs -f
```

### Aktualizacja do nowej wersji:
```bash
# Pobierz najnowszy obraz
docker pull dunczyk/generator-napisow:latest

# Dla docker run - usuń stary kontener i uruchom nowy:
docker stop subtitle-generator
docker rm subtitle-generator
# Następnie uruchom ponownie komendą z Kroku 2

# Dla docker-compose:
docker-compose pull
docker-compose up -d
```

### Usunięcie aplikacji:
```bash
# Dla docker run:
docker stop subtitle-generator
docker rm subtitle-generator

# Dla docker-compose:
docker-compose down

# Usuń również dane (UWAGA: usunie wszystkie pliki!):
rm -rf data/
```

---

## ❓ Najczęstsze Problemy

### Problem: "Cannot connect to the Docker daemon"
**Rozwiązanie:** Docker nie jest uruchomiony. Uruchom:
```bash
sudo systemctl start docker
```

### Problem: "port is already allocated"
**Rozwiązanie:** Port 80 jest zajęty. Zmień port w komendzie:
```bash
# Zamiast -p 80:80 użyj:
-p 8080:80

# Wtedy aplikacja będzie dostępna na http://localhost:8080
```

### Problem: "Error code: 401" podczas transkrypcji
**Rozwiązanie:** Nieprawidłowy API key. Sprawdź:
1. Czy API key jest poprawny (skopiuj ponownie z https://platform.openai.com/api-keys)
2. Czy w .env nie ma spacji przed lub po kluczu
3. Zrestartuj kontener po zmianie .env

### Problem: Kontener nie startuje
**Rozwiązanie:** Sprawdź logi:
```bash
docker logs subtitle-generator
```

### Problem: "413 Payload Too Large"
**Rozwiązanie:** To zostało naprawione w wersji v1.1.0. Zaktualizuj obraz:
```bash
docker pull dunczyk/generator-napisow:latest
```

---

## 🔒 Konfiguracja Produkcyjna (Opcjonalnie)

### Firewall (Ubuntu):
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Backup danych:
```bash
# Utwórz backup plików:
tar -czf subtitle-backup-$(date +%Y%m%d).tar.gz data/

# Przywróć z backupu:
tar -xzf subtitle-backup-20240101.tar.gz
```

---

## 📊 Wymagania Systemowe

| Komponent | Minimalne | Zalecane |
|-----------|-----------|----------|
| **RAM** | 1 GB | 2 GB |
| **CPU** | 1 core | 2 cores |
| **Dysk** | 2 GB | 10 GB+ (dla przechowywania wideo) |
| **System** | Linux (Ubuntu 20.04+) | Ubuntu 22.04 LTS |

---

## 🔗 Linki

- **Obraz Docker**: https://hub.docker.com/r/dunczyk/generator-napisow
- **OpenAI API Keys**: https://platform.openai.com/api-keys
- **Docker Installation**: https://docs.docker.com/engine/install/

---

## 💰 Koszty

- **Aplikacja**: Darmowa
- **Docker**: Darmowy
- **OpenAI API**: Płatne (~$0.006 za minutę audio dla Whisper)
  - Przykład: 60 minut audio ≈ $0.36

---

## 📞 Pomoc

Jeśli masz problemy:
1. Sprawdź logi: `docker logs subtitle-generator`
2. Sprawdź czy Docker działa: `docker ps`
3. Sprawdź czy port 80 jest wolny: `sudo netstat -tulpn | grep :80`

---

## ✨ Gotowe!

Aplikacja jest teraz zainstalowana i gotowa do użycia! 🎉

Otwórz przeglądarkę i zacznij generować napisy dla swoich wideo.
