// ============================================================
// player.js — LightShow Studio page logic
// ============================================================

// ---- State ----
// In SPA mode, currentEffect is already declared in app.js.
// Use var so duplicate declarations don't throw a SyntaxError.
var currentEffect = 0;
// log, setStatus, delay are defined globally in app-router.js

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


function loadVideo() {
  const url = document.getElementById('ytUrl').value.trim();
  const vid = extractVideoId(url);
  if (!vid) { alert(typeof t === 'function' ? t('player_invalid_url') : 'Invalid YouTube URL'); return; }

  document.getElementById('ytPlaceholder').style.display = 'none';

  if (ytPlayer) {
    ytPlayer.cueVideoById(vid); // carrega mas não inicia automaticamente
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
  e.target.pauseVideo();
  ytDuration = e.target.getDuration();
  document.getElementById('playerDuration').value = Math.round(ytDuration) || 60;
  updateCursor();
}

function onPlayerStateChange(e) {
  const playing = e.data === YT.PlayerState.PLAYING;
  document.getElementById('playPauseBtn').textContent = playing ? '⏸' : '▶';
  if (playing) { startSyncTick(); startCursorRaf(); }
  else          { stopSyncTick();  stopCursorRaf();  }
}

// ── Standalone playback (controller — no YouTube video) ──────
let _standaloneTime    = 0;
let _standaloneStart   = null;
let _standalonePlaying = false;

function getPlayerCurrentTime() {
  if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
    return ytPlayer.getCurrentTime();
  }
  if (_standalonePlaying && _standaloneStart !== null) {
    const dur = parseFloat(document.getElementById('playerDuration')?.value) || 60;
    return Math.min(_standaloneTime + (performance.now() - _standaloneStart) / 1000, dur);
  }
  return _standaloneTime;
}

function toggleVideoPlay() {
  if (ytPlayer) {
    const state = ytPlayer.getPlayerState();
    if (state === YT.PlayerState.PLAYING) ytPlayer.pauseVideo();
    else ytPlayer.playVideo();
  } else {
    // Standalone mode — timer-based playback, no video
    if (_standalonePlaying) {
      _standaloneTime    = getPlayerCurrentTime();
      _standaloneStart   = null;
      _standalonePlaying = false;
      stopSyncTick();
      stopCursorRaf();
      const btn = document.getElementById('playPauseBtn');
      if (btn) btn.textContent = '▶';
    } else {
      const dur = parseFloat(document.getElementById('playerDuration')?.value) || 60;
      if (_standaloneTime >= dur) _standaloneTime = 0;
      _standaloneStart   = performance.now();
      _standalonePlaying = true;
      startSyncTick();
      startCursorRaf();
      const btn = document.getElementById('playPauseBtn');
      if (btn) btn.textContent = '⏸';
    }
  }
}

// ============================================================
// Timeline — keyframes
// ============================================================
// Each kf: { t, effectId, duration, brightness?, animation? }
//   brightness: 0-10 (undefined = use global)
//   animation: null | 'flicker' | 'wave'
let playerKeyframes = [];
let syncTimer          = null;
let lastSentKfIdx      = -1;
let lastSentBrightness = -1;
let selectedKfIdx      = -1;
let _selectedKfSet     = new Set(); // multi-select
let _clipboard         = { kfs: [] }; // copy/paste
// Context menu state
let _ctxKfIdx   = -1;    // index do keyframe que foi right-clicked
let _ctxIsKf    = false; // true quando o menu é para um keyframe
// Animation state
let _animPhase = 0;     // incrementa a cada syncTick (para flicker/wave)

// View / zoom state
let viewStart  = 0;   // first visible second in the track
let viewWindow = 10;  // how many seconds are visible at once

function formatTime(s, decimal = false) {
  const m = Math.floor(s / 60);
  if (!decimal) return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  return `${m}:${(s % 60).toFixed(1).padStart(4, '0')}`;
}

// Snap threshold em segundos: a que distância dois segmentos se colam automaticamente
const KF_SNAP_S = 0.15;

// Aplica snap-to-neighbor e previne overlap ao posicionar um keyframe.
// Mantém a duração do kf; só ajusta kf.t.
function snapKf(kf) {
  const idx  = playerKeyframes.indexOf(kf);
  const prev = playerKeyframes[idx - 1];
  const next = playerKeyframes[idx + 1];

  // Não pode começar antes de 0
  kf.t = Math.max(0, kf.t);

  // Snap/colisão com o anterior: kf não pode sobrepor prev
  if (prev) {
    const prevEnd = prev.t + (prev.duration ?? 0);
    if (kf.t < prevEnd) kf.t = prevEnd;                         // empurra para a direita
    else if (kf.t - prevEnd < KF_SNAP_S) kf.t = prevEnd;        // snap: cola ao fim do anterior
  }

  // Snap/colisão com o seguinte: kf não pode entrar dentro de next
  if (next) {
    const kfEnd = kf.t + (kf.duration ?? 0);
    if (kfEnd > next.t) kf.t = next.t - (kf.duration ?? 0);    // empurra para a esquerda
    else if (next.t - kfEnd < KF_SNAP_S) kf.t = next.t - (kf.duration ?? 0); // snap: cola ao início do seguinte
    kf.t = Math.max(prev ? prev.t + (prev.duration ?? 0) : 0, kf.t); // re-check prev após ajuste
  }
}

// Clippa a duração de cada keyframe ao gap até ao seguinte (evita overlap)
function recalcKfDurations() {
  for (let i = 0; i < playerKeyframes.length - 1; i++) {
    const gap = playerKeyframes[i + 1].t - playerKeyframes[i].t;
    if ((playerKeyframes[i].duration ?? 2) > gap) playerKeyframes[i].duration = gap;
  }
}

function addKeyframeAtCurrentTime() {
  const t = getPlayerCurrentTime();
  // Duração: 1 beat se BPM conhecido, senão 2s
  const defaultDur = bpm > 0 ? parseFloat((60 / bpm).toFixed(2)) : 2;
  addPlayerKf(t, currentEffect, defaultDur);
}

function addPlayerKf(t, effectId, duration) {
  if (duration === undefined || duration === null) duration = bpm > 0 ? 60 / bpm : 2;
  // Remove qualquer segmento que comece dentro de 0.15s
  playerKeyframes = playerKeyframes.filter(k => Math.abs(k.t - t) > 0.15);

  // Clipa a duração ao gap até ao próximo keyframe
  const nextKf = playerKeyframes.find(k => k.t > t);
  if (nextKf) duration = Math.min(duration, nextKf.t - t);

  playerKeyframes.push({ t, effectId: effectId ?? 0, duration });
  playerKeyframes.sort((a, b) => a.t - b.t);
  renderPlayerTimeline();
  log(`Segmento @ ${formatTime(t)} dur=${duration.toFixed(1)}s mode ${effectId}`, 'info');
}

function removePlayerKf(idx) {
  _selectedKfSet.delete(idx);
  const newSet = new Set();
  _selectedKfSet.forEach(i => { if (i < idx) newSet.add(i); else if (i > idx) newSet.add(i - 1); });
  _selectedKfSet = newSet;
  if (selectedKfIdx === idx) selectedKfIdx = -1;
  else if (selectedKfIdx > idx) selectedKfIdx--;
  playerKeyframes.splice(idx, 1);
  renderPlayerTimeline();
  updateSelectionHint();
}

function selectKf(idx) {
  selectedKfIdx = (selectedKfIdx === idx && _selectedKfSet.size <= 1) ? -1 : idx;
  _selectedKfSet.clear();
  if (selectedKfIdx !== -1) _selectedKfSet.add(selectedKfIdx);
  renderPlayerTimeline();
  updateSelectionHint();
  if (selectedKfIdx !== -1) {
    const kf = playerKeyframes[selectedKfIdx];
    updateEffectHighlight(kf.effectId);
    const bright = kf.brightness ?? playerBrightness;
    _setBrightnessBar(bright);
  } else {
    _setBrightnessBar(playerBrightness);
  }
}

function _ctrlToggleKf(idx) {
  if (_selectedKfSet.has(idx)) {
    _selectedKfSet.delete(idx);
    selectedKfIdx = _selectedKfSet.size > 0 ? [..._selectedKfSet][_selectedKfSet.size - 1] : -1;
  } else {
    _selectedKfSet.add(idx);
    selectedKfIdx = idx;
  }
  renderPlayerTimeline();
  updateSelectionHint();
}

// Helper: atualiza a barra de brilho visualmente (sem enviar BLE)
function _setBrightnessBar(level) {
  const pct = level / 10;
  const thumb = document.getElementById('playerBrightnessThumb');
  const val   = document.getElementById('playerBrightnessVal');
  if (thumb) {
    thumb.style.left = (pct * 100) + '%';
    const g = Math.round(pct * 255);
    thumb.style.background = `rgb(${g},${g},${g})`;
  }
  if (val) val.textContent = level;
}

function updateSelectionHint() {
  const hint = document.getElementById('playerColorName');
  if (!hint) return;
  if (selectedKfIdx === -1) {
    const ef = EFFECTS[currentEffect];
    hint.textContent = `Mode ${currentEffect} · ${ef?.name || ''}`;
    hint.style.color = '';
  } else {
    const kf    = playerKeyframes[selectedKfIdx];
    const ef    = EFFECTS[kf?.effectId ?? 0];
    const dur   = (kf?.duration ?? 2).toFixed(1);
    const bText = kf?.brightness !== undefined ? ` · 💡${kf.brightness}` : '';
    const aIcon = kf?.animation === 'flicker' ? ' · ⚡Flicker' : kf?.animation === 'wave' ? ' · 🌊Wave' : kf?.animation === 'fade-out' ? ' · 🌅Fade Out' : kf?.animation === 'fade-in' ? ' · 🌄Fade In' : '';
    hint.textContent = `✏️ Seg #${selectedKfIdx + 1} · ${ef?.name || ''} · ${dur}s${bText}${aIcon} — clica cor para mudar · ▶ duração`;
    hint.style.color = 'var(--accent)';
  }
  // Mobile kf bar
  const mobileKfBar = document.getElementById('mobileKfBar');
  if (mobileKfBar) {
    if (selectedKfIdx !== -1) {
      mobileKfBar.style.display = '';  // let CSS media query decide (flex on mobile)
      const kf = playerKeyframes[selectedKfIdx];
      const animBtn = document.getElementById('mobileKfAnimBtn');
      if (animBtn) animBtn.textContent = kf?.animation === 'flicker' ? '⚡ Flicker' : kf?.animation === 'wave' ? '🌊 Wave' : kf?.animation === 'fade-out' ? '🌅 Fade Out' : kf?.animation === 'fade-in' ? '🌄 Fade In' : '🔲 Solid';
      const lbl = document.getElementById('mobileKfLabel');
      if (lbl) lbl.textContent = `Seg #${selectedKfIdx + 1}`;
    } else {
      mobileKfBar.style.display = 'none';
    }
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
    const isSelected = _selectedKfSet.has(idx);

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
    band.style.background = kf.animation === 'fade-out' ? `linear-gradient(to right, ${color}, transparent)`
      : kf.animation === 'fade-in'  ? `linear-gradient(to right, transparent, ${color})`
      : color;
    band.title = formatTime(kf.t) + ' · ' + dur.toFixed(1) + 's · mode ' + kf.effectId;

    // Badge de brilho + animação (canto inferior direito)
    {
      const animIcon  = kf.animation === 'flicker' ? '⚡' : kf.animation === 'wave' ? '🌊' : kf.animation === 'fade-out' ? '🌅' : kf.animation === 'fade-in' ? '🌄' : '';
      // Só mostra o brilho se estiver explicitamente definido no keyframe
      const brightTxt = kf.brightness !== undefined ? '💡' + kf.brightness : '';
      const label     = [animIcon, brightTxt].filter(Boolean).join(' ');
      if (label) {
        const badge = document.createElement('span');
        badge.className   = 'band-brightness-badge';
        badge.textContent = label;
        band.appendChild(badge);
      }
    }

    // Right-click → context menu (não apaga imediatamente)
    band.addEventListener('contextmenu', ev => {
      ev.preventDefault(); ev.stopPropagation();
      _ctxKfIdx = idx; _ctxIsKf = true;
      _ctxTime  = kf.t; // para caso de mudar cor via picker
      _updateContextMenuItems(true);
      // Mostra o brilho atual deste keyframe na barra
      _setBrightnessBar(kf.brightness ?? playerBrightness);
      showContextMenu(ev.clientX, ev.clientY, kf.t);
    });

    // Indicador visual de animação
    if (kf.animation) band.classList.add('player-band-anim-' + kf.animation);

    // Drag body → move whole segment (keep duration); short click → select
    function _startBandDrag(startClientX, kfRef) {
      const startX   = startClientX;
      const startT   = kfRef.t;
      const rect2    = track.getBoundingClientRect();
      const secPerPx = viewWindow / rect2.width;
      let   dragged  = false;
      return {
        move(clientX) {
          if (!dragged && Math.abs(clientX - startX) > 5) dragged = true;
          if (!dragged) return;
          kfRef.t = Math.max(0, startT + (clientX - startX) * secPerPx);
          playerKeyframes.sort((a, b) => a.t - b.t);
          selectedKfIdx = playerKeyframes.indexOf(kfRef);
          snapKf(kfRef);
          renderPlayerTimeline();
          updateSelectionHint();
        },
        wasDragged() { return dragged; },
      };
    }

    band.addEventListener('mousedown', ev => {
      if (ev.target.classList.contains('player-band-handle')) return;
      if (ev.button !== 0) return;
      ev.stopPropagation(); ev.preventDefault();
      const ctrlHeld = ev.ctrlKey || ev.metaKey;
      const drag = _startBandDrag(ev.clientX, kf);
      function onMove(mv) { drag.move(mv.clientX); }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        if (!drag.wasDragged()) {
          if (ctrlHeld) _ctrlToggleKf(playerKeyframes.indexOf(kf));
          else { _selectedKfSet.clear(); selectKf(playerKeyframes.indexOf(kf)); }
        }
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup',   onUp);
    });

    band.addEventListener('touchstart', ev => {
      if (ev.target.classList.contains('player-band-handle')) return;
      if (ev.touches.length !== 1) return;
      ev.stopPropagation();
      ev.preventDefault(); // own the gesture — stops browser scroll
      const drag = _startBandDrag(ev.touches[0].clientX, kf);
      function onMove(mv) {
        mv.preventDefault(); // keep suppressing scroll during drag
        if (mv.touches[0]) drag.move(mv.touches[0].clientX);
      }
      function onEnd() {
        band.removeEventListener('touchmove',   onMove);
        band.removeEventListener('touchend',    onEnd);
        band.removeEventListener('touchcancel', onEnd);
        if (!drag.wasDragged()) { _selectedKfSet.clear(); selectKf(playerKeyframes.indexOf(kf)); }
      }
      band.addEventListener('touchmove',   onMove, { passive: false });
      band.addEventListener('touchend',    onEnd,  { passive: true });
      band.addEventListener('touchcancel', onEnd,  { passive: true });
    }, { passive: false });

    // LEFT handle — move start time
    if (kf.t >= viewStart - 0.01) {
      const lh = document.createElement('div');
      lh.className = 'player-band-handle';
      lh.title = 'Arrastar: mover início';
      lh.addEventListener('mousedown', ev => {
        ev.stopPropagation(); ev.preventDefault();
        const rect    = track.getBoundingClientRect();
        const origEnd = kf.t + kf.duration;
        function onMove(mv) {
          const pct  = Math.max(0, Math.min(1, (mv.clientX - rect.left) / rect.width));
          const newT = viewStart + pct * viewWindow;
          // Manter o fim fixo; ajustar início e duração
          kf.duration = Math.max(0.1, origEnd - newT);
          kf.t        = origEnd - kf.duration;
          // Prevenir overlap com anterior
          const idx2  = playerKeyframes.indexOf(kf);
          const prev2 = playerKeyframes[idx2 - 1];
          if (prev2) {
            const prevEnd = prev2.t + (prev2.duration ?? 0);
            if (kf.t < prevEnd) { kf.t = prevEnd; kf.duration = origEnd - kf.t; }
          }
          kf.t = Math.max(0, kf.t);
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
        const rect   = track.getBoundingClientRect();
        const kfIdx2 = playerKeyframes.indexOf(kf);
        const nextKf = playerKeyframes[kfIdx2 + 1];
        const maxEnd = nextKf ? nextKf.t : (parseFloat(document.getElementById('playerDuration')?.value) || 60);
        function onMove(mv) {
          const pct    = Math.max(0, Math.min(1, (mv.clientX - rect.left) / rect.width));
          const newEnd = viewStart + pct * viewWindow;
          // Clamp ao início do próximo — sem overlap
          kf.duration = Math.max(0.1, Math.min(newEnd - kf.t, maxEnd - kf.t));
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

  renderPlayerScrubber();
}

// Pan helper — shared by drag and wheel
function panView(deltaSeconds) {
  const dur = parseFloat(document.getElementById('playerDuration').value) || 60;
  viewStart = Math.max(0, Math.min(dur - viewWindow, viewStart + deltaSeconds));
  renderPlayerTimeline();
  renderBeatGrid();
  renderTimeRuler();
  updatePlayerScrubberThumb(dur);
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
    updateCursor(getPlayerCurrentTime());
    cursorRafId = requestAnimationFrame(frame);
  }
  cursorRafId = requestAnimationFrame(frame);
}

function stopCursorRaf() {
  if (cursorRafId) { cancelAnimationFrame(cursorRafId); cursorRafId = null; }
}

function startSyncTick() {
  if (syncTimer) return;
  lastSentKfIdx      = -1;
  lastSentBrightness = -1;
  _animPhase         = 0;
  syncTimer = setInterval(syncTick, 100);
}

function stopSyncTick() {
  if (syncTimer) { clearInterval(syncTimer); syncTimer = null; }
}

async function syncTick() {
  const t   = getPlayerCurrentTime();
  const dur = parseFloat(document.getElementById('playerDuration').value) || 60;

  // Auto-stop standalone
  if (!ytPlayer && _standalonePlaying && t >= dur) {
    _standaloneTime    = 0;
    _standaloneStart   = null;
    _standalonePlaying = false;
    stopSyncTick(); stopCursorRaf();
    const btn = document.getElementById('playPauseBtn');
    if (btn) btn.textContent = '▶';
    updateCursor(0);
    return;
  }

  // Auto-scroll
  const ratio = (t - viewStart) / viewWindow;
  if (ratio > 0.75 || ratio < 0.1) {
    viewStart = Math.max(0, Math.min(dur - viewWindow, t - viewWindow * 0.25));
    renderPlayerTimeline(); renderBeatGrid(); renderTimeRuler();
  }

  document.getElementById('playerTimeDisplay').textContent = formatTime(t, true) + ' / ' + formatTime(dur, true);

  // Keyframe activo
  let activeIdx = -1;
  for (let i = 0; i < playerKeyframes.length; i++) {
    const kf = playerKeyframes[i];
    if (t >= kf.t - 0.05 && t < kf.t + (kf.duration ?? 2)) { activeIdx = i; break; }
  }

  // ── Keyframe change → envia cor e brilho base ────────────────
  if (activeIdx !== lastSentKfIdx) {
    lastSentKfIdx = activeIdx;
    _animPhase    = 0;  // reseta fase de animação
    if (activeIdx !== -1) {
      const kf = playerKeyframes[activeIdx];
      log(`▶ ${formatTime(t)} → mode ${kf.effectId} (${(kf.duration ?? 2).toFixed(1)}s)`, 'send');
      await sendPacket(0x15, [kf.effectId, 0x01]);
      // Brilho personalizado do keyframe (sem animação)
      if (!kf.animation && kf.brightness !== undefined) {
        await sendPacket(0x13, [kf.brightness]);
        lastSentBrightness = kf.brightness;
      }
      updateEffectHighlight(kf.effectId);
    } else {
      log(`⚫ ${formatTime(t)} → light off (gap)`, 'info');
      await sendPacket(0x12, []);
    }
  }

  if (activeIdx !== -1) {
    // ── Animações (flicker / wave) ──────────────────────────────
    const kf = playerKeyframes[activeIdx];
    if (kf.animation === 'flicker' || kf.animation === 'wave') {
      _animPhase++;
      let bright;
      if (kf.animation === 'flicker') {
        bright = (_animPhase % 2 === 0) ? (kf.brightness ?? 10) : 0;
      } else {
        const base = kf.brightness ?? 10;
        bright = Math.max(0, Math.min(10, Math.round((base / 2) * (1 + Math.sin(_animPhase * Math.PI / 10)))));
      }
      if (bright !== lastSentBrightness) {
        lastSentBrightness = bright;
        await sendPacket(0x13, [bright]);
      }
    } else if (kf.animation === 'fade-out' || kf.animation === 'fade-in') {
      const progress = Math.max(0, Math.min(1, (t - kf.t) / (kf.duration ?? 2)));
      const base     = kf.brightness ?? 10;
      const bright   = Math.round(base * (kf.animation === 'fade-out' ? 1 - progress : progress));
      if (bright !== lastSentBrightness) {
        lastSentBrightness = bright;
        await sendPacket(0x13, [bright]);
      }
    }
  }
}

function updateCursor(t) {
  if (t === undefined || t === null) t = getPlayerCurrentTime();
  const pct = Math.max(0, Math.min(100, ((t - viewStart) / viewWindow) * 100));
  const cursor = document.getElementById('playerCursor');
  if (cursor) cursor.style.left = pct + '%';
  updatePlayerScrubberCursor(t);
  const dur = parseFloat(document.getElementById('playerDuration')?.value) || 60;
  const td = document.getElementById('playerTimeDisplay');
  if (td) td.textContent = formatTime(t, true) + ' / ' + formatTime(dur, true);
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
  const level = Math.round(pct * 10);
  _setBrightnessBar(level);

  // Se o menu de contexto está aberto para um keyframe, edita esse keyframe
  const kfIdx = (_ctxIsKf && _ctxKfIdx !== -1) ? _ctxKfIdx : selectedKfIdx;
  if (kfIdx !== -1 && playerKeyframes[kfIdx]) {
    // Aplica ao keyframe (sem enviar BLE agora)
    playerKeyframes[kfIdx].brightness = level;
    log(`Keyframe #${kfIdx + 1} brightness → ${level}`, 'info');
    updateSelectionHint();
  } else {
    // Controlo live
    playerBrightness = level;
    sendPacket(0x13, [playerBrightness]);
  }
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
      recalcKfDurations(); // clip to edges ao importar

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
      alert((typeof t === 'function' ? t('player_import_error') : 'Import error: ') + e.message);
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
  updatePlayerScrubberThumb();
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
// Scrubber — full-song mini-map
// ============================================================
function renderPlayerScrubber() {
  const track = document.getElementById('playerScrubberTrack');
  if (!track) return;
  track.innerHTML = '';
  const dur = parseFloat(document.getElementById('playerDuration')?.value) || 60;

  // Color keyframes
  playerKeyframes.forEach(kf => {
    const leftPct  = ((kf.t / dur) * 100).toFixed(3);
    const widthPct = (((kf.duration ?? 2) / dur) * 100).toFixed(3);
    const color    = EFFECTS[kf.effectId]?.color ?? '#8b5cf6';
    const seg      = document.createElement('div');
    seg.className  = 'player-scrubber-seg';
    seg.style.cssText = `position:absolute;left:${leftPct}%;width:${widthPct}%;background:${color};top:0;bottom:0;`;
    track.appendChild(seg);
  });

  updatePlayerScrubberThumb(dur);
}

function updatePlayerScrubberThumb(dur) {
  const thumb = document.getElementById('playerScrubberThumb');
  if (!thumb) return;
  if (!dur) dur = parseFloat(document.getElementById('playerDuration')?.value) || 60;
  thumb.style.left  = ((viewStart / dur) * 100)  + '%';
  thumb.style.width = ((viewWindow / dur) * 100) + '%';
}

function updatePlayerScrubberCursor(t) {
  const cursor = document.getElementById('playerScrubberCursor');
  if (!cursor) return;
  const dur = parseFloat(document.getElementById('playerDuration')?.value) || 60;
  cursor.style.left = ((t / dur) * 100) + '%';
}

function initPlayerScrubberDrag() {
  const scrubber = document.getElementById('playerScrubber');
  const thumb    = document.getElementById('playerScrubberThumb');
  if (!scrubber || !thumb) return;

  // Drag thumb → pan the zoomed view
  thumb.addEventListener('mousedown', ev => {
    ev.preventDefault();
    ev.stopPropagation();
    const startX    = ev.clientX;
    const startView = viewStart;
    const dur       = parseFloat(document.getElementById('playerDuration')?.value) || 60;
    const rect      = scrubber.getBoundingClientRect();
    const secPerPx  = dur / rect.width;

    function onMove(mv) {
      const dx = mv.clientX - startX;
      viewStart = Math.max(0, Math.min(dur - viewWindow, startView + dx * secPerPx));
      renderPlayerTimeline();
      renderBeatGrid();
      renderTimeRuler();
      updatePlayerScrubberThumb(dur);
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  });

  // Click on track → jump view + seek video
  scrubber.addEventListener('click', ev => {
    if (ev.target === thumb) return;
    const dur  = parseFloat(document.getElementById('playerDuration')?.value) || 60;
    const rect = scrubber.getBoundingClientRect();
    const pct  = (ev.clientX - rect.left) / rect.width;
    const t    = pct * dur;
    viewStart  = Math.max(0, Math.min(dur - viewWindow, t - viewWindow / 2));
    seekTo(t);
    renderPlayerTimeline();
    renderBeatGrid();
    renderTimeRuler();
    updatePlayerScrubberThumb(dur);
  });
}

// ============================================================
// Context Menu
// ============================================================
let _ctxTime = 0;

function showContextMenu(x, y, timeAtClick) {
  _ctxTime = timeAtClick;
  const menu = document.getElementById('playerContextMenu');
  if (!menu) return;
  menu.style.display = 'block';
  const vw = window.innerWidth, vh = window.innerHeight;
  // Usa a altura real do menu (depois de torná-lo visível) para o clamp
  const mh = menu.offsetHeight || 220;
  menu.style.left = Math.min(x + 2, vw - 190) + 'px';
  menu.style.top  = Math.min(y + 2, vh - mh - 8) + 'px';
}

function hideContextMenu() {
  const menu = document.getElementById('playerContextMenu');
  if (menu) menu.style.display = 'none';
}

function onTrackContextMenu(e) {
  e.preventDefault();
  const track = document.getElementById('playerTrack');
  const rect  = track.getBoundingClientRect();
  const pct   = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  _ctxTime    = viewStart + pct * viewWindow;
  _ctxIsKf    = false;
  _ctxKfIdx   = -1;
  _updateContextMenuItems('track');
  showContextMenu(e.clientX, e.clientY, _ctxTime);
}

// Mostra/esconde os itens do menu consoante o contexto (track / keyframe)
// mode: 'track' | 'kf'
function _updateContextMenuItems(mode) {
  // suporta chamadas antigas com true/false (true = kf, false = track)
  if (mode === true)  mode = 'kf';
  if (mode === false) mode = 'track';
  document.getElementById('ctx-track-items').style.display = mode === 'track' ? '' : 'none';
  document.getElementById('ctx-kf-items').style.display    = mode === 'kf'    ? '' : 'none';
}

// Ações do menu de keyframe
function ctxKfChangeColor() {
  hideContextMenu();
  showColorPicker(true); // true = editar cor de kf existente
}

function ctxKfSetAnimation(type) {
  hideContextMenu();
  if (_ctxKfIdx === -1 || !playerKeyframes[_ctxKfIdx]) return;
  playerKeyframes[_ctxKfIdx].animation = type || undefined;
  log(`Keyframe #${_ctxKfIdx + 1} → ${type || 'solid'}`, 'info');
  renderPlayerTimeline();
  if (selectedKfIdx === _ctxKfIdx) updateSelectionHint();
}

function ctxKfDelete() {
  hideContextMenu();
  if (_ctxKfIdx !== -1) { removePlayerKf(_ctxKfIdx); _ctxKfIdx = -1; }
}

// ============================================================
// Color Picker
// ============================================================
// editExisting=true → muda a cor do keyframe _ctxKfIdx
// editExisting=false → adiciona novo keyframe em _ctxTime
function showColorPicker(editExisting = false) {
  hideContextMenu();
  const grid = document.getElementById('colorPickerGrid');
  if (!grid) return;
  grid.innerHTML = '';
  const title = document.getElementById('colorPickerTitle');
  if (title) title.textContent = editExisting ? '🎨 Change color' : '🎨 Choose a color';
  EFFECTS.forEach((ef, i) => {
    const sw = document.createElement('button');
    sw.className        = 'color-swatch';
    sw.style.background = ef.color;
    sw.title            = ef.name;
    if (editExisting && _ctxKfIdx !== -1 && playerKeyframes[_ctxKfIdx]) {
      sw.onclick = () => {
        playerKeyframes[_ctxKfIdx].effectId = i;
        log(`Keyframe #${_ctxKfIdx + 1} → mode ${i} (${ef.name})`, 'info');
        renderPlayerTimeline();
        if (selectedKfIdx === _ctxKfIdx) { updateEffectHighlight(i); updateSelectionHint(); }
        hideColorPicker();
      };
    } else {
      sw.onclick = () => {
        const dur = bpm > 0 ? parseFloat((60 / bpm).toFixed(2)) : 2;
        addPlayerKf(_ctxTime, i, dur);
        hideColorPicker();
      };
    }
    grid.appendChild(sw);
  });
  document.getElementById('colorPickerOverlay').style.display = 'flex';
}

function hideColorPicker() {
  document.getElementById('colorPickerOverlay').style.display = 'none';
}

// ============================================================
// Mobile editor helpers
// ============================================================
function mobileAddColor() {
  _ctxTime  = getPlayerCurrentTime();
  _ctxIsKf  = false;
  _ctxKfIdx = -1;
  showColorPicker(false);
}

function mobileKfColor() {
  if (selectedKfIdx === -1) return;
  _ctxKfIdx = selectedKfIdx;
  _ctxIsKf  = true;
  _ctxTime  = playerKeyframes[selectedKfIdx]?.t ?? 0;
  showColorPicker(true);
}

function mobileKfCycleAnim() {
  if (selectedKfIdx === -1 || !playerKeyframes[selectedKfIdx]) return;
  const kf    = playerKeyframes[selectedKfIdx];
  const order = [undefined, 'flicker', 'wave', 'fade-out', 'fade-in'];
  const cur   = order.indexOf(kf.animation);
  kf.animation = order[(cur + 1) % order.length];
  renderPlayerTimeline();
  updateSelectionHint();
}

function mobileKfDelete() {
  if (selectedKfIdx === -1) return;
  removePlayerKf(selectedKfIdx);
}

// ============================================================
// Init
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // _pendingTimelineId is set by _studioEnter in app-router.js (SPA mode)
  // or can still be set from URL params when opened standalone
  if (!window._pendingTimelineId) {
    window._pendingTimelineId = new URLSearchParams(location.search).get('tl') || null;
  }

  buildPlayerColorBar();
  updateEffectHighlight(0);
  renderPlayerTimeline();
  renderPlayerScrubber();
  renderTimeRuler();
  initPlayerScrubberDrag();

  // Close context menu when clicking anywhere outside it
  document.addEventListener('click', e => {
    const menu = document.getElementById('playerContextMenu');
    if (menu && !menu.contains(e.target)) hideContextMenu();
  });

  // YouTube IFrame API is loaded by the HTML page (app.html or player.html)

  // Long-press on track (mobile) → context menu at touch position
  {
    const track = document.getElementById('playerTrack');
    track.addEventListener('touchstart', e => {
      if (e.touches.length !== 1) return;
      const touch0    = e.touches[0];
      const startX    = touch0.clientX;
      const startView = viewStart;
      const rect      = track.getBoundingClientRect();
      const secPerPx  = viewWindow / rect.width;
      let   panned    = false;

      // Long-press → context menu at touch position
      const lpTimer = setTimeout(() => {
        if (panned) return;
        const pct   = Math.max(0, Math.min(1, (touch0.clientX - rect.left) / rect.width));
        _ctxTime    = viewStart + pct * viewWindow;
        _ctxIsKf    = false;
        _ctxKfIdx   = -1;
        _updateContextMenuItems('track');
        showContextMenu(touch0.clientX, touch0.clientY, _ctxTime);
      }, 500);

      function onMove(mv) {
        const t  = mv.touches[0];
        const dx = t.clientX - startX;
        if (Math.abs(dx) > 8) {
          if (!panned) { panned = true; clearTimeout(lpTimer); }
          const dur = parseFloat(document.getElementById('playerDuration').value) || 60;
          viewStart = Math.max(0, Math.min(dur - viewWindow, startView - dx * secPerPx));
          renderPlayerTimeline();
          renderBeatGrid();
          renderTimeRuler();
        }
      }
      function onEnd(ev) {
        clearTimeout(lpTimer);
        track.removeEventListener('touchmove',   onMove);
        track.removeEventListener('touchend',    onEnd);
        track.removeEventListener('touchcancel', onEnd);
        if (!panned) {
          // Plain tap → deselect + seek
          const ct = ev.changedTouches[0];
          if (selectedKfIdx !== -1) { selectedKfIdx = -1; renderPlayerTimeline(); updateSelectionHint(); }
          seekTo(viewStart + Math.max(0, Math.min(1, (ct.clientX - rect.left) / rect.width)) * viewWindow);
        }
      }
      track.addEventListener('touchmove',   onMove, { passive: true });
      track.addEventListener('touchend',    onEnd,  { passive: true });
      track.addEventListener('touchcancel', onEnd,  { passive: true });
    }, { passive: true });
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

  // Keyboard shortcuts: Delete, Ctrl+C, Ctrl+V
  document.addEventListener('keydown', e => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    // Ctrl+C — copy selected keyframes
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      const indices = _selectedKfSet.size > 0
        ? [..._selectedKfSet].sort((a, b) => playerKeyframes[a].t - playerKeyframes[b].t)
        : (selectedKfIdx !== -1 ? [selectedKfIdx] : []);
      if (!indices.length) return;
      const firstT   = playerKeyframes[indices[0]].t;
      _clipboard.kfs = indices.map(i => {
        const kf = playerKeyframes[i];
        return { effectId: kf.effectId, duration: kf.duration ?? 2, brightness: kf.brightness, animation: kf.animation, relOffset: kf.t - firstT };
      });
      log(`Copiado ${_clipboard.kfs.length} segmento(s)`, 'info');
      return;
    }

    // Ctrl+V — paste at playhead
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      if (!_clipboard.kfs.length) return;
      const baseT = getPlayerCurrentTime();
      _clipboard.kfs.forEach(entry => {
        const newKf = { t: baseT + entry.relOffset, effectId: entry.effectId, duration: entry.duration };
        if (entry.brightness !== undefined) newKf.brightness = entry.brightness;
        if (entry.animation)               newKf.animation  = entry.animation;
        playerKeyframes.push(newKf);
      });
      playerKeyframes.sort((a, b) => a.t - b.t);
      // Select pasted kfs
      _selectedKfSet.clear();
      _clipboard.kfs.forEach(entry => {
        const t = baseT + entry.relOffset;
        const i = playerKeyframes.findIndex(k => k.t === t && k.effectId === entry.effectId);
        if (i !== -1) _selectedKfSet.add(i);
      });
      selectedKfIdx = _selectedKfSet.size > 0 ? [..._selectedKfSet][0] : -1;
      renderPlayerTimeline();
      renderPlayerScrubber();
      updateSelectionHint();
      log(`Colado ${_clipboard.kfs.length} segmento(s)`, 'info');
      return;
    }

    // Delete / Backspace — remove selected
    if (e.key !== 'Delete' && e.key !== 'Backspace') return;
    if (_selectedKfSet.size > 1) {
      e.preventDefault();
      const toDelete = [..._selectedKfSet].sort((a, b) => b - a); // high→low to keep indices valid
      toDelete.forEach(i => playerKeyframes.splice(i, 1));
      _selectedKfSet.clear();
      selectedKfIdx = -1;
      renderPlayerTimeline();
      renderPlayerScrubber();
      updateSelectionHint();
    } else if (selectedKfIdx !== -1) {
      e.preventDefault();
      removePlayerKf(selectedKfIdx);
    }
  });
});

// ── Standalone mode fallbacks (player.html without app-router.js) ─
if (typeof SPA === 'undefined') {
  if (typeof log === 'undefined') {
    window.log = function(msg, type) {
      const box = document.getElementById('playerLog');
      if (!box) return;
      const d = document.createElement('div');
      d.className = 'log-line log-' + (type || 'info');
      const now = new Date();
      const ts = now.getMinutes().toString().padStart(2,'0') + ':' + now.getSeconds().toString().padStart(2,'0');
      d.textContent = '[' + ts + '] ' + msg;
      box.prepend(d);
      while (box.children.length > 40) box.removeChild(box.lastChild);
    };
  }
  if (typeof setStatus === 'undefined') {
    window.setStatus = function(state, text) {
      const dot = document.getElementById('statusDot');
      const txt = document.getElementById('statusText');
      if (dot) dot.className = 'status-dot' + (state ? ' status-' + state : '');
      if (txt) txt.textContent = text || 'Not connected';
    };
  }
  if (typeof delay === 'undefined') {
    window.delay = function(ms) { return new Promise(function(r) { setTimeout(r, ms); }); };
  }
}
