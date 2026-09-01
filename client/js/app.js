/**
 * app.js – UI-Steuerung (Landing / Host / Gast)
 */
import { RtcSession } from './rtc.js';
import { InputForwarder, InputReceiver } from './controls.js';

const $ = (id) => document.getElementById(id);
const screens = { landing: $('landing'), host: $('host-panel'), guest: $('guest-panel') };

let session = null;
let forwarder = null;
let receiver = null;
let hostTrackSize = null;

function show(name) {
  Object.values(screens).forEach((s) => s.classList.add('hidden'));
  screens[name].classList.remove('hidden');
  $('btn-home').classList.toggle('hidden', name === 'landing');
}

function genId() {
  return 'SR-' + Math.floor(100000 + Math.random() * 900000);
}

function reset() {
  if (session) { session.close(); session = null; }
  if (forwarder) { forwarder.destroy(); forwarder = null; }
  receiver = null;
  hostTrackSize = null;
  $('remote-video').srcObject = null;
  $('host-preview').srcObject = null;
  $('host-preview').classList.add('hidden');
  $('host-status').textContent = '';
  $('guest-status').textContent = '';
  $('video-wrap').style.aspectRatio = '';
  $('btn-share').classList.remove('hidden');
  $('btn-stop').classList.add('hidden');
  $('guest-connect').classList.remove('hidden');
  $('guest-view').classList.add('hidden');
  $('guest-id').value = '';
  show('landing');
}

// ── HOST ──────────────────────────────────────────────────────────────
$('btn-host').addEventListener('click', () => {
  reset();
  const roomId = genId();
  $('host-id').textContent = roomId;
  show('host');

  receiver = new InputReceiver({ getScreenSize: () => hostTrackSize });
  session = new RtcSession({
    onStatus: (t) => { $('host-status').textContent = t; },
    onInput: (input) => receiver?.handle(input),
  });
  session.host(roomId);
});

$('btn-share').addEventListener('click', () => {
  session.startSharing().then(() => {
    const track = session.stream?.getVideoTracks?.()[0];
    if (track) {
      const s = track.getSettings();
      hostTrackSize = { width: s.width || 1920, height: s.height || 1080 };
    }
    const pv = $('host-preview');
    pv.srcObject = session.stream;
    pv.classList.remove('hidden');
    $('btn-share').classList.add('hidden');
    $('btn-stop').classList.remove('hidden');
  });
});

$('btn-stop').addEventListener('click', reset);

// ── GAST ──────────────────────────────────────────────────────────────
$('btn-guest').addEventListener('click', () => { reset(); show('guest'); });

$('btn-connect').addEventListener('click', () => {
  const roomId = $('guest-id').value.trim().toUpperCase();
  if (!roomId) return;
  const video = $('remote-video');

  const onMeta = () => {
    video.removeEventListener('loadedmetadata', onMeta);
    const size = { width: video.videoWidth, height: video.videoHeight };
    if (!size.width) return;
    // Container exakt im Seitenverhältnis des geteilten Bildschirms → 1:1-Mapping
    $('video-wrap').style.aspectRatio = `${size.width} / ${size.height}`;
    $('guest-connect').classList.add('hidden');
    $('guest-view').classList.remove('hidden');
    forwarder = new InputForwarder({
      videoEl: video,
      session,
      getScreenSize: () => ({
        width: video.videoWidth || size.width,
        height: video.videoHeight || size.height,
      }),
      onStop: reset,
    });
  };
  video.addEventListener('loadedmetadata', onMeta);

  session = new RtcSession({
    onStatus: (t) => { $('guest-status').textContent = t; },
    onStream: (stream) => { video.srcObject = stream; },
  });
  session.guest(roomId);
});

$('btn-disconnect').addEventListener('click', reset);
$('btn-home').addEventListener('click', reset);

// ID kopieren
$('btn-copy').addEventListener('click', () => {
  const id = $('host-id').textContent;
  navigator.clipboard?.writeText(id);
  $('btn-copy').textContent = '✅';
  setTimeout(() => { $('btn-copy').textContent = '📋'; }, 1200);
});
