// ============================================================
// beat.js — Beat Detection via Microphone
//
// Usa a Web Audio API para aceder ao microfone e detetar beats
// nas frequências de bass. Dois modos:
//   flash  — flash de brilho máximo no beat
//   color  — alterna cores aleatórias no beat
//
// API pública:
//   bdToggle()        — ativa/desativa
//   bdSetMode(mode)   — 'flash' | 'color'
// ============================================================

// ── Estado ────────────────────────────────────────────────────
let _bdAudioCtx   = null;
let _bdAnalyser   = null;
let _bdStream     = null;
let _bdActive     = false;
let _bdRafId      = null;
let _bdFlashTimer = null;

// Histórico de energia (para o medidor visual)
const _BD_HIST = 80;
let _bdHistory = new Float32Array(_BD_HIST);
let _bdHistIdx = 0;

// Histórico de spectral flux (para deteção de beat)
const _BD_FLUX_HIST = 43;
let _bdFluxHistory  = new Float32Array(_BD_FLUX_HIST);
let _bdFluxHistIdx  = 0;

// Frame anterior para cálculo de flux
let _bdPrevData = null;

// Estado de beat
let _bdLastBeat = 0;
const BD_MIN_GAP = 300;   // ms mínimos entre beats

// BPM
let _bdBeatTimes = [];

// Sensibilidade do flux (mais alto = menos sensível)
const _bdSensitivity = 1.9;

// Modo: 'flash' | 'color'
let _bdMode = 'flash';

// Última cor enviada (para não repetir seguido)
let _bdLastColor = -1;

// ── Modo ──────────────────────────────────────────────────────
function bdSetMode(mode) {
  _bdMode = mode;
  const flashBtn = document.getElementById('bdModeFlash');
  const colorBtn = document.getElementById('bdModeColor');
  if (flashBtn) flashBtn.classList.toggle('bd-mode-active', mode === 'flash');
  if (colorBtn) colorBtn.classList.toggle('bd-mode-active', mode === 'color');
}

// ── Iniciar / parar ────────────────────────────────────────────
async function bdToggle() {
  if (_bdActive) { _bdStop(); return; }

  try {
    _bdStream   = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    _bdAudioCtx = new (window.AudioContext || window.webkitAudioContext)();

    const src      = _bdAudioCtx.createMediaStreamSource(_bdStream);
    const lpFilter = _bdAudioCtx.createBiquadFilter();
    lpFilter.type            = 'lowpass';
    lpFilter.frequency.value = 180;
    lpFilter.Q.value         = 0.8;

    _bdAnalyser                       = _bdAudioCtx.createAnalyser();
    _bdAnalyser.fftSize               = 512;
    _bdAnalyser.smoothingTimeConstant = 0.60; // baixo para capturar transientes de kick

    src.connect(lpFilter);
    lpFilter.connect(_bdAnalyser);

    _bdActive       = true;
    _bdHistory.fill(0);
    _bdHistIdx      = 0;
    _bdFluxHistory.fill(0);
    _bdFluxHistIdx  = 0;
    _bdPrevData     = null;
    _bdBeatTimes    = [];
    _bdLastColor    = -1;

    _bdUpdateUI(true);
    _bdTick();

  } catch(e) {
    const msg = e.name === 'NotAllowedError'
      ? 'Microphone access denied. Allow microphone access in your browser.'
      : 'Could not access microphone: ' + e.message;
    alert(msg);
  }
}

function _bdStop() {
  _bdActive = false;
  if (_bdRafId)      { cancelAnimationFrame(_bdRafId); _bdRafId = null; }
  if (_bdFlashTimer) { clearTimeout(_bdFlashTimer);    _bdFlashTimer = null; }
  if (_bdStream)     { _bdStream.getTracks().forEach(t => t.stop()); _bdStream = null; }
  if (_bdAudioCtx)   { _bdAudioCtx.close().catch(() => {}); _bdAudioCtx = null; }
  _bdAnalyser    = null;
  _bdPrevData    = null;
  _bdFluxHistory.fill(0);
  _bdFluxHistIdx = 0;
  // Limpa o canvas
  const canvas = document.getElementById('bdWaveCanvas');
  if (canvas) { const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height); }
  // Remove flash class da card
  const card = document.getElementById('bdCard');
  if (card) card.classList.remove('bd-card-beat');
  _bdUpdateUI(false);
}

// ── Loop de análise ───────────────────────────────────────────
function _bdTick() {
  if (!_bdActive) return;
  _bdRafId = requestAnimationFrame(_bdTick);

  const bufLen = _bdAnalyser.frequencyBinCount;
  const data   = new Uint8Array(bufLen);
  _bdAnalyser.getByteFrequencyData(data);

  // Desenha o spectrum no canvas
  _bdDrawCanvas(data);

  // Foca só nas frequências de bass (lowpass a 180Hz → apenas bins iniciais têm sinal)
  // com FFT 512 a 44100Hz: bin width ≈ 86Hz → bins 1-6 cobrem ~86-516Hz
  const bassEnd = Math.max(4, Math.floor(bufLen * 0.05)); // ~12 bins

  // Energia de bass (usada para o medidor visual e noise gate)
  let energy = 0;
  for (let i = 1; i < bassEnd; i++) energy += (data[i] / 255) ** 2;
  energy /= (bassEnd - 1);

  // Spectral flux: soma dos aumentos de energia frame-a-frame (deteção de onset)
  // Muito melhor que energia pura — dispara na *chegada* do kick, não durante o sustain
  let flux = 0;
  if (_bdPrevData) {
    for (let i = 1; i < bassEnd; i++) {
      const diff = (data[i] / 255) - (_bdPrevData[i] / 255);
      if (diff > 0) flux += diff;
    }
    flux /= (bassEnd - 1);
  }
  if (!_bdPrevData) _bdPrevData = new Uint8Array(bufLen);
  _bdPrevData.set(data);

  // Historial de energia (medidor)
  _bdHistory[_bdHistIdx] = energy;
  _bdHistIdx = (_bdHistIdx + 1) % _BD_HIST;
  let avgEnergy = 0;
  for (let i = 0; i < _BD_HIST; i++) avgEnergy += _bdHistory[i];
  avgEnergy /= _BD_HIST;

  // Historial de flux (threshold adaptativo)
  _bdFluxHistory[_bdFluxHistIdx] = flux;
  _bdFluxHistIdx = (_bdFluxHistIdx + 1) % _BD_FLUX_HIST;
  let avgFlux = 0;
  for (let i = 0; i < _BD_FLUX_HIST; i++) avgFlux += _bdFluxHistory[i];
  avgFlux /= _BD_FLUX_HIST;

  _bdUpdateMeter(energy, avgEnergy);

  const now = performance.now();
  // Beat = onset de flux significativo + há bass suficiente (noise gate)
  if (
    energy > 0.0008 &&
    flux > avgFlux * _bdSensitivity &&
    flux > 0.0007 &&
    now - _bdLastBeat > BD_MIN_GAP
  ) {
    _bdLastBeat = now;
    _bdOnBeat();
  }
}

// ── Canvas spectrum visualizer ────────────────────────────────
function _bdDrawCanvas(freqData) {
  const canvas = document.getElementById('bdWaveCanvas');
  if (!canvas) return;

  // Sincroniza resolução com tamanho CSS real
  const rect = canvas.getBoundingClientRect();
  const W = Math.round(rect.width) || 300;
  const H = canvas.height;
  if (canvas.width !== W) canvas.width = W;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  const BARS   = 48;
  const gap    = 2;
  const barW   = (W - gap * (BARS - 1)) / BARS;
  // Usa apenas os primeiros 45% dos bins (bass + low-mid)
  const binMax = Math.floor(freqData.length * 0.45);

  for (let i = 0; i < BARS; i++) {
    const s = Math.floor((i / BARS) * binMax);
    const e = Math.max(s + 1, Math.floor(((i + 1) / BARS) * binMax));
    let val = 0;
    for (let b = s; b < e; b++) val += freqData[b];
    val /= (e - s);

    const h  = (val / 255) * H;
    const x  = i * (barW + gap);
    const t  = i / (BARS - 1);                   // 0 (esquerda) → 1 (direita)
    const hue = Math.round(260 - t * 180);        // roxo (260) → verde-amarelo (80)
    const lit = 55 + (val / 255) * 15;           // mais brilhante quando alto

    ctx.fillStyle = `hsl(${hue},90%,${lit}%)`;
    // Barra de baixo para cima
    ctx.beginPath();
    ctx.roundRect(x, H - h, barW, h, [2, 2, 0, 0]);
    ctx.fill();
  }
}

// ── Evento de beat ─────────────────────────────────────────────
async function _bdOnBeat() {
  // Flash glow na card
  const card = document.getElementById('bdCard');
  if (card) {
    card.classList.remove('bd-card-beat');
    void card.offsetWidth; // reflow para reiniciar a animação
    card.classList.add('bd-card-beat');
  }

  // Flash visual no dot e no orb
  const dot = document.getElementById('bdBeatDot');
  if (dot) {
    dot.classList.remove('bd-beat-active');
    void dot.offsetWidth;
    dot.classList.add('bd-beat-active');
  }

  // BPM
  const nowMs = Date.now();
  _bdBeatTimes.push(nowMs);
  if (_bdBeatTimes.length > 8) _bdBeatTimes.shift();
  if (_bdBeatTimes.length >= 2) {
    let sumGap = 0;
    for (let i = 1; i < _bdBeatTimes.length; i++) sumGap += _bdBeatTimes[i] - _bdBeatTimes[i - 1];
    const bpm = Math.round(60000 / (sumGap / (_bdBeatTimes.length - 1)));
    const el = document.getElementById('bdBpmVal');
    if (el) el.textContent = bpm;
  }

  if (typeof sendPacket !== 'function') return;

  if (_bdMode === 'flash') {
    // Brilho máximo → volta ao brilho atual após 120ms
    const prev = typeof currentBrightness !== 'undefined' ? currentBrightness : 8;
    if (typeof updateCtrlOrb === 'function') {
      const e = typeof EFFECTS !== 'undefined' ? EFFECTS[typeof currentEffect !== 'undefined' ? currentEffect : 0] : null;
      updateCtrlOrb(e?.color ?? '#fff', true);
    }
    if (_bdFlashTimer) clearTimeout(_bdFlashTimer);
    await sendPacket(0x13, [10]);
    _bdFlashTimer = setTimeout(async () => {
      await sendPacket(0x13, [prev]);
      _bdFlashTimer = null;
    }, 120);

  } else if (_bdMode === 'color') {
    // Escolhe uma cor aleatória diferente da anterior
    const pool = typeof EFFECTS !== 'undefined'
      ? EFFECTS.map((_, i) => i)
      : [0, 1, 2, 3, 4];

    let candidates = pool.filter(c => c !== _bdLastColor);
    if (candidates.length === 0) candidates = pool;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    _bdLastColor = pick;

    if (typeof updateCtrlOrb === 'function' && typeof EFFECTS !== 'undefined') {
      updateCtrlOrb(EFFECTS[pick]?.color ?? '#fff', true);
    }
    await sendPacket(0x15, [pick, 0x01]);
    await sendPacket(0x13, [10]);
  }
}

// ── UI helpers ────────────────────────────────────────────────
function _bdUpdateUI(active) {
  const btn = document.getElementById('bdToggleBtn');
  if (btn) {
    btn.textContent       = active ? t('bd_stop') : t('bd_listen');
    btn.style.background  = active ? 'var(--danger)' : '';
    btn.style.color       = active ? '#fff' : '';
    btn.style.borderColor = active ? 'var(--danger)' : '';
  }
  const meter = document.getElementById('bdActiveSection');
  if (meter) meter.style.display = active ? '' : 'none';
  if (!active) {
    const el = document.getElementById('bdBpmVal');
    if (el) el.textContent = '—';
    _bdUpdateMeter(0, 1);
    const dot = document.getElementById('bdBeatDot');
    if (dot) dot.classList.remove('bd-beat-active');
  }
}

function _bdUpdateMeter(energy, avg) {
  const fill = document.getElementById('bdMeterFill');
  if (!fill) return;
  const pct  = Math.min(100, energy * 600);
  const ratio = avg > 0.001 ? energy / avg : 0;
  const hue  = Math.max(0, 120 - Math.max(0, (ratio - 0.8) * 100));
  fill.style.width      = pct + '%';
  fill.style.background = `hsl(${hue}, 90%, 55%)`;
}
