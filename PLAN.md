# PLAN – SelfRemote (TeamViewer-Nachbau)

Stand: 2026-09-01
Hinweis: "Vorhanden" = existiert laut Commit-Verlauf; ob logiktechnisch vollständig, wird unter Punkt 1 verifiziert.

## Bereits vorhanden (im main-Branch)
- [x] README mit Architektur-Übersicht und Roadmap
- [x] Root package.json mit Start-Skript
- [x] Node.js-Signaling-Server (WebSocket via `ws` + Static-File-Serving)
- [x] Abhängigkeit `ws` für WebSocket-Signaling
- [x] Landing-, Host- und Gast-UI (index.html)
- [x] Dunkles UI-Theme (style.css)
- [x] WebRTC-Session mit Signaling (rtc.js)
- [x] Fernsteuerung – Eingabe erfassen & anwenden (controls.js)
- [x] App-Logik für Host & Gast (app.js)
- [x] PLAN.md

## Noch offen (in dieser Reihenfolge)
- [x] 1a. **API-Fixes**: RTCSessionDescription → modern API
- [x] 1b. **Error Handling**: DataChannel + Answer + Stream fallback
- [x] 1c. **Docker Setup**: Dockerfile + docker-compose.yml + DOCKER.md
- [ ] 1d. End-to-End Test durchführen (Browser, Docker-Container)
- [ ] 1e. Koordinaten-Mapping verifizieren & ggf. debuggen
- [ ] 2. Session-Verwaltung: Einladungscode / Raum-ID (wie TeamViewer-ID)
- [ ] 3. End-to-End-Verschlüsselung (DTLS/SRTP prüfen, ggf. zus. Schicht)
- [ ] 4. Audio-Übertragung
- [ ] 5. Dateitransfer
- [ ] 6. Client-UI polieren (Host-Seite + Viewer-Seite)
- [ ] 7. Dokumentation & Quickstart (Start-Befehle, Architektur-Details, Browser-Kompatibilität)
- [ ] 8. Tests / CI
