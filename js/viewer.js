// ============================================================
// viewer.js — Visualizador de Lightshows (modo leitura)
//
// FUNÇÃO:
//   Carrega um lightshow do Firestore e sincroniza as cores do
//   lightstick com o vídeo do YouTube em tempo real.
//
// FLUXO PRINCIPAL:
//   1. loadViewerShow(user, tlId) — carrega dados do Firestore
//   2. initViewerYT(videoUrl)    — cria o player do YouTube
//   3. vpTogglePlay()            — play/pause
//   4. startViewerSync()         — timer a 100ms → viewerSyncTick()
//   5. viewerSyncTick()          — encontra o keyframe activo e envia cor ao lightstick
//
// SINCRONIZAÇÃO BLE:
//   A cada 100ms, verifica qual keyframe está activo com base no
//   tempo actual do YouTube player. Quando muda de keyframe,
//   envia sendPacket(0x15, [effectId, 0x01]) ao lightstick.
// ============================================================

// ── Estado do viewer ──────────────────────────────────────────
let viewerKeyframes  = [];   // [{t, effectId, duration}] — cues de luz do lightshow
let viewerDuration   = 60;   // duração total em segundos
let vpViewStart      = 0;    // segundo inicial da janela de zoom visível
let vpViewWindow     = 15;   // quantos segundos a barra de zoom mostra
let viewerYTPlayer   = null; // instância do YouTube IFrame Player
let viewerRAF        = null; // requestAnimationFrame handle (para a UI)
let viewerSyncTimer  = null; // setInterval handle (para sincronização BLE)
let viewerLastKfIdx  = -1;   // índice do último keyframe enviado ao lightstick
let viewerPlaying    = false; // true quando o vídeo está a tocar

// ── Callback de autenticação ──────────────────────────────────
// Chamado pelo router quando o Firebase resolve o estado de login.
// Posts de comunidade não precisam de auth — já foram tratados por _viewerEnter().
function _viewerOnAuthReady(user) {
  // Se é um post de comunidade, já foi carregado em _viewerEnter — não fazer nada
  const postId = SPA.params().post;
  if (postId) return;

  // Lightshow próprio — precisa de auth
  const tlId = SPA.params().tl;
  if (!tlId) { showViewerError(t('viewer_no_show')); return; }
  if (!user) { showViewerError(t('viewer_login_req')); return; }
  loadViewerShow(user, tlId);
}

// ── Carregar lightshow do Firestore ───────────────────────────
async function loadViewerShow(user, id) {
  // Para qualquer reprodução anterior antes de carregar o novo
  stopViewerSync();
  stopViewerRAF();
  viewerLastKfIdx = -1;
  vpViewStart = 0;

  try {
    // Lê o documento do Firestore
    const doc = await firebase.firestore()
      .collection('users').doc(user.uid)
      .collection('timelines').doc(id).get();

    if (!doc.exists) { showViewerError('Lightshow não encontrado.'); return; }

    const data = { id: doc.id, ...doc.data() };

    // Processa e ordena os keyframes por tempo
    viewerKeyframes = (data.keyframes || [])
      .map(k => ({ t: k.t, effectId: k.effectId, duration: k.duration ?? 2 }))
      .sort((a, b) => a.t - b.t);
    viewerDuration  = data.duration || 60;
    vpViewWindow    = Math.min(15, viewerDuration); // janela máxima de 15s

    // Actualiza a interface
    document.getElementById('viewerTitle').textContent = data.title || 'LightShow';
    document.title = `${data.title || 'LightShow'} — LightStickWaves`;
    document.getElementById('vpTotalTime').textContent = fmtTime(viewerDuration);
    document.getElementById('vpCurrentTime').textContent = fmtTime(0);
    document.getElementById('vpPlayBtn').textContent = '▶';

    // ── Barra de metadados ────────────────────────────────────
    // Mostra criador, duração, número de cues e data de actualização
    const creator = user.displayName
      ? user.displayName
      : (user.email ? '@' + user.email.split('@')[0] : '—');
    const updAt   = data.updatedAt?.toDate?.() ?? new Date();
    const updStr  = updAt.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
    const cueCount = (data.keyframes?.length ?? 0);
    document.getElementById('viewerMetaCreator').textContent = creator;
    document.getElementById('viewerMetaDuration').textContent = fmtTime(viewerDuration);
    document.getElementById('viewerMetaCues').textContent    = cueCount;
    document.getElementById('viewerMetaUpdated').textContent = updStr;

    // ── Botão Editar ──────────────────────────────────────────
    // Redireciona para o studio com o ID deste lightshow
    const editBtn = document.getElementById('viewerEditBtn');
    if (editBtn) {
      editBtn.href = '#';
      editBtn.onclick = (e) => { e.preventDefault(); SPA.navigate('studio', { tl: id }); };
      editBtn.style.display = '';
    }

    // ── Botão Público/Privado ─────────────────────────────────
    // Só visível para o dono (que é sempre o utilizador actual neste fluxo)
    _viewerSetVisibilityBtn(data.isPublic || false);
    document.getElementById('viewerVisibilityBtn').style.display = '';

    // Mostra o conteúdo e esconde o loading
    document.getElementById('viewerLoading').style.display = 'none';
    document.getElementById('viewerContent').style.display = '';

    // Actualiza o URL com o ID do lightshow
    SPA.setParam('tl', id);

    // Renderiza a barra de zoom e o scrubber
    renderVpZoomBar();
    renderVpScrubber();
    initScrubberDrag();

    // ── YouTube Player ────────────────────────────────────────
    if (data.videoUrl) {
      if (viewerYTPlayer && typeof viewerYTPlayer.loadVideoById === 'function') {
        // Player já existe — troca apenas o vídeo (mais rápido)
        viewerYTPlayer.loadVideoById(extractVid(data.videoUrl));
        viewerYTPlayer.pauseVideo();
      } else {
        initViewerYT(data.videoUrl); // cria player de raiz
      }
    } else {
      document.getElementById('viewerYTPlaceholder').style.display = '';
    }

  } catch(e) {
    showViewerError('Erro ao carregar: ' + e.message);
  }
}

// ── Modal de selecção de lightshow ────────────────────────────
// Permite ao utilizador trocar de lightshow sem sair do viewer
function openViewerLightshowsModal() {
  const modal = document.getElementById('viewerLightshowsModal');
  if (!modal) return;
  modal.style.display = 'flex';
  _renderViewerLightshowsList();
}

function closeViewerLightshowsModal() {
  const modal = document.getElementById('viewerLightshowsModal');
  if (modal) modal.style.display = 'none';
}

async function _renderViewerLightshowsList() {
  const list = document.getElementById('viewerLightshowsList');
  if (!list) return;

  const _viewerUser = firebase.auth().currentUser;
  if (!_viewerUser) {
    list.innerHTML = '<div style="color:var(--muted);text-align:center;padding:1.5rem">Sign in to see your lightshows.</div>';
    return;
  }

  list.innerHTML = '<div style="color:var(--muted);text-align:center;padding:1rem">⏳ Loading…</div>';

  try {
    const snap = await firebase.firestore()
      .collection('users').doc(_viewerUser.uid)
      .collection('timelines')
      .orderBy('updatedAt', 'desc')
      .limit(50)
      .get();

    if (snap.empty) {
      list.innerHTML = '<div style="color:var(--muted);text-align:center;padding:1.5rem">No lightshows yet.</div>';
      return;
    }

    list.innerHTML = '';
    const currentId = SPA.params().tl || null;

    snap.docs.forEach(doc => {
      const tl       = { id: doc.id, ...doc.data() };
      const isActive = tl.id === currentId; // marca o lightshow actualmente aberto
      const kfCount  = tl.keyframes?.length ?? 0;
      const bpmText  = tl.bpm ? `${Math.round(tl.bpm)} BPM` : 'no BPM';
      const updatedAt = tl.updatedAt?.toDate?.() ?? new Date();
      const diff = Math.floor((Date.now() - updatedAt.getTime()) / 1000);
      const ago = diff < 60 ? 'just now'
        : diff < 3600 ? `${Math.floor(diff/60)}m ago`
        : diff < 86400 ? `${Math.floor(diff/3600)}h ago`
        : `${Math.floor(diff/86400)}d ago`;

      const row = document.createElement('div');
      row.className = 'tl-row' + (isActive ? ' tl-row-active' : '');

      const info = document.createElement('div');
      info.className = 'tl-row-info';
      info.innerHTML =
        `<div class="tl-row-title">${_escapeHtml(tl.title || 'Untitled')}` +
        (isActive ? ' <span class="tl-active-badge">current</span>' : '') + `</div>` +
        `<div class="tl-row-meta">${kfCount} keyframes · ${bpmText} · ${ago}</div>`;

      const loadBtn = document.createElement('button');
      loadBtn.className = 'btn btn-primary';
      loadBtn.style.cssText = 'font-size:0.75rem;padding:0.3rem 0.7rem;flex-shrink:0';
      loadBtn.textContent = isActive ? '✓ Playing' : '▶ Play';
      loadBtn.disabled = isActive;
      loadBtn.addEventListener('click', () => {
        closeViewerLightshowsModal();
        SPA.navigate('viewer', { tl: tl.id });
      });

      const actions = document.createElement('div');
      actions.className = 'tl-row-actions';
      actions.appendChild(loadBtn);

      row.appendChild(info);
      row.appendChild(actions);
      list.appendChild(row);
    });
  } catch(e) {
    list.innerHTML = `<div style="color:#ef4444;padding:0.5rem">Error: ${e.message}</div>`;
  }
}

function _escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Barra de zoom colorida ────────────────────────────────────
// Mostra uma janela de vpViewWindow segundos do lightshow.
// A cor de cada segmento corresponde ao efeito do keyframe.
// O utilizador pode arrastar o scrubber para mover a janela.
function renderVpZoomBar() {
  const bar = document.getElementById('vpZoomBar');
  if (!bar) return;

  bar.querySelectorAll('.vp-zoom-seg').forEach(el => el.remove());

  const viewEnd = vpViewStart + vpViewWindow;

  viewerKeyframes.forEach(kf => {
    const dur  = kf.duration ?? 2;
    const endT = kf.t + dur;

    // Calcula a intersecção do keyframe com a janela visível
    const s = Math.max(kf.t, vpViewStart);
    const e = Math.min(endT, viewEnd);
    if (s >= viewEnd || e <= vpViewStart) return; // fora da janela

    const leftPct  = ((s - vpViewStart) / vpViewWindow) * 100;
    const widthPct = ((e - s) / vpViewWindow) * 100;
    const color    = EFFECTS[kf.effectId]?.color ?? '#8b5cf6';

    const seg = document.createElement('div');
    seg.className     = 'vp-zoom-seg';
    seg.style.cssText = `left:${leftPct.toFixed(3)}%;width:${widthPct.toFixed(3)}%;background:${color};`;
    bar.appendChild(seg);
  });
}

// ── Scrubber (mini-mapa da música completa) ───────────────────
// Mostra todos os keyframes em escala da duração total.
// O polegar (thumb) indica a posição da janela de zoom.
function renderVpScrubber() {
  const track = document.getElementById('vpScrubberTrack');
  if (!track || !viewerDuration) return;
  track.innerHTML = '';

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

// Actualiza a posição do polegar do scrubber
function updateScrubberThumb() {
  const thumb = document.getElementById('vpScrubberThumb');
  if (!thumb || !viewerDuration) return;
  const leftPct  = (vpViewStart / viewerDuration) * 100;
  const widthPct = (vpViewWindow / viewerDuration) * 100;
  thumb.style.left  = leftPct  + '%';
  thumb.style.width = widthPct + '%';
}

// Arrasto do polegar do scrubber para navegar na música
function initScrubberDrag() {
  const scrubber = document.getElementById('vpScrubber');
  const thumb    = document.getElementById('vpScrubberThumb');
  if (!scrubber || !thumb) return;

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

  // Clique no scrubber (fora do thumb) → salta para essa posição
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

// ── YouTube Player ────────────────────────────────────────────
// Cria o player do YouTube usando a IFrame API.
// O player é criado no elemento #viewerYTFrame.
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
          // Quando o player está pronto, actualiza a duração com o valor real do vídeo
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
          // Detecta play/pause/stop e inicia/para a sincronização BLE
          viewerPlaying = e.data === YT.PlayerState.PLAYING;
          document.getElementById('vpPlayBtn').textContent = viewerPlaying ? '⏸' : '▶';
          if (viewerPlaying) { startViewerSync(); startViewerRAF(); }
          else               { stopViewerSync();  stopViewerRAF();  }
        }
      }
    });
  }

  // YT API pode já estar carregada ou não
  if (window.YT && YT.Player) {
    createPlayer();
  } else {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (prev) prev(); createPlayer(); };
  }
}

// ── Controlos de reprodução ───────────────────────────────────
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

// ── Sincronização BLE (100ms) ─────────────────────────────────
// A cada 100ms verifica qual keyframe está activo e, se mudou,
// envia o novo efeito ao lightstick via BLE.
function startViewerSync() {
  if (viewerSyncTimer) return;
  viewerLastKfIdx = -1; // força re-envio do primeiro keyframe
  viewerSyncTimer = setInterval(viewerSyncTick, 100);
}

function stopViewerSync() {
  if (viewerSyncTimer) { clearInterval(viewerSyncTimer); viewerSyncTimer = null; }
}

async function viewerSyncTick() {
  if (!viewerYTPlayer || typeof viewerYTPlayer.getCurrentTime !== 'function') return;
  const t = viewerYTPlayer.getCurrentTime();

  // Procura o keyframe activo no tempo actual
  let activeIdx = -1;
  for (let i = 0; i < viewerKeyframes.length; i++) {
    const kf = viewerKeyframes[i];
    if (t >= kf.t - 0.05 && t < kf.t + (kf.duration ?? 2)) { activeIdx = i; break; }
  }

  // Só envia se o keyframe mudou (evita enviar o mesmo comando repetidamente)
  if (activeIdx !== viewerLastKfIdx) {
    viewerLastKfIdx = activeIdx;
    if (activeIdx !== -1 && typeof sendPacket === 'function') {
      await sendPacket(0x15, [viewerKeyframes[activeIdx].effectId, 0x01]);
    }
  }
}

// ── Loop de animação (RAF) ────────────────────────────────────
// Actualiza a interface visual (tempo, playhead) a cada frame.
// Usa requestAnimationFrame para suavidade (~60fps).
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

  // Actualiza o contador de tempo
  document.getElementById('vpCurrentTime').textContent = fmtTime(t);

  // Auto-scroll da janela de zoom:
  // Se o playhead sair do intervalo [15%, 75%] da janela, recentra
  const ratio = (t - vpViewStart) / vpViewWindow;
  if (ratio > 0.75 || ratio < 0.1) {
    vpViewStart = Math.max(0, Math.min(viewerDuration - vpViewWindow, t - vpViewWindow * 0.25));
    renderVpZoomBar();
    updateScrubberThumb();
  }

  // Move o playhead (linha vertical) na barra de zoom
  movePlayhead(t);
}

// Move a linha vertical do playhead para a posição de tempo t
function movePlayhead(t) {
  const ph = document.getElementById('vpPlayhead');
  if (!ph) return;
  const pct = ((t - vpViewStart) / vpViewWindow) * 100;
  if (pct < 0 || pct > 100) { ph.style.display = 'none'; return; }
  ph.style.display = '';
  ph.style.left    = pct + '%';
}

// ── Botão de conectar BLE no viewer ──────────────────────────
async function viewerToggleConnect() {
  if (typeof toggleConnect === 'function') await toggleConnect();
}

// ── Botão de visibilidade (Público/Privado) ───────────────────

// Actualiza o aspecto do botão de visibilidade
function _viewerSetVisibilityBtn(isPublic) {
  const btn = document.getElementById('viewerVisibilityBtn');
  if (!btn) return;
  btn.textContent = isPublic ? '🌐' : '🔒';
  btn.title       = isPublic
    ? (typeof t === 'function' ? t('vis_public_tip')  : 'Public — click to make private')
    : (typeof t === 'function' ? t('vis_private_tip') : 'Private — click to make public');
  btn.className   = 'btn btn-sm vis-toggle-btn ' + (isPublic ? 'vis-public' : 'vis-private');
  btn.dataset.pub = isPublic ? '1' : '0';
}

// Alterna entre público e privado quando o botão é clicado
async function viewerToggleVisibility() {
  const btn      = document.getElementById('viewerVisibilityBtn');
  const tlId     = SPA.params().tl;
  if (!tlId || !btn) return;
  const isPublic = btn.dataset.pub === '1';
  btn.disabled   = true;
  try {
    await setShowVisibility(tlId, !isPublic); // definida em db.js
    _viewerSetVisibilityBtn(!isPublic);
  } catch(e) { alert(e.message); }
  btn.disabled = false;
}

// ── Utilitários ───────────────────────────────────────────────

// Extrai ID de vídeo YouTube de um URL
function extractVid(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
    if (u.searchParams.has('v'))         return u.searchParams.get('v');
  } catch {}
  return (url.match(/[?&]v=([^&]+)/) || [])[1] || null;
}

// Formata segundos como "M:SS" (ex: 65 → "1:05")
function fmtTime(s) {
  const m   = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

// Mostra o estado de erro do viewer
function showViewerError(msg) {
  document.getElementById('viewerLoading').style.display = 'none';
  document.getElementById('viewerError').style.display  = '';
  document.getElementById('viewerErrorMsg').textContent = msg;
}

// ── Viewer de comunidade (post público, sem auth obrigatória) ──
//
// Carrega um post da colecção community/{postId}.
// Ao contrário de loadViewerShow(), este modo:
//   - Não requer autenticação para ver
//   - Mostra o botão de like em vez do botão de visibilidade
//   - Mostra o botão de editar só se o utilizador for o autor
async function loadCommunityViewerPost(postId) {
  stopViewerSync();
  stopViewerRAF();
  viewerLastKfIdx = -1;
  vpViewStart     = 0;

  // Garante que o UI está em estado de loading
  document.getElementById('viewerLoading').style.display = '';
  document.getElementById('viewerContent').style.display = 'none';
  document.getElementById('viewerError').style.display   = 'none';

  // Esconde botão de visibilidade (não aplicável em posts de comunidade)
  const visBtn = document.getElementById('viewerVisibilityBtn');
  if (visBtn) visBtn.style.display = 'none';

  try {
    const doc = await firebase.firestore().collection('community').doc(postId).get();
    if (!doc.exists) { showViewerError('Lightshow not found.'); return; }

    const data = { id: doc.id, ...doc.data() };

    // Processa keyframes
    viewerKeyframes = (data.keyframes || [])
      .map(k => ({ t: k.t, effectId: k.effectId, duration: k.duration ?? 2 }))
      .sort((a, b) => a.t - b.t);
    viewerDuration = data.duration || 60;
    vpViewWindow   = Math.min(15, viewerDuration);

    // Actualiza interface
    document.getElementById('viewerTitle').textContent      = data.title || 'LightShow';
    document.title                                          = `${data.title || 'LightShow'} — LightStickWaves`;
    document.getElementById('vpTotalTime').textContent      = fmtTime(viewerDuration);
    document.getElementById('vpCurrentTime').textContent    = fmtTime(0);
    document.getElementById('vpPlayBtn').textContent        = '▶';

    // Barra de metadados
    const creator = data.authorName || '—';
    const updAt   = data.updatedAt?.toDate?.() ?? data.publishedAt?.toDate?.() ?? new Date();
    const updStr  = updAt.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
    document.getElementById('viewerMetaCreator').textContent  = creator;
    document.getElementById('viewerMetaDuration').textContent = fmtTime(viewerDuration);
    document.getElementById('viewerMetaCues').textContent     = data.keyframes?.length ?? 0;
    document.getElementById('viewerMetaUpdated').textContent  = updStr;

    // Botão Editar — só para o autor
    const editBtn = document.getElementById('viewerEditBtn');
    if (editBtn) {
      let _cu = null;
      try { _cu = firebase.auth().currentUser; } catch(e) {}
      if (_cu && _cu.uid === data.uid && data.tlId) {
        editBtn.href    = '#';
        editBtn.onclick = (e) => { e.preventDefault(); SPA.navigate('studio', { tl: data.tlId }); };
        editBtn.style.display = '';
      } else {
        editBtn.style.display = 'none';
      }
    }

    // Botão Like
    const likeBtn = document.getElementById('viewerLikeBtn');
    if (likeBtn) {
      likeBtn.dataset.postId = postId;
      likeBtn.dataset.count  = data.likesCount || 0;
      let liked = false;
      let _cu = null;
      try { _cu = firebase.auth().currentUser; } catch(e) {}
      if (_cu) {
        try {
          const likeDoc = await firebase.firestore()
            .collection('users').doc(_cu.uid)
            .collection('communityLikes').doc(postId).get();
          liked = likeDoc.exists;
        } catch(e) {}
      }
      _viewerSetLikeBtn(likeBtn, liked, data.likesCount || 0);
      likeBtn.style.display = '';
    }

    // Mostra conteúdo
    document.getElementById('viewerLoading').style.display = 'none';
    document.getElementById('viewerContent').style.display = '';

    // Persiste postId no URL (sem criar nova entrada no histórico)
    SPA.setParam('post', postId);

    renderVpZoomBar();
    renderVpScrubber();
    initScrubberDrag();

    // YouTube Player
    if (data.videoUrl) {
      if (viewerYTPlayer && typeof viewerYTPlayer.loadVideoById === 'function') {
        viewerYTPlayer.loadVideoById(extractVid(data.videoUrl));
        viewerYTPlayer.pauseVideo();
      } else {
        initViewerYT(data.videoUrl);
      }
    } else {
      document.getElementById('viewerYTPlaceholder').style.display = '';
    }

  } catch(e) {
    showViewerError('Error: ' + e.message);
  }
}

// ── Like no viewer (post de comunidade) ───────────────────────

// Actualiza o visual do botão de like no viewer
function _viewerSetLikeBtn(btn, liked, count) {
  btn.dataset.liked = liked ? '1' : '0';
  btn.dataset.count = count;
  btn.textContent   = (liked ? '❤️' : '🤍') + ' ' + count;
  btn.className     = 'btn btn-sm comm-like-btn viewer-like-btn' + (liked ? ' liked' : '');
  btn.title         = liked ? t('viewer_liked') : t('viewer_like');
}

// Chamado pelo onclick do #viewerLikeBtn
async function viewerToggleLike() {
  const btn = document.getElementById('viewerLikeBtn');
  if (!btn) return;

  let _cu = null;
  try { _cu = firebase.auth().currentUser; } catch(e) {}
  if (!_cu) { alert(t('comm_like_signin')); return; }

  const postId = btn.dataset.postId;
  const liked  = btn.dataset.liked === '1';
  const count  = parseInt(btn.dataset.count) || 0;

  btn.disabled = true;

  // Actualização optimista
  _viewerSetLikeBtn(btn, !liked, liked ? count - 1 : count + 1);

  try {
    const likeRef = firebase.firestore()
      .collection('users').doc(_cu.uid)
      .collection('communityLikes').doc(postId);
    const postRef = firebase.firestore().collection('community').doc(postId);

    if (liked) {
      await likeRef.delete();
      await postRef.update({ likesCount: firebase.firestore.FieldValue.increment(-1) });
    } else {
      await likeRef.set({ likedAt: firebase.firestore.FieldValue.serverTimestamp() });
      await postRef.update({ likesCount: firebase.firestore.FieldValue.increment(1) });
    }
  } catch(e) {
    // Reverte em caso de erro
    _viewerSetLikeBtn(btn, liked, count);
    alert('Error: ' + e.message);
  }

  btn.disabled = false;
}

// ── Compatibilidade com modo standalone ───────────────────────
if (typeof SPA === 'undefined') {
  window.onAuthReady = _viewerOnAuthReady;
  if (typeof setStatus      === 'undefined') window.setStatus      = function(){};
  if (typeof log            === 'undefined') window.log            = function(){};
  if (typeof openManager    === 'undefined') window.openManager    = function(){};
  if (typeof closeManager   === 'undefined') window.closeManager   = function(){};
  if (typeof updateManagerUI=== 'undefined') window.updateManagerUI= function(){};
}
