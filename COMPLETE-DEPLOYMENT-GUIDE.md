# 🚀 Kompletny Przewodnik Wdrożenia
## Od Zbudowania Obrazu do Uruchomienia w Nowej Lokalizacji

---

## CZĘŚĆ 1: Budowanie i Publikacja Obrazu (NA TWOJEJ MASZYNIE)

### Krok 1: Uruchom Docker Desktop
1. Otwórz Docker Desktop
2. Poczekaj aż w lewym dolnym rogu pojawi się "Engine running"

### Krok 2: Zaloguj się do DockerHub
```bash
docker login -u dunczyk
```
Podaj hasło gdy zostaniesz poproszony.

### Krok 3: Przejdź do katalogu projektu
```bash
cd /Users/bartek/Developer/GeneratorNapisow
```

### Krok 4: Zbuduj i opublikuj obraz
```bash
./docker-build-and-push.sh
```

**To zajmie 5-10 minut.** Skrypt automatycznie:
- Zbuduje obraz dla linux/amd64
- Opublikuje jako `dunczyk/generator-napisow:latest`
- Opublikuje jako `dunczyk/generator-napisow:v1.1.0`

### Krok 5: Weryfikacja
Po zakończeniu sprawdź:
```bash
# Lokalnie
docker images | grep generator-napisow

# W przeglądarce
https://hub.docker.com/r/dunczyk/generator-napisow
```

✅ **Obraz jest teraz publicznie dostępny na DockerHub!**

---

## CZĘŚĆ 2: Wdrożenie w Nowej Lokalizacji (NA NOWYM SERWERZE)

### Wymagania na nowym serwerze:
- ✅ Linux (Ubuntu 20.04+, Debian 11+, CentOS 8+)
- ✅ Docker zainstalowany
- ✅ Porty 80 i 8000 dostępne
- ✅ OpenAI API Key

---

### Opcja A: Szybkie Uruchomienie (Jednoliniowy)

#### Krok 1: Zainstaluj Docker (jeśli nie ma)
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Weryfikacja
docker --version
```

#### Krok 2: Uruchom kontener
```bash
docker run -d \
  --name subtitle-generator \
  -p 80:80 \
  -p 8000:8000 \
  -e TRANSCRIPTION_API_KEY="sk-proj-TWOJ-KLUCZ-TUTAJ" \
  -e TRANSCRIPTION_API_URL="https://api.openai.com/v1" \
  -e TRANSCRIPTION_MODEL="whisper-1" \
  -v $(pwd)/data/uploads:/app/uploads \
  -v $(pwd)/data/temp:/app/temp \
  -v $(pwd)/data/output:/app/output \
  --restart unless-stopped \
  dunczyk/generator-napisow:latest
```

**WAŻNE:** Zamień `sk-proj-TWOJ-KLUCZ-TUTAJ` na prawdziwy klucz API!

#### Krok 3: Sprawdź czy działa
```bash
# Sprawdź czy kontener działa
docker ps

# Sprawdź logi
docker logs subtitle-generator

# Sprawdź health
curl http://localhost/health

# Sprawdź API
curl http://localhost:8000/api/health
```

#### Krok 4: Otwórz w przeglądarce
```
http://IP-TWOJEGO-SERWERA
```

✅ **GOTOWE! Aplikacja działa!**

---

### Opcja B: Wdrożenie z Docker Compose (Zalecane dla produkcji)

#### Krok 1: Utwórz katalog projektu
```bash
mkdir -p ~/subtitle-generator
cd ~/subtitle-generator
```

#### Krok 2: Utwórz plik .env
```bash
cat > .env << 'EOF'
# OpenAI API Configuration
TRANSCRIPTION_API_KEY=sk-proj-TWOJ-KLUCZ-TUTAJ
TRANSCRIPTION_API_URL=https://api.openai.com/v1
TRANSCRIPTION_MODEL=whisper-1

# CORS Origins (opcjonalne)
FRONTEND_ORIGINS=http://localhost,http://localhost:5173
EOF
```

**WAŻNE:** Edytuj plik i zamień `sk-proj-TWOJ-KLUCZ-TUTAJ`:
```bash
nano .env
# lub
vim .env
```

#### Krok 3: Utwórz docker-compose.yml
```bash
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  subtitle-generator:
    image: dunczyk/generator-napisow:latest
    container_name: subtitle-generator
    ports:
      - "80:80"
      - "8000:8000"
    environment:
      - TRANSCRIPTION_API_KEY=${TRANSCRIPTION_API_KEY}
      - TRANSCRIPTION_API_URL=${TRANSCRIPTION_API_URL:-https://api.openai.com/v1}
      - TRANSCRIPTION_MODEL=${TRANSCRIPTION_MODEL:-whisper-1}
      - FRONTEND_ORIGINS=${FRONTEND_ORIGINS:-http://localhost}
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

    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
EOF
```

#### Krok 4: Uruchom aplikację
```bash
# Zainstaluj docker-compose jeśli nie ma
sudo apt-get update && sudo apt-get install -y docker-compose

# Uruchom
docker-compose up -d

# Sprawdź status
docker-compose ps

# Zobacz logi
docker-compose logs -f
```

#### Krok 5: Weryfikacja
```bash
# Health check
curl http://localhost/health

# API status
curl http://localhost:8000/api/health

# Otwórz w przeglądarce
echo "http://$(curl -s ifconfig.me)"
```

✅ **Aplikacja działa z docker-compose!**

---

## CZĘŚĆ 3: Zarządzanie Aplikacją

### Podstawowe komendy

#### Zatrzymanie
```bash
# Opcja A (docker run)
docker stop subtitle-generator

# Opcja B (docker-compose)
docker-compose stop
```

#### Uruchomienie ponownie
```bash
# Opcja A
docker start subtitle-generator

# Opcja B
docker-compose start
```

#### Restart
```bash
# Opcja A
docker restart subtitle-generator

# Opcja B
docker-compose restart
```

#### Logi
```bash
# Opcja A - wszystkie logi
docker logs subtitle-generator

# Opcja A - logi na żywo
docker logs -f subtitle-generator

# Opcja A - backend logs
docker exec subtitle-generator tail -f /var/log/supervisor/backend.log

# Opcja A - nginx logs
docker exec subtitle-generator tail -f /var/log/supervisor/nginx.log

# Opcja B
docker-compose logs -f
```

#### Aktualizacja do nowej wersji
```bash
# Pull najnowszego obrazu
docker pull dunczyk/generator-napisow:latest

# Opcja A
docker stop subtitle-generator
docker rm subtitle-generator
# Następnie uruchom ponownie komendą docker run z Krok 2

# Opcja B
docker-compose pull
docker-compose up -d
```

#### Usunięcie
```bash
# Opcja A
docker stop subtitle-generator
docker rm subtitle-generator

# Opcja B
docker-compose down

# Usuń również dane (UWAGA: traci pliki!)
docker-compose down -v
rm -rf data/
```

---

## CZĘŚĆ 4: Konfiguracja Produkcyjna

### 1. Firewall
```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 2. SSL/HTTPS z Nginx Proxy Manager (Zalecane)

#### Zainstaluj Nginx Proxy Manager
```bash
cat > docker-compose-proxy.yml << 'EOF'
version: '3.8'

services:
  nginx-proxy-manager:
    image: jc21/nginx-proxy-manager:latest
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "81:81"  # Admin panel
    volumes:
      - ./proxy-data:/data
      - ./letsencrypt:/etc/letsencrypt
EOF

docker-compose -f docker-compose-proxy.yml up -d
```

#### Konfiguracja:
1. Otwórz: `http://IP-SERWERA:81`
2. Login: `admin@example.com` / `changeme`
3. Zmień hasło
4. Dodaj Proxy Host:
   - Domain: `twoja-domena.pl`
   - Forward to: `subtitle-generator` port `80`
   - Włącz SSL (Let's Encrypt)

### 3. SSL/HTTPS z Traefik

```bash
# Plik traefik/docker-compose.yml
cat > docker-compose-traefik.yml << 'EOF'
version: '3.8'

services:
  traefik:
    image: traefik:v2.10
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.email=twoj@email.pl"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
      - "./letsencrypt:/letsencrypt"

  subtitle-generator:
    image: dunczyk/generator-napisow:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.subtitle-gen.rule=Host(`subtitle.twoja-domena.pl`)"
      - "traefik.http.routers.subtitle-gen.entrypoints=websecure"
      - "traefik.http.routers.subtitle-gen.tls.certresolver=letsencrypt"
    environment:
      - TRANSCRIPTION_API_KEY=${TRANSCRIPTION_API_KEY}
    volumes:
      - ./data:/app/uploads
    restart: unless-stopped
EOF
```

### 4. Backup danych
```bash
# Utwórz skrypt backup.sh
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup/subtitle-generator"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Backup danych
tar -czf "$BACKUP_DIR/data_$DATE.tar.gz" data/

# Backup konfiguracji
cp .env "$BACKUP_DIR/env_$DATE"
cp docker-compose.yml "$BACKUP_DIR/docker-compose_$DATE.yml"

# Usuń backupy starsze niż 7 dni
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/data_$DATE.tar.gz"
EOF

chmod +x backup.sh

# Dodaj do crontab (codziennie o 2:00)
(crontab -l 2>/dev/null; echo "0 2 * * * /home/$USER/subtitle-generator/backup.sh") | crontab -
```

### 5. Monitoring
```bash
# Zainstaluj ctop (top dla kontenerów)
sudo wget https://github.com/bcicen/ctop/releases/download/v0.7.7/ctop-0.7.7-linux-amd64 -O /usr/local/bin/ctop
sudo chmod +x /usr/local/bin/ctop

# Uruchom
ctop

# Albo Docker stats
docker stats subtitle-generator
```

---

## CZĘŚĆ 5: Troubleshooting

### Problem: Kontener nie startuje
```bash
# Sprawdź logi
docker logs subtitle-generator

# Sprawdź czy porty są zajęte
sudo netstat -tulpn | grep ':80\|:8000'

# Sprawdź czy Docker działa
systemctl status docker
```

### Problem: Brak dostępu do aplikacji
```bash
# Sprawdź czy kontener działa
docker ps | grep subtitle-generator

# Sprawdź health
curl http://localhost/health

# Sprawdź firewall
sudo ufw status
```

### Problem: "413 Payload Too Large"
To już naprawione w v1.1.0 (MP3 compression), ale jeśli dalej występuje:
```bash
# Zwiększ limity w nginx
docker exec subtitle-generator sed -i 's/client_max_body_size.*/client_max_body_size 2048m;/' /etc/nginx/nginx.conf
docker restart subtitle-generator
```

### Problem: Wolna transkrypcja
- Sprawdź czy API key jest poprawny
- Sprawdź połączenie z internetem
- Zobacz logi: `docker logs subtitle-generator | grep -i "transcription"`

---

## CZĘŚĆ 6: Zmienne Środowiskowe

### Wymagane:
```bash
TRANSCRIPTION_API_KEY=sk-proj-TWOJ-KLUCZ    # OpenAI API key
TRANSCRIPTION_API_URL=https://api.openai.com/v1
TRANSCRIPTION_MODEL=whisper-1
```

### Opcjonalne:
```bash
FRONTEND_ORIGINS=http://localhost,http://twoja-domena.pl
PUBLIC_API_BASE=https://twoja-domena.pl  # Dla custom domain
```

---

## CZĘŚĆ 7: Checklist Wdrożenia

### Przed wdrożeniem:
- [ ] Docker zainstalowany na serwerze
- [ ] Porty 80 i 8000 dostępne
- [ ] Mam OpenAI API key
- [ ] Domena skonfigurowana (opcjonalnie)

### Wdrożenie:
- [ ] Obraz zbudowany i opublikowany na DockerHub
- [ ] Utworzony katalog projektu
- [ ] Utworzony plik .env z API key
- [ ] Uruchomiony kontener
- [ ] Sprawdzony health check
- [ ] Przetestowana aplikacja w przeglądarce

### Po wdrożeniu:
- [ ] Skonfigurowany firewall
- [ ] Skonfigurowany SSL (jeśli produkcja)
- [ ] Ustawiony backup
- [ ] Ustawiony monitoring
- [ ] Udokumentowane dane dostępowe

---

## 📞 Szybka Pomoc

### Jednolinijkowy deployment:
```bash
docker run -d --name subtitle-generator -p 80:80 -e TRANSCRIPTION_API_KEY="twoj-klucz" --restart unless-stopped dunczyk/generator-napisow:latest
```

### Sprawdź czy działa:
```bash
curl http://localhost/health && echo " ✓ OK" || echo " ✗ ERROR"
```

### Najczęstsze problemy:
1. **Port zajęty** → Zmień port: `-p 8080:80`
2. **Brak API key** → Dodaj: `-e TRANSCRIPTION_API_KEY="klucz"`
3. **Kontener nie działa** → Zobacz logi: `docker logs subtitle-generator`

---

## 🎉 Sukces!

Jeśli widzisz stronę na `http://IP-SERWERA`, aplikacja działa poprawnie!

**Następne kroki:**
1. Wgraj testowe wideo
2. Wygeneruj transkrypcję
3. Pobierz plik SRT
4. Skonfiguruj SSL dla produkcji
5. Ustaw backup

**Linki:**
- DockerHub: https://hub.docker.com/r/dunczyk/generator-napisow
- GitHub: (twój repo)
