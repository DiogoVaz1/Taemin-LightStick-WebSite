// ============================================================
// player.js — Time Player page logic
// ============================================================

// ---- BLE stubs (provided by ble.js, but referenced by app-level code) ----
let currentEffect = 0;

function log(msg, type) {
  const box = document.getElementById('playerLog');
  if (!box) return;
  const d = document.createElement('div');
  d.className = `log-line log-${type || 'info'}`;
  const now = new Date();
  const ts = `${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
  d.textContent = `[${ts}] ${msg}`;
  box.prepend(d);
  // Keep log small
  while (box.children.length > 40) box.removeChild(box.lastChild);
}

function setStatus(state, text) {
  const dot  = document.getElementById('statusDot');
  const txt  = document.getElementById('statusText');
  if (!dot || !txt) return;
  dot.className = 'status-dot' + (state ? ` status-${state}` : '');
  txt.textContent = text || 'Not connected';
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function updateEffectHighlight(mode) {
  currentEffect = mode;
  // highlight active segment in player color bar
  document.querySelectorAll('.player-seg').forEach((el, i) => {
    el.style.opacity = (i === mode) ? '1' : '0.55';
    el.style.transform = (i === mode) ? 'scaleX(1.4)' : 'scaleX(1)';
  });
}

// ============================================================
// YouTube IFrame API
// ============================================================
let ytPlayer = null;
let ytReady  = false;
let ytDuration = 0;

function onYouTubeIframeAPIReady() {
  ytReady = true;
}

function extractVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be'))  return u.pathname.slice(1);
    if (u.searchParams.has('v'))          return u.searchParams.get('v');
  } catch {}
  const m = url.match(/[?&]v=([^&]+)/);
  return m ? m[1] : null;
}

function loadVideo() {
  const url = document.getElementById('ytUrl').value.trim();
  const vid = extractVideoId(url);
  if (!vid) { alert('URL do YouTube inválida'); return; }

  document.getElementById('ytPlaceholder').style.display = 'none';

  if (ytPlayer) {
    ytPlayer.loadVideoById(vid);
    return;
  }

  ytPlayer = new YT.Player('ytFrame', {
    videoId: vid,
    playerVars: { autoplay: 0, controls: 1, rel: 0, modestbranding: 1 },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
    },
  });
}

function onPlayerReady(e) {
  ytDuration = e.target.getDuration();
  document.getElementById('playerDuration').value = Math.round(ytDuration) || 60;
  updateCursor();
}

function onPlayerStateChange(e) {
  const playing = e.data === YT.PlayerState.PLAYING;
  document.getElementById('playPauseBtn').textContent = playing ? '⏸ Pause' : '▶ Play';
  if (playing) startSyncTick();
  else          stopSyncTick();
}

function toggleVideoPlay() {
  if (!ytPlayer) return;
  const state = ytPlayer.getPlayerState();
  if (state === YT.PlayerState.PLAYING) ytPlayer.pauseVideo();
  else ytPlayer.playVideo();
}

// ============================================================
// Timeline — keyframes
// ============================================================
// Each kf: { t: seconds, effectId: 0-27 }
let playerKeyframes = [];
let syncTimer       = null;
let lastSentKfIdx   = -1;
let selectedKfIdx   = -1;   // index of the currently selected keyframe (-1 = none)

// View / zoom state
let viewStart  = 0;   // first visible second in the track
let viewWindow = 10;  // how many seconds are visible at once

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1).padStart(4, '0');
  return `${m}:${sec}`;
}

function addKeyframeAtCurrentTime() {
  const t = ytPlayer ? ytPlayer.getCurrentTime() : 0;
  addPlayerKf(t, currentEffect);
}

function addPlayerKf(t, effectId) {
  // Remove any existing kf within 0.2s
  playerKeyframes = playerKeyframes.filter(k => Math.abs(k.t - t) > 0.2);
  playerKeyframes.push({ t, effectId: effectId ?? 0 });
  playerKeyframes.sort((a, b) => a.t - b.t);
  renderPlayerTimeline();
  log(`Keyframe @ ${formatTime(t)} — mode ${effectId}`, 'info');
}

function removePlayerKf(idx) {
  if (selectedKfIdx === idx) selectedKfIdx = -1;
  else if (selectedKfIdx > idx) selectedKfIdx--;
  playerKeyframes.splice(idx, 1);
  renderPlayerTimeline();
  updateSelectionHint();
}

function selectKf(idx) {
  selectedKfIdx = (selectedKfIdx === idx) ? -1 : idx; // toggle
  renderPlayerTimeline();
  updateSelectionHint();
  if (selectedKfIdx !== -1) {
    // Preview the keyframe's color on the lightstick
    const kf = playerKeyframes[selectedKfIdx];
    updateEffectHighlight(kf.effectId);
    const nameEl = document.getElementById('playerColorName');
    if (nameEl) nameEl.textContent = `Mode ${kf.effectId} · ${EFFECTS[kf.effectId]?.name || ''} (keyframe selecionado)`;
  }
}

function updateSelectionHint() {
  const hint = document.getElementById('playerColorName');
  if (!hint) return;
  if (selectedKfIdx === -1) {
    const ef = EFFECTS[currentEffect];
    hint.textContent = `Mode ${currentEffect} · ${ef?.name || ''}`;
    hint.style.color = '';
  } else {
    const kf = playerKeyframes[selectedKfIdx];
    const ef = EFFECTS[kf?.effectId ?? 0];
    hint.textContent = `✏️ Keyframe #${selectedKfIdx + 1} · mode ${kf?.effectId} · ${ef?.name || ''}  — clica uma cor para mudar`;
    hint.style.color = 'var(--accent)';
  }
}

function clearPlayerTimeline() {
  playerKeyframes = [];
  renderPlayerTimeline();
}

function renderPlayerTimeline() {
  const track = document.getElementById('playerTrack');
  if (!track) return;

  track.querySelectorAll('.player-kf, .player-band').forEach(el => el.remove());

  const viewEnd = viewStart + viewWindow;

  // --- Colored bands (only visible portion) ---
  playerKeyframes.forEach((kf, idx) => {
    const nextT = playerKeyframes[idx + 1]?.t ?? (viewEnd + 1);
    if (kf.t > viewEnd || nextT < viewStart) return;
    const s = Math.max(kf.t, viewStart);
    const e = Math.min(nextT, viewEnd);
    const band = document.createElement('div');
    band.className = 'player-band';
    band.style.cssText = `position:absolute;top:0;height:100%;` +
      `left:${((s - viewStart) / viewWindow) * 100}%;` +
      `width:${((e - s) / viewWindow) * 100}%;` +
      `background:${EFFECTS[kf.effectId]?.color || '#fff'};opacity:0.25;pointer-events:none;`;
    track.appendChild(band);
  });

  // --- Visible markers with vertical stagger for overlaps ---
  const visible = playerKeyframes
    .map((kf, idx) => ({ kf, idx, pct: ((kf.t - viewStart) / viewWindow) * 100 }))
    .filter(p => p.pct > -1 && p.pct < 101);

  visible.forEach((p, i) => {
    p.row = 0;
    for (let j = i - 1; j >= 0; j--) {
      if (p.pct - visible[j].pct < 1.5) { p.row = (visible[j].row + 1) % 3; break; }
    }
  });

  visible.forEach(({ kf, idx, pct, row }) => {
    const isSelected = idx === selectedKfIdx;
    const el = document.createElement('div');
    el.className    = 'player-kf' + (isSelected ? ' player-kf-selected' : '');
    el.style.left   = pct + '%';
    el.style.top    = (4 + row * 20) + 'px';
    el.style.height = (56 - row * 20) + 'px';
    el.style.background = EFFECTS[kf.effectId]?.color || '#fff';
    el.style.cursor = 'grab';
    el.title = formatTime(kf.t) + ' mode ' + kf.effectId;

    el.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); removePlayerKf(idx); });

    el.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const startX    = e.clientX;
      const trackRect = track.getBoundingClientRect();
      let dragged = false;

      function onMove(ev) {
        if (Math.abs(ev.clientX - startX) > 4) dragged = true;
        if (!dragged) return;
        const newPct = Math.max(0, Math.min(1, (ev.clientX - trackRect.left) / trackRect.width));
        playerKeyframes[idx].t = viewStart + newPct * viewWindow;
        playerKeyframes.sort((a, b) => a.t - b.t);
        selectedKfIdx = playerKeyframes.indexOf(kf);
        renderPlayerTimeline();
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        if (!dragged) selectKf(playerKeyframes.indexOf(kf));
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    track.appendChild(el);
  });

  // --- Summary list ---
  const list = document.getElementById('playerKfList');
  if (list) {
    if (playerKeyframes.length === 0) {
      list.textContent = 'No keyframes yet — click the track or use "Mark" to add.';
    } else {
      list.textContent = playerKeyframes
        .map((k, i) => '#' + (i+1) + ' ' + formatTime(k.t) + ' mode ' + k.effectId)
        .join('  |  ');
    }
  }
}

// Click on track (empty area) → seek to that point in the zoomed view
function onTrackClick(e) {
  if (selectedKfIdx !== -1) {
    selectedKfIdx = -1;
    renderPlayerTimeline();
    updateSelectionHint();
  }
  const track = document.getElementById('playerTrack');
  const rect  = track.getBoundingClientRect();
  const pct   = (e.clientX - rect.left) / rect.width;
  const t     = viewStart + pct * viewWindow;
  if (ytPlayer && typeof ytPlayer.seekTo === 'function') ytPlayer.seekTo(t, true);
  // Re-center view on click position
  const dur = parseFloat(document.getElementById('playerDuration').value) || 60;
  viewStart = Math.max(0, Math.min(dur - viewWindow, t - viewWindow * 0.3));
  renderPlayerTimeline();
  renderBeatGrid();
  renderTimeRuler();
  updateCursor(t);
}

// ============================================================
// Sync engine (polls every 100 ms)
// ============================================================
function startSyncTick() {
  if (syncTimer) return;
  lastSentKfIdx = -1;
  syncTimer = setInterval(syncTick, 100);
}

function stopSyncTick() {
  if (syncTimer) { clearInterval(syncTimer); syncTimer = null; }
}

async function syncTick() {
  if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') return;
  const t   = ytPlayer.getCurrentTime();
  const dur = parseFloat(document.getElementById('playerDuration').value) || 60;

  // Auto-scroll: keep cursor between 15 % and 75 % of the visible window
  const ratio = (t - viewStart) / viewWindow;
  if (ratio > 0.75 || ratio < 0.1) {
    viewStart = Math.max(0, Math.min(dur - viewWindow, t - viewWindow * 0.25));
    renderPlayerTimeline();
    renderBeatGrid();
    renderTimeRuler();
  }

  updateCursor(t, dur);
  document.getElementById('playerTimeDisplay').textContent =
    formatTime(t) + ' / ' + formatTime(dur);

  // Find the last keyframe whose time ≤ current time
  let activeIdx = -1;
  for (let i = 0; i < playerKeyframes.length; i++) {
    if (playerKeyframes[i].t <= t + 0.05) activeIdx = i;
    else break;
  }

  if (activeIdx !== -1 && activeIdx !== lastSentKfIdx) {
    lastSentKfIdx = activeIdx;
    const kf = playerKeyframes[activeIdx];
    log(`▶ ${formatTime(t)} → mode ${kf.effectId}`, 'send');
    await sendPacket(0x15, [kf.effectId, 0x01]);
    updateEffectHighlight(kf.effectId);
  }
}

function updateCursor(t) {
  if (t === undefined && ytPlayer) t = ytPlayer.getCurrentTime?.() ?? 0;
  const pct = Math.max(0, Math.min(100, ((t - viewStart) / viewWindow) * 100));
  const cursor = document.getElementById('playerCursor');
  if (cursor) cursor.style.left = pct + '%';
}

// ============================================================
// Color bar builder (28 segments)
// ============================================================
function buildPlayerColorBar() {
  const bar = document.getElementById('playerColorBar');
  if (!bar) return;
  bar.innerHTML = '';
  EFFECTS.forEach((ef, i) => {
    const seg = document.createElement('div');
    seg.className = 'player-seg';
    seg.style.cssText = `flex:1;background:${ef.color};cursor:pointer;transition:opacity 0.15s,transform 0.15s;transform-origin:center;opacity:0.55;`;
    seg.title = `${i}: ${ef.name}`;
    seg.addEventListener('click', () => selectPlayerEffect(i));
    bar.appendChild(seg);
  });
}

function selectPlayerEffect(id) {
  // If a keyframe is selected, edit its color instead of sending to lightstick
  if (selectedKfIdx !== -1 && playerKeyframes[selectedKfIdx]) {
    playerKeyframes[selectedKfIdx].effectId = id;
    log(`Keyframe #${selectedKfIdx + 1} → mode ${id} (${EFFECTS[id]?.name})`, 'info');
    renderPlayerTimeline();
    updateEffectHighlight(id);
    updateSelectionHint();
    return;
  }

  // Normal mode — send to lightstick
  currentEffect = id;
  updateEffectHighlight(id);
  const nameEl = document.getElementById('playerColorName');
  if (nameEl) nameEl.textContent = `Mode ${id} · ${EFFECTS[id]?.name || ''}`;
  sendPacket(0x15, [id, 0x01]);
  log(`Color → mode ${id} (${EFFECTS[id]?.name})`, 'send');
}

// ============================================================
// Brightness bar
// ============================================================
let playerBrightness = 8;

function onPlayerBrightnessClick(e) {
  const bar  = document.getElementById('playerBrightnessBar');
  const rect = bar.getBoundingClientRect();
  const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  playerBrightness = Math.round(pct * 10);
  document.getElementById('playerBrightnessThumb').style.left = (pct * 100) + '%';
  document.getElementById('playerBrightnessVal').textContent = playerBrightness;
  sendPacket(0x13, [playerBrightness]);
}

// ============================================================
// Import / Export keyframes (JSON)
// ============================================================
function exportKf() {
  const json = JSON.stringify(playerKeyframes, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'lightstick-timeline.json';
  a.click();
}

function importKf() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = async () => {
    try {
      const text = await input.files[0].text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error('Not an array');
      playerKeyframes = data.filter(k => typeof k.t === 'number' && typeof k.effectId === 'number');
      playerKeyframes.sort((a, b) => a.t - b.t);
      renderPlayerTimeline();
      log(`Imported ${playerKeyframes.length} keyframes`, 'info');
    } catch(e) {
      alert('Erro ao importar: ' + e.message);
    }
  };
  input.click();
}

// ============================================================
// Beat grid — tap tempo
// ============================================================
let bpm        = 0;
let beatOffset = 0;   // video time (s) of the first tap
let tapTimes   = [];  // wall-clock timestamps of taps (performance.now() / 1000)
const MAX_TAPS = 8;

function tapBeat() {
  const wallNow  = performance.now() / 1000;
  const videoNow = ytPlayer ? ytPlayer.getCurrentTime() : 0;

  // Flash the button
  const btn = document.getElementById('tapBtn');
  btn.classList.add('tap-flash');
  setTimeout(() => btn.classList.remove('tap-flash'), 120);

  if (tapTimes.length === 0) {
    // First tap — record offset and wait for more
    beatOffset = videoNow;
    tapTimes.push(wallNow);
    document.getElementById('bpmInput').placeholder = '…';
    return;
  }

  // Reset if more than 3 s since last tap (user restarted)
  if (wallNow - tapTimes[tapTimes.length - 1] > 3) {
    tapTimes   = [wallNow];
    beatOffset = videoNow;
    document.getElementById('bpmInput').placeholder = '…';
    return;
  }

  tapTimes.push(wallNow);
  if (tapTimes.length > MAX_TAPS + 1) tapTimes.shift();

  // Average interval over all recorded taps
  const intervals = [];
  for (let i = 1; i < tapTimes.length; i++)
    intervals.push(tapTimes[i] - tapTimes[i - 1]);
  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  bpm = 60 / avg;

  document.getElementById('bpmInput').value     = Math.round(bpm);
  document.getElementById('bpmInput').placeholder = '–';
  renderBeatGrid();
}

function onBpmInput(val) {
  const v = parseFloat(val);
  if (v >= 40 && v <= 300) { bpm = v; renderBeatGrid(); }
}

function clearBeats() {
  bpm = 0; beatOffset = 0; tapTimes = [];
  document.getElementById('bpmInput').value = '';
  document.getElementById('bpmInput').placeholder = '–';
  renderBeatGrid();
}

function renderBeatGrid() {
  const track = document.getElementById('playerTrack');
  if (!track) return;
  track.querySelectorAll('.player-beat').forEach(el => el.remove());
  if (bpm < 40) return;

  const beatInterval = 60 / bpm;
  const viewEnd      = viewStart + viewWindow;
  const phase        = ((beatOffset % beatInterval) + beatInterval) % beatInterval;

  // First beat at or before viewStart
  let t       = phase + Math.floor((viewStart - phase) / beatInterval) * beatInterval;
  let beatNum = Math.round((t - phase) / beatInterval);

  while (t <= viewEnd) {
    if (t >= viewStart) {
      const pct       = ((t - viewStart) / viewWindow) * 100;
      const isMeasure = beatNum % 4 === 0;
      const line = document.createElement('div');
      line.className = 'player-beat';
      line.style.cssText =
        `position:absolute;top:0;height:100%;left:${pct}%;` +
        `width:${isMeasure ? '2px' : '1px'};` +
        `background:rgba(255,255,255,${isMeasure ? '0.6' : '0.25'});` +
        `pointer-events:none;z-index:1;transform:translateX(-50%);`;
      track.appendChild(line);
    }
    t += beatInterval;
    beatNum++;
  }
}

// ============================================================
// Zoom & time ruler
// ============================================================
function setZoom(seconds) {
  viewWindow = seconds;
  document.querySelectorAll('.zoom-btn').forEach(b => {
    const active = parseInt(b.dataset.zoom) === seconds;
    b.classList.toggle('btn-primary', active);
    b.classList.toggle('btn-ghost',   !active);
  });
  renderPlayerTimeline();
  renderBeatGrid();
  renderTimeRuler();
}

function renderTimeRuler() {
  const ruler = document.getElementById('playerRuler');
  if (!ruler) return;
  ruler.innerHTML = '';
  const viewEnd   = viewStart + viewWindow;
  // Pick label interval so we get ~5-7 labels
  const steps     = [0.5, 1, 2, 5, 10, 15, 30, 60];
  const step      = steps.find(s => viewWindow / s <= 7) || 60;
  let t = Math.ceil(viewStart / step) * step;
  while (t <= viewEnd) {
    const pct = ((t - viewStart) / viewWindow) * 100;
    const lbl = document.createElement('div');
    lbl.className   = 'ruler-label';
    lbl.style.left  = pct + '%';
    lbl.textContent = formatTime(t);
    ruler.appendChild(lbl);
    t += step;
  }
}

// ============================================================
// UI helpers (not provided by app.js on this page)
// ============================================================
function toggleSection(bodyId, toggleEl) {
  const body = document.getElementById(bodyId);
  if (!body) return;
  body.classList.toggle('hidden');
  const icon = toggleEl ? toggleEl.querySelector('.toggle-icon') : null;
  if (icon) icon.textContent = body.classList.contains('hidden') ? '▼' : '▲';
}

// ============================================================
// Init
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  buildPlayerColorBar();
  updateEffectHighlight(0);
  renderPlayerTimeline();
  renderTimeRuler();

  // Load YouTube IFrame API script
  if (!window.YT) {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  }

  // Allow pressing Enter in URL field
  document.getElementById('ytUrl').addEventListener('keydown', e => {
    if (e.key === 'Enter') loadVideo();
  });
});
