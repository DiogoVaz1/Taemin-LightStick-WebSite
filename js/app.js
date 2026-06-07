// ============================================================
// App state
// ============================================================
var currentEffect = 0x00;
var currentBrightness = 8;

// Auto-scan state
let scanRunning = false;
let scanTimer = null;
let scanIdx = 0;

// ============================================================
// UI helpers
// setStatus, delay, log defined globally in app-router.js
// ============================================================

function toggleSection(bodyId, header) {
  const body = document.getElementById(bodyId);
  body.classList.toggle('hidden');
  header.parentElement.classList.toggle('collapsed');
}

function clearLog() { const b = document.getElementById('logBox'); if (b) b.innerHTML = ''; }

function updateSliderBg(el) {
  const pct = (el.value / el.max) * 100;
  el.style.background = `linear-gradient(to right,#8b5cf6 ${pct}%,#222 ${pct}%)`;
}

// ============================================================
// Controls — color effects
// ============================================================
async function setEffect(id) {
  currentEffect = id;

  // Highlight active segment
  document.querySelectorAll('.color-seg').forEach(s => {
    s.style.outline = 'none';
    s.style.transform = 'scaleY(1)';
    s.style.zIndex = 0;
  });
  const activeSeg = document.getElementById(`seg${id}`);
  if (activeSeg) {
    activeSeg.style.outline = '3px solid #fff';
    activeSeg.style.transform = 'scaleY(1.2)';
    activeSeg.style.zIndex = 1;
  }

  // Show mode number and name
  const e = EFFECTS.find(x => x.id === id);
  const hueModeEl = document.getElementById('hueMode');
  const colorNameEl = document.getElementById('selectedColorName');
  if (hueModeEl) hueModeEl.textContent = id;
  if (colorNameEl) colorNameEl.textContent = e ? e.name : `Mode ${id}`;

  await sendPacket(0x15, [id, 0x01]);
  // Reenviar brilho para manter o valor actual após mudança de cor
  await sendPacket(0x13, [currentBrightness]);
}

function updateEffectHighlight(id) {
  // Handled in setEffect — kept for compatibility
}

// ============================================================
// Controls — brightness
// ============================================================
async function onBrightnessChange(val) {
  currentBrightness = parseInt(val);
  document.getElementById('brightnessVal').textContent = val;
  // Update brightness bar thumb
  const pct = (currentBrightness / 10) * 100;
  const thumb = document.getElementById('brightnessThumb');
  if (thumb) {
    thumb.style.left = pct + '%';
    const g = Math.round((currentBrightness / 10) * 255);
    thumb.style.background = `rgb(${g},${g},${g})`;
  }
  await sendPacket(0x13, [currentBrightness]);
}

function onBrightnessBarClick(event) {
  const bar = document.getElementById('brightnessBar');
  const pct = Math.max(0, Math.min(1, (event.clientX - bar.getBoundingClientRect().left) / bar.offsetWidth));
  const level = Math.round(pct * 10);
  onBrightnessChange(level);
}

// ============================================================
// Modos automáticos
// ============================================================
async function sendAutoMode(type) {
  // FF 14 02 [TYPE] 0F FF
  await sendPacket(0x14, [type, 0x0F]);
  log(`Auto mode: 0x${type.toString(16).padStart(2,'0').toUpperCase()}`, 'info');
}

async function sendAlways() {
  // FF 13 01 0A FF — sempre ligado brilho máximo
  await sendPacket(0x13, [0x0A]);
  currentBrightness = 10;
  document.getElementById('brightnessVal').textContent = 10;
  const thumb = document.getElementById('brightnessThumb');
  if (thumb) { thumb.style.left = '100%'; thumb.style.background = '#fff'; }
  log('Always on (brilho máximo)', 'info');
}

async function sendLightOff() {
  // FF 12 00 FF — apaga o lightstick
  await sendPacket(0x12, []);
  log('Light off', 'info');
}

// ============================================================
// Advanced commands
// ============================================================
async function sendCmd14() {
  const val = parseInt(document.getElementById('cmd14Slider').value);
  await sendPacket(0x14, [0x01, val]);
}

async function sendCmd15custom() {
  const mode = parseInt(document.getElementById('cmd15Mode').value) || 0;
  const sub  = parseInt(document.getElementById('cmd15Sub').value)  || 1;
  await sendPacket(0x15, [mode, sub]);
}

// Auto-scan
async function toggleScan() {
  if (scanRunning) {
    stopScan();
  } else {
    await startScan();
  }
}

async function startScan() {
  if (!rxChar) { log('Conecta primeiro o lightstick', 'err'); return; }
  scanRunning = true;
  scanIdx = 0;
  document.getElementById('scanBtn').textContent = '⏹ Parar Scan';
  await runScanStep();
}

async function runScanStep() {
  if (!scanRunning) return;
  const mode = scanIdx;
  const interval = (parseFloat(document.getElementById('scanInterval').value) || 3) * 1000;
  document.getElementById('scanStatus').textContent = `→ Mode ${mode} (0x${mode.toString(16).padStart(2,'0').toUpperCase()})`;
  updateEffectHighlight(mode);
  await sendPacket(0x15, [mode, 0x01]);
  scanIdx++;
  if (scanIdx >= EFFECT_COUNT) {
    stopScan();
    log('Auto-scan completo!', 'info');
    return;
  }
  scanTimer = setTimeout(runScanStep, interval);
}

function stopScan() {
  scanRunning = false;
  if (scanTimer) clearTimeout(scanTimer);
  document.getElementById('scanBtn').textContent = '▶ Iniciar Scan';
  document.getElementById('scanStatus').textContent = '';
}

async function sendRaw() {
  const input = document.getElementById('rawCmdInput').value.trim();
  if (!input) return;
  const bytes = input.split(/[\s,]+/).map(h => parseInt(h, 16)).filter(n => !isNaN(n));
  if (bytes.length === 0) return;
  if (!rxChar) { log('Not connected', 'err'); return; }
  const pkt = new Uint8Array(bytes);
  const hex = Array.from(pkt).map(b => b.toString(16).padStart(2,'0').toUpperCase()).join(' ');
  log(`→ ${hex}  [raw]`, 'send');
  try { await rxChar.writeValueWithoutResponse(pkt); } catch(e) {
    try { await rxChar.writeValue(pkt); } catch(e2) { log(`Error: ${e2.message}`, 'err'); }
  }
}

// ============================================================
// Build color segments strip
// ============================================================
function buildColorSegments() {
  const container = document.getElementById('colorSegments');
  if (!container) return;
  EFFECTS.forEach((e, i) => {
    const bg = (e.color && e.color !== '#444466')
      ? e.color
      : `hsl(${Math.round((i / (EFFECT_COUNT - 1)) * 360)},100%,50%)`;
    const seg = document.createElement('div');
    seg.id = `seg${e.id}`;
    seg.className = 'color-seg';
    seg.title = `Mode ${e.id} — ${e.name}`;
    seg.style.cssText = `flex:1;background:${bg};position:relative;`;
    if (i === 0) seg.style.borderRadius = '10px 0 0 10px';
    if (i === EFFECT_COUNT - 1) seg.style.borderRadius = '0 10px 10px 0';
    seg.onclick = () => setEffect(e.id);
    container.appendChild(seg);
  });
}

// ============================================================
// Build brightness buttons
// ============================================================
function buildBrightnessButtons() {
  const bbContainer = document.getElementById('brightnessButtons');
  if (!bbContainer) return;
  for (let v = 0; v <= 10; v++) {
    const b = document.createElement('button');
    b.className = 'btn btn-ghost';
    b.style.cssText = 'font-size:0.75rem;padding:0.25rem 0.5rem;min-width:36px';
    b.textContent = v;
    b.onclick = () => sendPacket(0x13, [v]);
    bbContainer.appendChild(b);
  }
}

// ============================================================
// Init — called by _ctrlEnter() in app-router.js (SPA mode)
// or directly on DOMContentLoaded in standalone mode
// ============================================================
let _ctrlInitDone = false;

function _initController() {
  if (_ctrlInitDone) return;
  _ctrlInitDone = true;
  buildColorSegments();
  buildBrightnessButtons();
  renderKeyframes();
  log('Ready. Click "Lightstick Manager" to pair with TAEMIN LIGHTSTICK.', 'info');
  log('Use Chrome/Chromium — Web Bluetooth not supported in Firefox/Safari.', 'info');
}

// Standalone mode (controller.html direct — no SPA router)
document.addEventListener('DOMContentLoaded', () => {
  if (typeof SPA === 'undefined') _initController();
});

// ── Standalone mode fallbacks (controller.html without app-router.js) ─
if (typeof SPA === 'undefined') {
  if (typeof log === 'undefined') {
    window.log = function(msg, type) {
      const box = document.getElementById('logBox');
      if (!box) return;
      const line = document.createElement('div');
      line.className = type ? 'log-' + type : '';
      const time = new Date().toLocaleTimeString('en', {hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'});
      line.textContent = '[' + time + '] ' + msg;
      box.appendChild(line);
      box.scrollTop = box.scrollHeight;
    };
  }
  if (typeof setStatus === 'undefined') {
    window.setStatus = function(type, text) {
      const dot = document.getElementById('statusDot');
      const label = document.getElementById('statusText');
      if (dot) { dot.className = 'status-dot'; if (type) dot.classList.add(type); }
      if (label) label.textContent = text;
    };
  }
  if (typeof delay === 'undefined') {
    window.delay = function(ms) { return new Promise(function(r) { setTimeout(r, ms); }); };
  }
}
