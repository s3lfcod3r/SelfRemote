/**
 * SelfRemote – Signaling-Server
 * 
 * Vermittelt nur die WebRTC-Verbindung (SDP, ICE).
 * Der eigentliche Datenstrom läuft Peer-to-Peer.
 * Dient statisch auch der Client-UI.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const CLIENT_DIR = path.join(__dirname, '..', 'client');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// ─── Statischer Server ────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(CLIENT_DIR, decodeURIComponent(filePath));

  // Sicherheits-Check: nur Dateien aus client/
  if (!filePath.startsWith(CLIENT_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not Found');
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

// ─── WebSocket-Signaling ──────────────────────────────────────────────

const wss = new WebSocketServer({ server, path: '/ws' });

/**
 * Sessions: roomId → Map<peerId, WebSocket>
 * roomId ist die Verbindungs-ID (z.B. "SR-847261").
 */
const sessions = new Map();

wss.on('connection', (ws) => {
  let peerId = null;
  let roomId = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    // ── Peer meldet sich in einer Session an ──
    if (msg.type === 'join') {
      peerId = msg.peerId;
      roomId = msg.roomId;

      if (!sessions.has(roomId)) sessions.set(roomId, new Map());
      const room = sessions.get(roomId);
      room.set(peerId, ws);
      console.log(`[join] ${peerId} → ${roomId} (now ${room.size} peer(s))`);

      // Bestätigung an alle im Raum
      broadcast(roomId, { type: 'peer-joined', peerId });
      return;
    }

    // ── WebRTC-Signaling: Weiterleitung an den anderen Peer ──
    // (offer, answer, candidate)
    if (roomId) {
      const room = sessions.get(roomId);
      const target = room.get(msg.to);
      if (target && target.readyState === 1) {
        target.send(JSON.stringify({ ...msg, from: peerId }));
      }
    }
  });

  ws.on('close', () => {
    if (roomId) {
      const room = sessions.get(roomId);
      if (room) {
        room.delete(peerId);
        broadcast(roomId, { type: 'peer-left', peerId });
        if (room.size === 0) sessions.delete(roomId);
        console.log(`[left] ${peerId} ← ${roomId} (now ${room.size - 1} peer(s))`);
      }
    }
  });

  ws.on('error', (err) => {
    console.error('[ws-error]', err.message);
  });
});

function broadcast(roomId, msg) {
  const room = sessions.get(roomId);
  if (!room) return;
  const data = JSON.stringify(msg);
  for (const ws of room.values()) {
    if (ws.readyState === 1) ws.send(data);
  }
}

// ─── Start ────────────────────────────────────────────────────────────

server.listen(PORT, () => {
  console.log(`
  ┌─────────────────────────────────────────────┐
  │  SelfRemote – Signaling Server              │
  │  http://localhost:${String(PORT).padEnd(4)}                     │
  │  WebSocket:  ws://localhost:${String(PORT).padEnd(4)}/ws          │
  └─────────────────────────────────────────────┘
  `);
});
