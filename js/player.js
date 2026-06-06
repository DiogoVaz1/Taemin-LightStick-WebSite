// ============================================================
// player.js — LightShow Studio page logic
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
  document.querySelectorAll('.player-seg').forEach((el, i) => {
    const active = (i === mode);
    el.style.opacity = active ? '1' : '0.52';
    el.classList.toggle('active-seg', active);
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
  if (playing) { startSyncTick(); startCursorRaf(); }
  else          { stopSyncTick();  stopCursorRaf();  }
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
  // Default duration: 1 beat if BPM known, else 2 s
  const defaultDur = bpm > 0 ? parseFloat((60 / bpm).toFixed(2)) : 2;
  addPlayerKf(t, currentEffect, defaultDur);
}

function addPlayerKf(t, effectId, duration) {
  if (duration === undefined || duration === null) duration = bpm > 0 ? 60 / bpm : 2;
  // Remove any existing segment that starts within 0.15 s
  playerKeyframes = playerKeyframes.filter(k => Math.abs(k.t - t) > 0.15);
  playerKeyframes.push({ t, effectId: effectId ?? 0, duration });
  playerKeyframes.sort((a, b) => a.t - b.t);
  renderPlayerTimeline();
  log(`Segmento @ ${formatTime(t)} dur=${duration.toFixed(1)}s mode ${effectId}`, 'info');
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
    const kf  = playerKeyframes[selectedKfIdx];
    const ef  = EFFECTS[kf?.effectId ?? 0];
    const dur = (kf?.duration ?? 2).toFixed(1);
    hint.textContent = `✏️ Seg #${selectedKfIdx + 1} · ${ef?.name || ''} · ${dur}s — clica cor para mudar · arrasta ▶ para duração`;
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

  playerKeyframes.forEach((kf, idx) => {
    const dur        = kf.duration ?? 2;
    const endT       = kf.t + dur;
    const color      = EFFECTS[kf.effectId]?.color || '#fff';
    const isSelected = idx === selectedKfIdx;

    // Clip band to visible window
    const s = Math.max(kf.t, viewStart);
    const e = Math.min(endT, viewEnd);
    if (s >= viewEnd || e <= viewStart) return;

    const leftPct  = ((s - viewStart) / viewWindow) * 100;
    const widthPct = ((e - s) / viewWindow) * 100;

    const band = document.createElement('div');
    band.className = 'player-band' + (isSelected ? ' player-band-selected' : '');
    band.style.left       = leftPct  + '%';
    band.style.width      = widthPct + '%';
    band.style.background = color;
    band.title = formatTime(kf.t) + ' · ' + dur.toFixed(1) + 's · mode ' + kf.effectId;

    band.addEventListener('contextmenu', ev => { ev.preventDefault(); ev.stopPropagation(); removePlayerKf(idx); });

    // Drag body → move whole segment (keep duration); short click → select
    band.addEventListener('mousedown', ev => {
      if (ev.target.classList.contains('player-band-handle')) return; // handles deal with themselves
      if (ev.button !== 0) return;
      ev.stopPropagation();
      ev.preventDefault();

      const startX   = ev.clientX;
      const startT   = kf.t;
      const rect     = track.getBoundingClientRect();
      const secPerPx = viewWindow / rect.width;
      let   dragged  = false;

      function onMove(mv) {
        if (!dragged && Math.abs(mv.clientX - startX) > 5) dragged = true;
        if (!dragged) return;
        const dx  = mv.clientX - startX;
        kf.t = Math.max(0, startT + dx * secPerPx);
        // Keep sorted so sync logic stays correct
        playerKeyframes.sort((a, b) => a.t - b.t);
        selectedKfIdx = playerKeyframes.indexOf(kf);
        renderPlayerTimeline();
        updateSelectionHint();
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup',   onUp);
        if (!dragged) {
          // It was a plain click — select (or deselect if already selected)
          selectKf(playerKeyframes.indexOf(kf));
        }
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup',   onUp);
    });

    // LEFT handle — move start time
    if (kf.t >= viewStart - 0.01) {
      const lh = document.createElement('div');
      lh.className = 'player-band-handle';
      lh.title = 'Arrastar: mover início';
      lh.addEventListener('mousedown', ev => {
        ev.stopPropagation(); ev.preventDefault();
        const rect = track.getBoundingClientRect();
        function onMove(mv) {
          const pct = Math.max(0, Math.min(1, (mv.clientX - rect.left) / rect.width));
          const newT = viewStart + pct * viewWindow;
          kf.duration = Math.max(0.1, kf.t + kf.duration - newT);
          kf.t = newT;
          playerKeyframes.sort((a, b) => a.t - b.t);
          selectedKfIdx = playerKeyframes.indexOf(kf);
          renderPlayerTimeline();
        }
        function onUp() { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
      band.appendChild(lh);
    }

    // RIGHT handle — resize duration
    if (endT <= viewEnd + 0.01) {
      const rh = document.createElement('div');
      rh.className = 'player-band-handle player-band-handle-right';
      rh.title = 'Arrastar: ajustar duração';
      rh.addEventListener('mousedown', ev => {
        ev.stopPropagation(); ev.preventDefault();
        const rect = track.getBoundingClientRect();
        function onMove(mv) {
          const pct   = Math.max(0, Math.min(1, (mv.clientX - rect.left) / rect.width));
          const newEnd = viewStart + pct * viewWindow;
          kf.duration  = Math.max(0.1, newEnd - kf.t);
          renderPlayerTimeline();
          updateSelectionHint();
        }
        function onUp() { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
      band.appendChild(rh);
    }

    track.appendChild(band);
  });

  // Summary list
  const list = document.getElementById('playerKfList');
  if (list) {
    if (playerKeyframes.length === 0) {
      list.textContent = 'Sem keyframes — usa o botão "Mark" para adicionar.';
    } else {
      list.textContent = playerKeyframes
        .map((k, i) => '#' + (i + 1) + ' ' + formatTime(k.t) + ' mode ' + k.effectId)
        .join('  |  ');
    }
  }
}

// Pan helper — shared by drag and wheel
function panView(deltaSeconds) {
  const dur = parseFloat(document.getElementById('playerDuration').value) || 60;
  viewStart = Math.max(0, Math.min(dur - viewWindow, viewStart + deltaSeconds));
  renderPlayerTimeline();
  renderBeatGrid();
  renderTimeRuler();
}

// Seek helper
function seekTo(t) {
  const dur = parseFloat(document.getElementById('playerDuration').value) || 60;
  t = Math.max(0, Math.min(dur, t));
  if (ytPlayer && typeof ytPlayer.seekTo === 'function') ytPlayer.seekTo(t, true);
  updateCursor(t);
}

// Mousedown on track → drag to pan, click to seek
function onTrackMouseDown(e) {
  if (e.button !== 0) return;

  const track        = document.getElementById('playerTrack');
  const rect         = track.getBoundingClientRect();
  const startX       = e.clientX;
  const startView    = viewStart;
  const secPerPx     = viewWindow / rect.width;
  let   dragged      = false;

  function onMove(mv) {
    if (Math.abs(mv.clientX - startX) > 5) dragged = true;
    if (!dragged) return;
    // Negative delta because dragging right should move view left
    viewStart = Math.max(0, startView - (mv.clientX - startX) * secPerPx);
    const dur = parseFloat(document.getElementById('playerDuration').value) || 60;
    viewStart = Math.min(dur - viewWindow, viewStart);
    renderPlayerTimeline();
    renderBeatGrid();
    renderTimeRuler();
  }

  function onUp(ev) {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup',   onUp);

    if (!dragged) {
      // Plain click → deselect + seek
      if (selectedKfIdx !== -1) {
        selectedKfIdx = -1;
        renderPlayerTimeline();
        updateSelectionHint();
      }
      const pct = (ev.clientX - rect.left) / rect.width;
      seekTo(viewStart + pct * viewWindow);
    }
  }

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup',   onUp);
}

// ============================================================
// Sync engine (polls every 100 ms)
// ============================================================
// RAF for smooth cursor (60 fps) — separate from BLE sync tick
let cursorRafId = null;

function startCursorRaf() {
  if (cursorRafId) return;
  function frame() {
    if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function')
      updateCursor(ytPlayer.getCurrentTime());
    cursorRafId = requestAnimationFrame(frame);
  }
  cursorRafId = requestAnimationFrame(frame);
}

function stopCursorRaf() {
  if (cursorRafId) { cancelAnimationFrame(cursorRafId); cursorRafId = null; }
}

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

  document.getElementById('playerTimeDisplay').textContent =
    formatTime(t) + ' / ' + formatTime(dur);

  // Find the active segment: t is within [kf.t, kf.t + kf.duration)
  let activeIdx = -1;
  for (let i = 0; i < playerKeyframes.length; i++) {
    const kf = playerKeyframes[i];
    if (t >= kf.t - 0.05 && t < kf.t + (kf.duration ?? 2)) activeIdx = i;
  }

  if (activeIdx !== lastSentKfIdx) {
    lastSentKfIdx = activeIdx;
    if (activeIdx !== -1) {
      const kf = playerKeyframes[activeIdx];
      log(`▶ ${formatTime(t)} → mode ${kf.effectId} (${(kf.duration ?? 2).toFixed(1)}s)`, 'send');
      await sendPacket(0x15, [kf.effectId, 0x01]);
      updateEffectHighlight(kf.effectId);
    }
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
    seg.style.cssText = `flex:1;background:${ef.color};opacity:0.52;`;
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
  const videoUrl = document.getElementById('ytUrl')?.value?.trim() || '';
  const dur      = parseFloat(document.getElementById('playerDuration')?.value) || 60;
  const payload  = {
    videoUrl,
    keyframes:  playerKeyframes,
    bpm:        bpm || 0,
    beatOffset: beatOffset || 0,
    duration:   dur,
  };
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  // Use a sanitised video URL as filename if possible
  const slug = videoUrl ? extractVideoId(videoUrl) || 'timeline' : 'timeline';
  a.download = `lightstick-${slug}.json`;
  a.click();
}

function importKf() {
  const input    = document.createElement('input');
  input.type     = 'file';
  input.accept   = '.json,application/json';
  input.onchange = async () => {
    try {
      const text = await input.files[0].text();
      const data = JSON.parse(text);

      // Support both old format (plain array) and new format (object with videoUrl)
      let kfs, videoUrl = '', dur = 60, importedBpm = 0, importedOffset = 0;
      if (Array.isArray(data)) {
        kfs = data;
      } else {
        kfs            = data.keyframes  || [];
        videoUrl       = data.videoUrl   || '';
        dur            = data.duration   || 60;
        importedBpm    = data.bpm        || 0;
        importedOffset = data.beatOffset || 0;
      }

      // Add default duration for old-format keyframes that don't have it
      playerKeyframes = kfs
        .filter(k => typeof k.t === 'number' && typeof k.effectId === 'number')
        .map(k => ({ ...k, duration: k.duration ?? 2 }));
      playerKeyframes.sort((a, b) => a.t - b.t);

      // Restore duration
      const durInput = document.getElementById('playerDuration');
      if (durInput && dur) durInput.value = dur;

      // Restore BPM
      if (importedBpm) {
        bpm        = importedBpm;
        beatOffset = importedOffset;
        const bpmInput = document.getElementById('bpmInput');
        if (bpmInput) bpmInput.value = Math.round(bpm);
      }

      // Restore video URL and load video
      if (videoUrl) {
        const urlInput = document.getElementById('ytUrl');
        if (urlInput) urlInput.value = videoUrl;
        loadVideo();
      }

      renderPlayerTimeline();
      renderBeatGrid();
      renderTimeRuler();
      log(`Importado: ${playerKeyframes.length} keyframes${videoUrl ? ' + vídeo' : ''}`, 'info');
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
  // If coming from My Lightshows with ?tl=ID, auto-load after auth
  window._pendingTimelineId = new URLSearchParams(location.search).get('tl') || null;

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

  // Mouse wheel on track → horizontal scroll
  document.getElementById('playerTrack').addEventListener('wheel', e => {
    e.preventDefault();
    // deltaX for trackpad horizontal swipe, deltaY for mouse wheel
    const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
    panView(delta * 0.003 * viewWindow);
  }, { passive: false });

  // Allow pressing Enter in URL field
  document.getElementById('ytUrl').addEventListener('keydown', e => {
    if (e.key === 'Enter') loadVideo();
  });
});
