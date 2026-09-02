/**
 * rtc.js – WebRTC-Session (Host & Gast)
 * Vermittelt über den SelfRemote-Signaling-Server (WebSocket) und
 * streamt afterwards Peer-to-Peer (Video + Data Channel für Eingaben).
 */

const PC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Für Verbindungen über verschiedene Netzwerke ggf. einen eigenen TURN eintragen:
    // { urls: 'turn:turn.example.com:3478', username: 'user', credential: 'pass' },
  ],
};

export class RtcSession {
  constructor(handlers = {}) {
    this.handlers = handlers; // { onStatus, onStream, onInput }
    this.ws = null;
    this.pc = null;
    this.dataChannel = null;
    this.stream = null;
    this.role = null;
    this.roomId = null;
    this.guestPresent = false;
    this.localOffer = null;
    this.remoteSet = false;
    this._iceQueue = [];
  }

  _status(text) { this.handlers.onStatus?.(text); }

  _send(msg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  _connectSignaling() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    this.ws = new WebSocket(`${proto}://${location.host}/ws`);
    this.ws.onclose = () => {
      if (this.pc) this._status('Verbindung zum Server verloren.');
    };
  }

  _addCandidate(c) {
    const add = () => this.pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
    if (this.remoteSet) add();
    else this._iceQueue.push(add);
  }

  _flushCandidates() {
    this.remoteSet = true;
    this._iceQueue.splice(0).forEach((f) => f());
  }

  _setupDataChannel(dc) {
    this.dataChannel = dc;
    if (this.role === 'host') {
      dc.onmessage = (e) => {
        let input;
        try { input = JSON.parse(e.data); } catch { return; }
        this.handlers.onInput?.(input);
      };
    } else {
      dc.onopen = () => this._status('Kontrollkanal offen – du kannst fernsteuern. 🎮');
    }
  }

  _sendOffer() {
    if (this.localOffer && this.guestPresent) {
      this._send({ type: 'offer', sdp: this.localOffer, to: 'guest' });
    }
  }

  // ── HOST ────────────────────────────────────────────────────────────
  host(roomId) {
    this.role = 'host';
    this.roomId = roomId;
    this._status('Warte auf Gast… Klicke auf „Teilen starten".');

    this.pc = new RTCPeerConnection(PC_CONFIG);
    this._setupDataChannel(this.pc.createDataChannel('control', { ordered: true }));

    this.pc.onicecandidate = (e) => {
      if (e.candidate) this._send({ type: 'candidate', candidate: e.candidate, to: 'guest' });
    };
    this.pc.onconnectionstatechange = () =>
      this._status('Verbindung: ' + this.pc.connectionState);

    this._connectSignaling();
    this.ws.onopen = () => this._send({ type: 'join', roomId, peerId: 'host' });
    this.ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      switch (msg.type) {
        case 'peer-joined':
          if (msg.peerId === 'guest') {
            this.guestPresent = true;
            this._status('Gast verbunden.');
            this._sendOffer();
          }
          break;
        case 'peer-left':
          if (msg.peerId === 'guest') {
            this.guestPresent = false;
            this._status('Gast getrennt.');
          }
          break;
        case 'request-offer':
          if (this.localOffer) this._sendOffer();
          else this._status('Bitte klicke auf „Teilen starten".');
          break;
        case 'answer':
          this.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
            .then(() => this._flushCandidates());
          break;
        case 'candidate':
          this._addCandidate(msg.candidate);
          break;
      }
    };
  }

  async startSharing() {
    if (this.role !== 'host' || this.stream) return;
    let stream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30, cursor: 'always' },
        audio: false,
      });
    } catch {
      this._status('Bildschirm-Freigabe abgebrochen.');
      return;
    }
    this.stream = stream;
    stream.getVideoTracks()[0].addEventListener('ended', () => {
      this._status('Screen-Sharing beendet.');
      this.close();
    });
    stream.getTracks().forEach((t) => this.pc.addTrack(t, stream));

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.localOffer = this.pc.localDescription;
    this._status('Screen wird geteilt. 🖥️');
    this._sendOffer();
  }

  // ── GAST ────────────────────────────────────────────────────────────
  guest(roomId) {
    this.role = 'guest';
    this.roomId = roomId;
    this._status('Verbinde…');

    this.pc = new RTCPeerConnection(PC_CONFIG);
    this.pc.ontrack = (e) => this.handlers.onStream?.(e.streams[0]);
    this.pc.ondatachannel = (e) => this._setupDataChannel(e.channel);
    this.pc.onicecandidate = (e) => {
      if (e.candidate) this._send({ type: 'candidate', candidate: e.candidate, to: 'host' });
    };
    this.pc.onconnectionstatechange = () =>
      this._status('Verbindung: ' + this.pc.connectionState);

    this._connectSignaling();
    this.ws.onopen = () => {
      this._send({ type: 'join', roomId, peerId: 'guest' });
      this._send({ type: 'request-offer', to: 'host' });
    };
    this.ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      switch (msg.type) {
        case 'peer-joined':
          if (msg.peerId === 'host') this._status('Host gefunden. Warte auf Stream…');
          break;
        case 'peer-left':
          if (msg.peerId === 'host') this._status('Host getrennt.');
          break;
        case 'offer':
          this.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
            .then(() => {
              this._flushCandidates();
              return this.pc.createAnswer();
            })
            .then((answer) => this.pc.setLocalDescription(answer))
            .then(() => this._send({ type: 'answer', sdp: this.pc.localDescription, to: 'host' }))
            .catch((err) => this._status('Fehler: ' + err.message));
          break;
        case 'candidate':
          this._addCandidate(msg.candidate);
          break;
      }
    };
  }

  sendInput(input) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(input));
    }
  }

  close() {
    try { this.stream?.getTracks().forEach((t) => t.stop()); } catch {}
    try { this.dataChannel?.close(); } catch {}
    try { this.pc?.close(); } catch {}
    try { this.ws?.close(); } catch {}
    this._status('Getrennt.');
  }
}
