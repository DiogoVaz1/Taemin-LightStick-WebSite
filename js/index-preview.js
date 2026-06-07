// ============================================================
// index-preview.js — Preview de lightshows na página Home
//
// FUNÇÃO:
//   Mostra dois painéis na Home:
//     1. "Os meus Lightshows" — últimos 4 lightshows do utilizador
//     2. "Comunidade" — 4 cards placeholder (conteúdo futuro)
//
// DIFERENÇA PARA my-lightshows.js:
//   Este ficheiro mostra apenas 4 lightshows (preview rápida),
//   enquanto my-lightshows.js mostra até 50 numa grid dedicada.
// ============================================================

// Callback de autenticação para a Home
// Chamado pelo router quando o Firebase resolve o auth e a view activa é 'home'
function _homeOnAuthReady(user) {
  if (user) {
    loadHomeMyShows(user); // carrega os lightshows do utilizador
  } else {
    // Mostra mensagem "faz login" e esconde a grid
    document.getElementById('homeMyShowsSignIn').style.display = '';
    document.getElementById('homeMyShowsGrid').style.display   = 'none';
    document.getElementById('homeMyShowsEmpty').style.display  = 'none';
  }
  renderCommunityPreview(); // os placeholders da comunidade não precisam de auth
  document.getElementById('homePreviewSection').style.display = '';
}

// Modo standalone (index.html sem SPA): regista como callback global
if (typeof SPA === 'undefined') window.onAuthReady = _homeOnAuthReady;

// ── Preview dos meus lightshows ───────────────────────────────
// Carrega os últimos 4 lightshows e renderiza cards na home
async function loadHomeMyShows(user) {
  try {
    const snap = await firebase.firestore()
      .collection('users').doc(user.uid).collection('timelines')
      .orderBy('updatedAt', 'desc')
      .limit(4) // apenas 4 para o preview da home
      .get();

    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (list.length === 0) {
      document.getElementById('homeMyShowsEmpty').style.display = '';
      document.getElementById('homeMyShowsGrid').style.display  = 'none';
    } else {
      const grid = document.getElementById('homeMyShowsGrid');
      grid.innerHTML = '';
      list.forEach((tl, idx) => grid.appendChild(buildPreviewCard(tl, idx)));
      grid.style.display = '';
      document.getElementById('homeMyShowsEmpty').style.display = 'none';
    }
    document.getElementById('homeMyShowsSignIn').style.display = 'none';
  } catch(e) {
    console.warn('[index-preview] load error:', e.message);
  }
}

// ── Preview da comunidade (posts reais do Firestore) ──────────
// Carrega os 4 posts mais recentes da comunidade e mostra-os na home.
// O guard dataset.built evita re-renderizar desnecessariamente,
// mas é limpo ao mudar de idioma (em setLang).
async function renderCommunityPreview() {
  const grid = document.getElementById('homeCommunityGrid');
  if (!grid || grid.dataset.built) return;
  grid.dataset.built = '1';

  try {
    const snap = await firebase.firestore()
      .collection('community')
      .orderBy('publishedAt', 'desc')
      .limit(4)
      .get();

    if (snap.empty) {
      // Comunidade ainda vazia — mostra mensagem de incentivo
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:2.5rem 1rem;color:var(--muted)">
          <div style="font-size:2rem;margin-bottom:0.5rem">🌐</div>
          <div style="font-size:0.88rem">${t('comm_empty_body')}</div>
        </div>`;
      return;
    }

    snap.docs.forEach(doc => {
      const post = { id: doc.id, ...doc.data() };
      // buildCommHomeCard é definida em community.js (carregado antes deste ficheiro)
      if (typeof buildCommHomeCard === 'function') {
        grid.appendChild(buildCommHomeCard(post));
      }
    });
  } catch(e) {
    // Firestore não configurado ainda ou erro de rede — mostra mensagem silenciosa
    console.warn('[index-preview] community load error:', e.message);
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--muted);font-size:0.85rem">
        🌐 ${t('comm_page_title')}
      </div>`;
  }
}

// ── Constrói um card de lightshow real (para a home preview) ──
function buildPreviewCard(tl, idx) {
  const card = document.createElement('div');
  card.className = 'ls-card';
  card.style.animationDelay = (idx * 0.05) + 's';
  card.style.cursor = 'pointer';

  // Clicar em qualquer parte do card → viewer
  card.addEventListener('click', () => {
    if (typeof SPA !== 'undefined') SPA.navigate('viewer', { tl: tl.id });
    else location.href = `app.html?tl=${tl.id}#viewer`;
  });

  const videoId   = _pvExtractId(tl.videoUrl || '');
  const updatedAt = tl.updatedAt?.toDate?.() ?? new Date();
  const timeAgo   = _pvTimeAgo(updatedAt);
  const kfCount   = tl.keyframes?.length ?? 0;
  const bpmText   = tl.bpm ? Math.round(tl.bpm) + ' BPM' : t('card_no_bpm');

  // Thumbnail do YouTube (se tiver vídeo associado)
  if (videoId) {
    const thumb = document.createElement('div');
    thumb.className = 'ls-card-thumb';
    thumb.innerHTML = `
      <img src="https://img.youtube.com/vi/${videoId}/mqdefault.jpg"
           alt="" loading="lazy"
           onerror="this.parentElement.style.display='none'">
      <div class="ls-card-thumb-overlay"></div>`;
    card.appendChild(thumb);
  }

  const body = document.createElement('div');
  body.className = 'ls-card-body';
  body.innerHTML = `
    <div class="ls-card-title">${_pvEsc(tl.title || t('card_no_title'))}</div>
    <div class="ls-card-meta">${kfCount} ${t('card_segments')} · ${bpmText} · ${timeAgo}</div>`;
  card.appendChild(body);

  const actions = document.createElement('div');
  actions.className = 'ls-card-actions';

  // Play → viewer (stopPropagation evita double-fire com o click do card)
  const playBtn = document.createElement('button');
  playBtn.className = 'btn btn-success btn-sm';
  playBtn.style.cssText = 'flex:1;';
  playBtn.textContent = t('btn_play');
  if (typeof SPA !== 'undefined') {
    playBtn.onclick = (e) => { e.stopPropagation(); SPA.navigate('viewer', { tl: tl.id }); };
  } else {
    playBtn.onclick = (e) => { e.stopPropagation(); location.href = `app.html?tl=${tl.id}#viewer`; };
  }
  actions.appendChild(playBtn);

  // Edit → studio
  const editBtn = document.createElement('button');
  editBtn.className = 'btn btn-primary btn-sm';
  editBtn.style.cssText = 'flex:1;';
  editBtn.textContent = t('btn_edit');
  if (typeof SPA !== 'undefined') {
    editBtn.onclick = (e) => { e.stopPropagation(); SPA.navigate('studio', { tl: tl.id }); };
  } else {
    editBtn.onclick = (e) => { e.stopPropagation(); location.href = `app.html?tl=${tl.id}#studio`; };
  }
  actions.appendChild(editBtn);

  card.appendChild(actions);
  return card;
}

// ── Utilitários privados deste ficheiro ───────────────────────
// Prefixo _pv para não colidir com funções globais de mesmo nome

// Barra de cores gerada a partir dos keyframes (guardada para uso futuro)
function _pvColorStrip(keyframes, height) {
  const strip = document.createElement('div');
  strip.style.cssText = `display:flex;height:${height}px;width:100%;flex-shrink:0;`;
  const kfs = (keyframes || []).slice(0, 32);
  if (!kfs.length) { strip.style.background = '#0d0d18'; return strip; }
  const total = kfs.reduce((s, k) => s + (k.duration ?? 2), 0) || 1;
  kfs.forEach(kf => {
    const seg = document.createElement('div');
    const pct = ((kf.duration ?? 2) / total * 100).toFixed(2);
    const color = (typeof EFFECTS !== 'undefined' && EFFECTS[kf.effectId])
      ? EFFECTS[kf.effectId].color : '#8b5cf6';
    seg.style.cssText = `flex:0 0 ${pct}%;background:${color};`;
    strip.appendChild(seg);
  });
  return strip;
}

// Extrai ID de vídeo YouTube de um URL
function _pvExtractId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
    if (u.searchParams.has('v'))         return u.searchParams.get('v');
  } catch {}
  const m = url.match(/[?&]v=([^&]+)/);
  return m ? m[1] : null;
}

// Escapa HTML para segurança
function _pvEsc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Formata data relativa ("2 min atrás", "3h atrás", etc.)
function _pvTimeAgo(date) {
  const d = Math.floor((Date.now() - date.getTime()) / 1000);
  if (d < 60)    return t('time_just_now');
  if (d < 3600)  return Math.floor(d / 60)  + ' ' + t('time_min_ago');
  if (d < 86400) return Math.floor(d / 3600) + t('time_h_ago');
  return Math.floor(d / 86400) + t('time_d_ago');
}
