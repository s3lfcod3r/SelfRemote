# Docker Setup für SelfRemote

## Quick Start

### 1. Mit Docker Compose (empfohlen)
```bash
# Build & Start
docker-compose up -d

# Logs anschauen
docker-compose logs -f

# Stoppen
docker-compose down
```

### 2. Manual mit Docker
```bash
# Build
docker build -t selfremote:latest .

# Run
docker run -d \
  --name selfremote \
  -p 3000:3000 \
  selfremote:latest

# Logs
docker logs -f selfremote

# Stop
docker stop selfremote
docker rm selfremote
```

## URL
Browser öffnen: **http://localhost:3000**

## Umgebungsvariablen
- `NODE_ENV`: production (default)
- `PORT`: 3000 (default)

## Image-Größe
- Base: `node:20-slim` (~180MB)
- Mit Dependencies: ~200-210MB

## Netzwerk-Hinweise
- Port 3000 muss erreichbar sein (WebSocket + HTTP)
- Für externe Verbindungen: Reverse Proxy (nginx) empfohlen
- STUN-Server sind external (Google STUN)

## Production-Readiness
Für Production zusätzlich überlegen:
- [ ] Reverse Proxy (nginx/caddy) für HTTPS
- [ ] Environment-Secrets (.env)
- [ ] Logging-Setup (stdout/file)
- [ ] Rate Limiting
- [ ] Session-Cleanup Job
