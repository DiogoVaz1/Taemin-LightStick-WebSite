// ============================================================
// viewer.js — Read-only lightshow viewer
// ============================================================

let viewerKeyframes  = [];
let viewerDuration   = 60;
let vpViewStart      = 0;       // first visible second
let vpViewWindow     = 15;      // seconds visible in zoomed bar
let viewerYTPlayer   = null;
let viewerRAF        = null;
let viewerSyncTimer  = null;
let viewerLastKfIdx  = -1;
let viewerPlaying    = false;

// ── BLE stubs required by ble.js ─────────────────────────────
function setStatus(state, text) {
  const dot = document.getElementById('viewerStatusDot');
  const btn = document.getElementById('viewerConnectBtn');
  if (dot) {
    dot.className = 'viewer-connect-status';
    if (state === 'connected')  dot.classList.add('viewer-status-connected');
    if (state === 'connecting') dot.classList.add('viewer-status-connecting');
  }
  if (btn) {
    const label = state === 'connected' ? t('viewer_disconnect') : t('viewer_connect');
    const dotEl = btn.querySelector('.viewer-connect-status');
    btn.textContent = label;
    if (dotEl) btn.prepend(dotEl);
  }
}
function log() {}
function openManager()     {}
function closeManager()    {}
function updateManagerUI() {}

// ── Auth ──────────────────────────────────────────────────────
function onAuthReady(user) {
  const id = new URLSearchParams(location.search).get('tl');
  if (!id)   { showViewerError(t('viewer_no_show')); return; }
  if (!user) { showViewerError(t('viewer_login_req')); return; }
  loadViewerShow(user, id);
}

// ── Load lightshow ────────────────────────────────────────────
async function loadViewerShow(user, id) {
  try {
    const doc = await firebase.firestore()
      .collection('users').doc(user.uid)
      .collection('timelines').doc(id).get();

    if (!doc.exists) { showViewerError('Lightshow não encontrado.'); return; }

    const data = { id: doc.id, ...doc.data() };
    viewerKeyframes = (data.keyframes || [])
      .map(k => ({ t: k.t, effectId: k.effectId, duration: k.duration ?? 2 }))
      .sort((a, b) => a.t - b.t);
    viewerDuration  = data.duration || 60;
    vpViewWindow    = Math.min(vpViewWindow, viewerDuration);

    document.getElementById('viewerTitle').textContent = data.title || 'LightShow';
    document.title = `${data.title || 'LightShow'} — LightStickWaves`;
    document.getElementById('vpTotalTime').textContent = fmtTime(viewerDuration);

    const editBtn = document.getElementById('viewerEditBtn');
    if (editBtn) { editBtn.href = `player.html?tl=${id}`; editBtn.style.display = ''; }

    document.getElementById('viewerLoading').style.display = 'none';
    document.getElementById('viewerContent').style.display = '';

    renderVpZoomBar();
    renderVpScrubber();
    initScrubberDrag();

    if (data.videoUrl) initViewerYT(data.videoUrl);
    else document.getElementById('viewerYTPlaceholder').style.display = '';

  } catch(e) {
    showViewerError('Erro ao carregar: ' + e.message);
  }
}

// ── Zoomed colour bar ─────────────────────────────────────────
function renderVpZoomBar() {
  const bar = document.getElementById('vpZoomBar');
  if (!bar) return;

  bar.querySelectorAll('.vp-zoom-seg').forEach(el => el.remove());

  const viewEnd = vpViewStart + vpViewWindow;

  viewerKeyframes.forEach(kf => {
    const dur  = kf.duration ?? 2;
    const endT = kf.t + dur;

    const s = Math.max(kf.t, vpViewStart);
    const e = Math.min(endT, viewEnd);
    if (s >= viewEnd || e <= vpViewStart) return;

    const leftPct  = ((s - vpViewStart) / vpViewWindow) * 100;
    const widthPct = ((e - s) / vpViewWindow) * 100;
    const color    = EFFECTS[kf.effectId]?.color ?? '#8b5cf6';

    const seg = document.createElement('div');
    seg.className     = 'vp-zoom-seg';
    seg.style.cssText = `left:${leftPct.toFixed(3)}%;width:${widthPct.toFixed(3)}%;background:${color};`;
    bar.appendChild(seg);
  });
}

// ── Scrubber (full-song mini-map) ─────────────────────────────
function renderVpScrubber() {
  const track = document.getElementById('vpScrubberTrack');
  if (!track || !viewerDuration) return;
  track.innerHTML = '';

  // Absolute positioning so gaps between segments are visible
  viewerKeyframes.forEach(kf => {
    const leftPct  = (kf.t / viewerDuration * 100).toFixed(3);
    const widthPct = ((kf.duration ?? 2) / viewerDuration * 100).toFixed(3);
    const color    = EFFECTS[kf.effectId]?.color ?? '#8b5cf6';
    const seg      = document.createElement('div');
    seg.className     = 'vp-scrubber-seg';
    seg.style.cssText = `position:absolute;left:${leftPct}%;width:${widthPct}%;background:${color};top:0;bottom:0;`;
    track.appendChild(seg);
  });

  updateScrubberThumb();
}

function updateScrubberThumb() {
  const thumb = document.getElementById('vpScrubberThumb');
  if (!thumb || !viewerDuration) return;
  const leftPct  = (vpViewStart / viewerDuration) * 100;
  const widthPct = (vpViewWindow / viewerDuration) * 100;
  thumb.style.left  = leftPct  + '%';
  thumb.style.width = widthPct + '%';
}

function initScrubberDrag() {
  const scrubber = document.getElementById('vpScrubber');
  const thumb    = document.getElementById('vpScrubberThumb');
  if (!scrubber || !thumb) return;

  // Drag the thumb to scroll the view
  thumb.addEventListener('mousedown', ev => {
    ev.preventDefault();
    const startX    = ev.clientX;
    const startView = vpViewStart;
    const rect      = scrubber.getBoundingClientRect();
    const secPerPx  = viewerDuration / rect.width;

    function onMove(mv) {
      const dx = mv.clientX - startX;
      vpViewStart = Math.max(0, Math.min(viewerDuration - vpViewWindow, startView + dx * secPerPx));
      renderVpZoomBar();
      updateScrubberThumb();
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  // Click anywhere on the scrubber track to jump
  scrubber.addEventListener('click', ev => {
    if (ev.target === thumb) return;
    const rect = scrubber.getBoundingClientRect();
    const pct  = (ev.clientX - rect.left) / rect.width;
    const t    = pct * viewerDuration;
    vpViewStart = Math.max(0, Math.min(viewerDuration - vpViewWindow, t - vpViewWindow / 2));
    renderVpZoomBar();
    updateScrubberThumb();
  });
}

// ── YouTube ───────────────────────────────────────────────────
function initViewerYT(url) {
  const videoId = extractVid(url);
  if (!videoId) return;
  document.getElementById('viewerYTPlaceholder').style.display = 'none';

  function createPlayer() {
    viewerYTPlayer = new YT.Player('viewerYTFrame', {
      videoId,
      playerVars: { autoplay: 0, controls: 1, rel: 0, modestbranding: 1 },
      events: {
        onReady: (e) => {
          const dur = e.target.getDuration();
          if (dur && dur > 0) {
            viewerDuration = dur;
            vpViewWindow   = Math.min(vpViewWindow, dur);
            document.getElementById('vpTotalTime').textContent = fmtTime(dur);
            renderVpZoomBar();
            renderVpScrubber();
          }
        },
        onStateChange: (e) => {
          viewerPlaying = e.data === YT.PlayerState.PLAYING;
          document.getElementById('vpPlayBtn').textContent = viewerPlaying ? '⏸' : '▶';
          if (viewerPlaying) { startViewerSync(); startViewerRAF(); }
          else               { stopViewerSync();  stopViewerRAF();  }
        }
      }
    });
  }

  if (window.YT && YT.Player) {
    createPlayer();
  } else {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (prev) prev(); createPlayer(); };
  }
}

// ── Play / Stop controls ──────────────────────────────────────
function vpTogglePlay() {
  if (!viewerYTPlayer) return;
  if (viewerPlaying) viewerYTPlayer.pauseVideo();
  else               viewerYTPlayer.playVideo();
}
function vpStop() {
  if (!viewerYTPlayer) return;
  viewerYTPlayer.pauseVideo();
  viewerYTPlayer.seekTo(0, true);
  vpViewStart = 0;
  renderVpZoomBar();
  updateScrubberThumb();
  movePlayhead(0);
  document.getElementById('vpPlayBtn').textContent = '▶';
  document.getElementById('vpCurrentTime').textContent = fmtTime(0);
}

// ── BLE sync (100 ms) ─────────────────────────────────────────
function startViewerSync() {
  if (viewerSyncTimer) return;
  viewerLastKfIdx = -1;
  viewerSyncTimer = setInterval(viewerSyncTick, 100);
}
function stopViewerSync() {
  if (viewerSyncTimer) { clearInterval(viewerSyncTimer); viewerSyncTimer = null; }
}
async function viewerSyncTick() {
  if (!viewerYTPlayer || typeof viewerYTPlayer.getCurrentTime !== 'function') return;
  const t = viewerYTPlayer.getCurrentTime();
  let activeIdx = -1;
  for (let i = 0; i < viewerKeyframes.length; i++) {
    const kf = viewerKeyframes[i];
    if (t >= kf.t - 0.05 && t < kf.t + (kf.duration ?? 2)) { activeIdx = i; break; }
  }
  if (activeIdx !== viewerLastKfIdx) {
    viewerLastKfIdx = activeIdx;
    if (activeIdx !== -1 && typeof sendPacket === 'function') {
      await sendPacket(0x15, [viewerKeyframes[activeIdx].effectId, 0x01]);
    }
  }
}

// ── RAF loop ──────────────────────────────────────────────────
function startViewerRAF() {
  if (viewerRAF) cancelAnimationFrame(viewerRAF);
  function frame() { viewerTick(); viewerRAF = requestAnimationFrame(frame); }
  viewerRAF = requestAnimationFrame(frame);
}
function stopViewerRAF() {
  if (viewerRAF) { cancelAnimationFrame(viewerRAF); viewerRAF = null; }
}

function viewerTick() {
  if (!viewerYTPlayer || typeof viewerYTPlayer.getCurrentTime !== 'function') return;
  const t = viewerYTPlayer.getCurrentTime();

  // Time display
  document.getElementById('vpCurrentTime').textContent = fmtTime(t);

  // Auto-scroll zoom window (keep playhead between 15 % and 75 %)
  const ratio = (t - vpViewStart) / vpViewWindow;
  if (ratio > 0.75 || ratio < 0.1) {
    vpViewStart = Math.max(0, Math.min(viewerDuration - vpViewWindow, t - vpViewWindow * 0.25));
    renderVpZoomBar();
    updateScrubberThumb();
  }

  // Playhead in zoomed bar
  movePlayhead(t);
}

function movePlayhead(t) {
  const ph = document.getElementById('vpPlayhead');
  if (!ph) return;
  const pct = ((t - vpViewStart) / vpViewWindow) * 100;
  if (pct < 0 || pct > 100) { ph.style.display = 'none'; return; }
  ph.style.display = '';
  ph.style.left    = pct + '%';
}

// ── BLE connect button ────────────────────────────────────────
async function viewerToggleConnect() {
  if (typeof toggleConnect === 'function') await toggleConnect();
}

// ── Helpers ───────────────────────────────────────────────────
function extractVid(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
    if (u.searchParams.has('v'))         return u.searchParams.get('v');
  } catch {}
  return (url.match(/[?&]v=([^&]+)/) || [])[1] || null;
}

function fmtTime(s) {
  const m   = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

function showViewerError(msg) {
  document.getElementById('viewerLoading').style.display = 'none';
  document.getElementById('viewerError').style.display  = '';
  document.getElementById('viewerErrorMsg').textContent = msg;
}
