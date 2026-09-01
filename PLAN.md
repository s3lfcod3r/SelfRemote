# PLAN – SelfRemote (TeamViewer-Nachbau)

Stand: 2026-09-01

## Bereits fertig (im main-Branch)
- [x] README mit Architektur-Übersicht und Roadmap
- [x] Root package.json mit Start-Skript
- [x] Node.js-Signaling-Server (WebSocket via `ws` + Static-File-Serving)
- [x] Abhängigkeit `ws` für WebSocket-Signaling

## Noch offen (in dieser Reihenfolge)
- [ ] 1. WebRTC-Peer-Connection Host<->Viewer, an den bestehenden WS-Signaling-Server angebunden
- [ ] 2. Host-Seite: Bildschirm-Capture via getDisplayMedia
- [ ] 3. Viewer-Seite: Rendering des Remote-Videos
- [ ] 4. Remote-Steuerung: Maus-Events Viewer -> Host
- [ ] 5. Remote-Steuerung: Tastatur-Events Viewer -> Host
- [ ] 6. Session-Verwaltung: Einladungscode (wie TeamViewer-ID)
- [ ] 7. End-to-End-Verschlüsselung (DTLS/SRTP prüfen, ggf. zus. Schicht)
- [ ] 8. Audio-Übertragung
- [ ] 9. Dateitransfer
- [ ] 10. Client-UI polieren (Host-Seite + Viewer-Seite)
- [ ] 11. Dokumentation & Quickstart (Befehle, Architektur-Details)
- [ ] 12. Tests / CI
