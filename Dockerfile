# SelfRemote – WebRTC Remote Desktop
# Multi-stage build für optimierte Image-Größe

FROM node:20-slim

# Metadaten
LABEL maintainer="s3lfcod3r"
LABEL description="SelfRemote – TeamViewer-ähnliche App via WebRTC"

WORKDIR /app

# Dependencies kopieren & installieren
COPY package*.json ./
RUN npm ci --only=production

# Source kopieren
COPY . .

# Server läuft auf Port 3000
EXPOSE 3000

# Health Check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Starte Server
CMD ["node", "server/index.js"]
