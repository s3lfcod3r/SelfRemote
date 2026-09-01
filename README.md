# SelfRemote

Ein Web-basiertes Remote-Desktop-Tool – TeamViewer, aber im Browser.

## Features (v0.1)

- 🖥️ **Screen-Sharing** via WebRTC (Peer-to-Peer)
- 🖱️ **Fernsteuerung** – Maus & Tastatur vom Gast auf dem Host
- 🔑 **ID-basierte Verbindung** – Host bekommt eine ID, Gast verbindet sich damit
- 📦 **Keine Installation** – läuft komplett im Browser
- 📡 **Signaling-Server** – Node.js + WebSocket (nur für Verbindungsaufbau)

## Architektur

```
┌─────────────┐         WebSocket          ┌──────────────┐
│   HOST      │◄──────────────────────────►│  SIGNALLING  │
│  (Browser)  │         (SDP, ICE)         │   SERVER     │
│             │                            │  (Node.js)   │
│  Screen     │         WebRTC             │              │
│  Capture ───┼──────────────────────────►├──────────────┤
│             │         (Media + Data)     │              │
│             │◄──────────────────────────►├──────────────┤
│  Input      │         (Mouse/Keys)       │              │
│  Listener ──┼──────────────────────────►│              │
└─────────────┘                            │              │
                                           │              │
┌─────────────┐         WebSocket          │              │
│   GAST      │◄──────────────────────────►└──────────────┘
│  (Browser)  │         (SDP, ICE)
│  Viewer +   │
│  Controls   │
└─────────────┘
```

**Prinzip:** Der Signaling-Server vermittelt nur die Verbindung (SDP Offers/Answers, ICE Candidates). Der eigentliche Datenstrom (Video + Eingaben) läuft **Peer-to-Peer** via WebRTC – ohne über den Server.

## Schnellstart

### Voraussetzungen
- Node.js ≥ 18
- Moderne Browser (Chrome, Edge, Firefox) – **HTTPS oder localhost** erforderlich (wegen `getDisplayMedia`)

### Installation & Start

```bash
git clone https://github.com/s3lfcod3r/SelfRemote.git
cd SelfRemote
npm install
npm start
```

Der Server startet auf **http://localhost:3000**

### Nutzung

1. **Host** öffnet die Seite → klickt auf „Host starten" → bekommt eine **Verbindungs-ID**
2. **Gast** öffnet die Seite → klickt auf „Verbinden" → gibt die ID ein
3. Host wird gefragt, welchen Bildschirm/Tab er teilen will
4. Gast sieht den Screen und kann Maus + Tastatur fernsteuern

## Projektstruktur

```
SelfRemote/
├── server/
│   ├── index.js          # Signaling-Server (Node.js + ws)
│   └── package.json
├── client/
│   ├── index.html        # Haupt-UI
│   ├── css/
│   │   └── style.css     # Styling
│   └── js/
│       ├── app.js        # App-Logik (Modi, Verbindungs-ID)
│       ├── rtc.js        # WebRTC-Setup (Offer/Answer, ICE)
│       └── controls.js   # Maus-/Tastatur-Event-Capture & -Forwarding
├── package.json          # Root (skripte)
└── README.md
```

## Roadmap

- [x] v0.1 – Basis: Screen-Sharing + Fernsteuerung (Web)
- [ ] v0.2 – Audio-Sharing
- [ ] v0.3 – Dateitransfer über Data Channel
- [ ] v0.4 – Android-Client (Screen Capture via MediaProjection)
- [ ] v0.5 – End-to-End-Verschlüsselung (DTLS-SRTP + eigene Keys)
- [ ] v0.6 – Mehrere Bildschirme / Tab-Auswahl
- [ ] v0.7 – Session-Aufzeichnung
- [ ] v0.8 – Mobile Web-Client (Touch → Maus-Events)

## Tech-Stack

| Komponente   | Technologie              |
|-------------|--------------------------|
| Signaling   | Node.js, `ws` (WebSocket) |
| Video-Stream| WebRTC (`getDisplayMedia`) |
| Fernsteuerung | WebRTC Data Channel    |
| Client-UI   | Vanilla JS, HTML5, CSS   |
| Transport   | Peer-to-Peer (STUN/TURN) |

## Lizenz

MIT
