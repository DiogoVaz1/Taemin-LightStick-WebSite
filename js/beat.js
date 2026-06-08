// ============================================================
// beat.js — Beat Detection via Microphone
//
// Usa a Web Audio API para aceder ao microfone e detetar beats
// nas frequências de bass (kick/bombo). Quando deteta um beat,
// envia um flash de brilho máximo ao lightstick via BLE.
//
// API pública:
//   bdToggle()              — ativa/desativa
//   bdSensitivityChange(v)  — muda sensibilidade
//   bdEffectChange(v)       — muda o efeito no beat
//   bdAddColor()            — adiciona uma cor à pool (max 4)
//   bdRemoveColor(i)        — remove uma cor da pool
//   bdPoolColorChange(i, v) — muda a cor na posição i da pool
// ============================================================

// ── Estado ────────────────────────────────────────────────────
let _bdAudioCtx   = null;
let _bdAnalyser   = null;
let _bdStream     = null;
let _bdActive     = false;
let _bdRafId      = null;
let _bdFlashTimer = null;

// Histórico de energia (threshold adaptativo)
const _BD_HIST = 60;
let _bdHistory = new Float32Array(_BD_HIST);
let _bdHistIdx = 0;

// Estado de beat
let _bdLastBeat = 0;
const BD_MIN_GAP = 250;   // ms mínimos entre beats

// BPM
let _bdBeatTimes = [];

// Sensibilidade (multiplier do threshold)
let _bdSensitivity = 1.5;

// Efeito no beat: 'flash' | 'color'
let _bdEffect = 'flash';

// Pool de cores para o modo 'color'.
// Array de índices de EFFECTS. Vazio = aleatório entre todos.
let _bdColorPool = [];

// Última cor enviada (para não repetir seguido)
let _bdLastColor = -1;

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
    _bdAnalyser.smoothingTimeConstant = 0.75;

    src.connect(lpFilter);
    lpFilter.connect(_bdAnalyser);

    _bdActive    = true;
    _bdHistory.fill(0);
    _bdHistIdx   = 0;
    _bdBeatTimes = [];
    _bdLastColor = -1;

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
  _bdAnalyser = null;
  _bdUpdateUI(false);
}

// ── Loop de análise ───────────────────────────────────────────
function _bdTick() {
  if (!_bdActive) return;
  _bdRafId = requestAnimationFrame(_bdTick);

  const bufLen = _bdAnalyser.frequencyBinCount;
  const data   = new Uint8Array(bufLen);
  _bdAnalyser.getByteFrequencyData(data);

  const end = Math.max(4, Math.floor(bufLen * 0.15));
  let energy = 0;
  for (let i = 1; i < end; i++) energy += (data[i] / 255) ** 2;
  energy /= (end - 1);

  _bdHistory[_bdHistIdx] = energy;
  _bdHistIdx = (_bdHistIdx + 1) % _BD_HIST;

  let avg = 0;
  for (let i = 0; i < _BD_HIST; i++) avg += _bdHistory[i];
  avg /= _BD_HIST;

  _bdUpdateMeter(energy, avg);

  const now = performance.now();
  if (energy > avg * _bdSensitivity && energy > 0.005 && now - _bdLastBeat > BD_MIN_GAP) {
    _bdLastBeat = now;
    _bdOnBeat();
  }
}

// ── Evento de beat ─────────────────────────────────────────────
async function _bdOnBeat() {
  // Flash visual no dot e no orb
  const dot = document.getElementById('bdBeatDot');
  if (dot) {
    dot.classList.remove('bd-beat-active');
    void dot.offsetWidth;
    dot.classList.add('bd-beat-active');
  }
  if (typeof updateCtrlOrb === 'function') {
    const e = window.EFFECTS?.[typeof currentEffect !== 'undefined' ? currentEffect : 0];
    updateCtrlOrb(e?.color ?? '#fff', true);
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

  if (_bdEffect === 'flash') {
    // Brilho máximo → volta ao brilho atual após 120ms
    const prev = typeof currentBrightness !== 'undefined' ? currentBrightness : 8;
    if (_bdFlashTimer) clearTimeout(_bdFlashTimer);
    await sendPacket(0x13, [10]);
    _bdFlashTimer = setTimeout(async () => {
      await sendPacket(0x13, [prev]);
      _bdFlashTimer = null;
    }, 120);

  } else if (_bdEffect === 'color') {
    // Pool: se vazia usa todos os EFFECTS; senão usa as cores escolhidas
    const pool = _bdColorPool.length > 0
      ? _bdColorPool
      : (window.EFFECTS ? EFFECTS.map((_, i) => i) : [0, 1, 2, 3, 4]);

    // Escolhe uma cor diferente da anterior
    let candidates = pool.filter(c => c !== _bdLastColor);
    if (candidates.length === 0) candidates = pool;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    _bdLastColor = pick;

    await sendPacket(0x15, [pick, 0x01]);
    await sendPacket(0x13, [10]);
  }
}

// ── UI helpers ────────────────────────────────────────────────
function _bdUpdateUI(active) {
  const btn = document.getElementById('bdToggleBtn');
  if (btn) {
    btn.textContent  = active ? '⏹ Stop' : '🎤 Listen';
    btn.style.background  = active ? 'var(--danger)' : '';
    btn.style.color       = active ? '#fff' : '';
    btn.style.borderColor = active ? 'var(--danger)' : '';
  }
  const section = document.getElementById('bdActiveSection');
  if (section) section.style.display = active ? '' : 'none';
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

// ── Controles públicos ────────────────────────────────────────
function bdSensitivityChange(val) {
  _bdSensitivity = parseFloat(val);
  const labels = ['Max', 'High', 'Med', 'Low', 'Min'];
  const idx = Math.round((parseFloat(val) - 1.0) / (2.5 - 1.0) * (labels.length - 1));
  const el  = document.getElementById('bdSensLabel');
  if (el) el.textContent = labels[Math.min(idx, labels.length - 1)];
}

function bdEffectChange(val) {
  _bdEffect = val;
  const colorSection = document.getElementById('bdColorSection');
  if (colorSection) colorSection.style.display = val === 'color' ? '' : 'none';
}

// ── Pool de cores ─────────────────────────────────────────────
function bdAddColor() {
  if (_bdColorPool.length >= 4) return;
  // Adiciona a primeira cor que ainda não está na pool
  const available = window.EFFECTS
    ? EFFECTS.map((_, i) => i).filter(i => !_bdColorPool.includes(i))
    : [];
  _bdColorPool.push(available.length > 0 ? available[0] : 0);
  _bdRenderColorPool();
}

function bdRemoveColor(i) {
  _bdColorPool.splice(i, 1);
  _bdRenderColorPool();
}

function bdPoolColorChange(i, val) {
  _bdColorPool[i] = parseInt(val);
}

function _bdRenderColorPool() {
  const container = document.getElementById('bdColorPool');
  const addBtn    = document.getElementById('bdAddColorBtn');
  if (!container) return;

  container.innerHTML = '';

  if (_bdColorPool.length === 0) {
    container.innerHTML = '<span style="font-size:0.75rem;color:var(--muted)">All colors (random)</span>';
  } else {
    _bdColorPool.forEach((effIdx, i) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:0.4rem;margin-bottom:0.3rem';

      // Swatch de cor
      const swatch = document.createElement('div');
      const col = window.EFFECTS?.[effIdx]?.color ?? '#888';
      swatch.style.cssText = `width:18px;height:18px;border-radius:4px;background:${col};flex-shrink:0;border:1px solid rgba(255,255,255,0.15)`;

      // Select
      const sel = document.createElement('select');
      sel.className = 'bd-color-select';
      sel.style.flex = '1';
      if (window.EFFECTS) {
        EFFECTS.forEach((ef, j) => {
          const opt = document.createElement('option');
          opt.value       = j;
          opt.textContent = `${j} · ${ef.name}`;
          if (j === effIdx) opt.selected = true;
          sel.appendChild(opt);
        });
      }
      sel.onchange = () => { bdPoolColorChange(i, sel.value); _bdRenderColorPool(); };

      // Remove button
      const rm = document.createElement('button');
      rm.className   = 'btn btn-ghost';
      rm.style.cssText = 'padding:0.1rem 0.45rem;font-size:0.75rem;min-width:unset';
      rm.textContent = '✕';
      rm.onclick     = () => bdRemoveColor(i);

      row.appendChild(swatch);
      row.appendChild(sel);
      row.appendChild(rm);
      container.appendChild(row);
    });
  }

  if (addBtn) addBtn.disabled = _bdColorPool.length >= 4;
}
