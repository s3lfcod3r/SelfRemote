/**
 * controls.js
 * Gast:  InputForwarder – erfasst Maus-/Scroll-/Tastatur-Events und
 *        schickt sie via WebRTC-Data Channel an den Host (in Bildschirmkoordinaten).
 * Host:  InputReceiver – empfängt die Events und triggert echte DOM-Events
 *        am passenden Element (synthetische Events).
 */

export class InputForwarder {
  constructor({ videoEl, session, getScreenSize, onStop }) {
    this.videoEl = videoEl;
    this.session = session;
    this.getScreenSize = getScreenSize;
    this.onStop = onStop;
    this.active = true;
    this._raf = null;
    this._pending = null;

    this._hMove = (e) => this._onMove(e);
    this._hDown = (e) => this._onDown(e);
    this._hUp = (e) => this._onUp(e);
    this._hWheel = (e) => this._onWheel(e);
    this._hCtx = (e) => e.preventDefault();
    this._hKeyDown = (e) => this._onKey(e, 'down');
    this._hKeyUp = (e) => this._onKey(e, 'up');

    videoEl.addEventListener('mousemove', this._hMove);
    videoEl.addEventListener('mousedown', this._hDown);
    window.addEventListener('mouseup', this._hUp);
    videoEl.addEventListener('wheel', this._hWheel, { passive: false });
    videoEl.addEventListener('contextmenu', this._hCtx);
    window.addEventListener('keydown', this._hKeyDown);
    window.addEventListener('keyup', this._hKeyUp);
  }

  _send(input) { this.session?.sendInput(input); }
  _mods(e) { return { ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey, meta: e.metaKey }; }

  /** Browser-Koordinaten → Koordinaten im geteilten Bildschirm (Track-Auflösung) */
  _coords(e) {
    const rect = this.videoEl.getBoundingClientRect();
    const size = this.getScreenSize();
    if (!size || !rect.width || !size.width) return null;
    const clamp = (v, max) => Math.max(0, Math.min(max, v));
    return {
      x: Math.round(clamp(((e.clientX - rect.left) / rect.width) * size.width, size.width)),
      y: Math.round(clamp(((e.clientY - rect.top) / rect.height) * size.height, size.height)),
    };
  }

  _onMove(e) {
    const c = this._coords(e);
    if (!c) return;
    this._pending = { action: 'move', ...c };
    if (this._raf) return; // max. 1 Event pro Frame
    this._raf = requestAnimationFrame(() => {
      this._raf = null;
      if (this._pending) { this._send(this._pending); this._pending = null; }
    });
  }

  _onDown(e) {
    const c = this._coords(e);
    if (!c) return;
    e.preventDefault();
    this._send({ action: 'down', ...c, button: e.button, ...this._mods(e) });
  }

  _onUp(e) {
    const c = this._coords(e);
    if (!c) return;
    this._send({ action: 'up', ...c, button: e.button, ...this._mods(e) });
  }

  _onWheel(e) {
    const c = this._coords(e);
    if (!c) return;
    e.preventDefault();
    this._send({ action: 'wheel', ...c, deltaX: e.deltaX, deltaY: e.deltaY, ...this._mods(e) });
  }

  _onKey(e, type) {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.onStop?.();
      return;
    }
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    e.preventDefault();
    this._send({ action: 'key', type, key: e.key, code: e.code, which: e.keyCode, repeat: e.repeat, ...this._mods(e) });
  }

  destroy() {
    this.active = false;
    this.videoEl.removeEventListener('mousemove', this._hMove);
    this.videoEl.removeEventListener('mousedown', this._hDown);
    window.removeEventListener('mouseup', this._hUp);
    this.videoEl.removeEventListener('wheel', this._hWheel);
    this.videoEl.removeEventListener('contextmenu', this._hCtx);
    window.removeEventListener('keydown', this._hKeyDown);
    window.removeEventListener('keyup', this._hKeyUp);
    if (this._raf) cancelAnimationFrame(this._raf);
  }
}

export class InputReceiver {
  constructor({ getScreenSize }) {
    this.getScreenSize = getScreenSize;
  }

  /** Bildschirmkoordinaten → Viewport-Koordinaten des Host-Browsers */
  _toPage(x, y) {
    const size = this.getScreenSize();
    if (!size || !size.width) return { x: 0, y: 0 };
    return {
      x: (x / size.width) * window.innerWidth,
      y: (y / size.height) * window.innerHeight,
    };
  }

  _elAt(x, y) {
    return document.elementFromPoint(x, y) || document.documentElement;
  }

  _mouse(action, input) {
    const p = this._toPage(input.x, input.y);
    const el = this._elAt(p.x, p.y);
    const type = action === 'move' ? 'mousemove' : action === 'down' ? 'mousedown' : 'mouseup';
    el.dispatchEvent(new MouseEvent(type, {
      clientX: p.x,
      clientY: p.y,
      button: input.button ?? 0,
      ctrlKey: !!input.ctrl, shiftKey: !!input.shift, altKey: !!input.alt, metaKey: !!input.meta,
      bubbles: true, cancelable: true, view: window,
    }));
  }

  _wheel(input) {
    const p = this._toPage(input.x, input.y);
    this._elAt(p.x, p.y).dispatchEvent(new WheelEvent('wheel', {
      clientX: p.x,
      clientY: p.y,
      deltaX: input.deltaX, deltaY: input.deltaY,
      ctrlKey: !!input.ctrl, shiftKey: !!input.shift, altKey: !!input.alt, metaKey: !!input.meta,
      bubbles: true, cancelable: true, view: window,
    }));
  }

  _key(input) {
    const target = document.activeElement || document.body;
    target.dispatchEvent(new KeyboardEvent(input.type === 'down' ? 'keydown' : 'keyup', {
      key: input.key, code: input.code,
      ctrlKey: !!input.ctrl, shiftKey: !!input.shift, altKey: !!input.alt, metaKey: !!input.meta,
      repeat: !!input.repeat,
      bubbles: true, cancelable: true, view: window,
    }));
  }

  handle(input) {
    switch (input.action) {
      case 'move': this._mouse('move', input); break;
      case 'down': this._mouse('down', input); break;
      case 'up': this._mouse('up', input); break;
      case 'wheel': this._wheel(input); break;
      case 'key': this._key(input); break;
    }
  }
}
