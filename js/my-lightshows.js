// ============================================================
// my-lightshows.js — Página "Os Meus Lightshows"
//
// FUNÇÃO:
//   Mostra uma grid de cards com os lightshows guardados do utilizador.
//   Cada card tem: thumbnail do YouTube, título, meta-info, e botões
//   Play (→ viewer), Edit (→ studio), Delete.
//   Clicar em qualquer parte do card também vai para o viewer.
//
// ESTADOS DA PÁGINA (geridos por showState):
//   loading  — a carregar do Firestore
//   signIn   — utilizador não autenticado
//   empty    — sem lightshows ainda
//   error    — erro ao carregar
//   grid     — mostra a grid de cards
// ============================================================

// Chamado pelo router quando o Firebase resolve o auth e a view activa é 'lightshows'
function _mlsOnAuthReady(user) {
  if (!user) showState('signIn');
  else       loadShows();
}

// ── Carrega lightshows do Firestore ───────────────────────────
async function loadShows() {
  const user = firebase.auth().currentUser;
  if (!user) { showState('signIn'); return; }

  showState('loading');
  try {
    // Busca os últimos 50 lightshows ordenados por data de actualização
    const snap = await getTimelinesRef(user.uid)
      .orderBy('updatedAt', 'desc')
      .limit(50)
      .get();

    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (list.length === 0) { showState('empty'); return; }
    renderShows(list);
  } catch(e) {
    showState('error', e.message);
  }
}

// ── Renderiza a grid de cards ──────────────────────────────────
function renderShows(list) {
  const grid = document.getElementById('lsGrid');
  grid.innerHTML = '';
  list.forEach((tl, idx) => {
    const card = buildCard(tl, idx);
    grid.appendChild(card);
  });
  showState('grid');
}

// ── Constrói um card individual ───────────────────────────────
function buildCard(tl, idx) {
  const card = document.createElement('div');
  card.className = 'ls-card';
  card.style.animationDelay = (idx * 0.05) + 's'; // animação em cascata
  card.style.cursor = 'pointer';

  // Clicar em qualquer parte do card → viewer
  card.addEventListener('click', () => SPA.navigate('viewer', { tl: tl.id }));

  const videoId   = extractVideoId(tl.videoUrl || '');
  const updatedAt = tl.updatedAt?.toDate?.() ?? new Date();
  const timeAgo   = formatTimeAgo(updatedAt);
  const kfCount   = tl.keyframes?.length ?? 0;
  const bpmText   = tl.bpm ? Math.round(tl.bpm) + ' BPM' : t('card_no_bpm');

  // ── Thumbnail do YouTube ──────────────────────────────────
  if (videoId) {
    const thumb = document.createElement('div');
    thumb.className = 'ls-card-thumb';
    thumb.innerHTML = `
      <img src="https://img.youtube.com/vi/${videoId}/mqdefault.jpg"
           alt="thumbnail" loading="lazy"
           onerror="this.parentElement.style.display='none'">
      <div class="ls-card-thumb-overlay"></div>`;
    card.appendChild(thumb);
  }

  // ── Corpo com título e meta-informação ────────────────────
  const body = document.createElement('div');
  body.className = 'ls-card-body';
  body.innerHTML = `
    <div class="ls-card-title">${escapeHtml(tl.title || t('card_no_title'))}</div>
    <div class="ls-card-meta">${kfCount} ${t('card_segments')} · ${bpmText} · ${timeAgo}</div>
    ${tl.videoUrl
      ? `<div class="ls-card-url">${escapeHtml(tl.videoUrl.replace('https://','').slice(0,55))}${tl.videoUrl.length>60?'…':''}</div>`
      : ''}`;
  card.appendChild(body);

  // ── Botões de acção ───────────────────────────────────────
  // stopPropagation() em cada botão para não disparar o click do card
  const actions = document.createElement('div');
  actions.className = 'ls-card-actions';

  // Play → viewer
  const playBtn = document.createElement('button');
  playBtn.className = 'btn btn-success btn-sm';
  playBtn.style.flex = '1';
  playBtn.textContent = t('btn_play');
  playBtn.addEventListener('click', (e) => { e.stopPropagation(); SPA.navigate('viewer', { tl: tl.id }); });
  actions.appendChild(playBtn);

  // Edit → studio
  const editBtn = document.createElement('button');
  editBtn.className = 'btn btn-primary btn-sm';
  editBtn.style.flex = '1';
  editBtn.textContent = t('btn_edit');
  editBtn.addEventListener('click', (e) => { e.stopPropagation(); SPA.navigate('studio', { tl: tl.id }); });
  actions.appendChild(editBtn);

  // Share → publica/remove da comunidade
  const shareBtn = document.createElement('button');
  if (tl.communityPostId) {
    // Já publicado — botão "Shared"
    if (typeof _setShareBtnPublished === 'function') {
      _setShareBtnPublished(shareBtn, tl.communityPostId, tl.id);
    }
  } else {
    // Não publicado — botão "Share"
    if (typeof _setShareBtnUnpublished === 'function') {
      _setShareBtnUnpublished(shareBtn, tl);
    }
  }
  actions.appendChild(shareBtn);

  // Delete → confirma e apaga (incluindo post de comunidade se existir)
  const delBtn = document.createElement('button');
  delBtn.className = 'btn btn-ghost btn-sm';
  delBtn.textContent = '🗑️';
  delBtn.title = t('btn_delete_title');
  delBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteShow(tl.id, card, tl.communityPostId); });
  actions.appendChild(delBtn);

  card.appendChild(actions);
  return card;
}

// ── Apagar lightshow ──────────────────────────────────────────
// communityPostId: se o lightshow estava publicado, apaga também o post da comunidade
async function deleteShow(id, cardEl, communityPostId) {
  const user = firebase.auth().currentUser;
  if (!user) return;
  if (!confirm(t('confirm_delete'))) return;

  // Feedback visual imediato — desactiva o card
  cardEl.style.opacity = '0.4';
  cardEl.style.pointerEvents = 'none';

  try {
    // Se estava publicado na comunidade, apaga o post de comunidade primeiro
    if (communityPostId) {
      try {
        await firebase.firestore().collection('community').doc(communityPostId).delete();
      } catch(e) { console.warn('[mls] Could not delete community post:', e.message); }
    }
    await getTimelinesRef(user.uid).doc(id).delete();
    // Animação de saída e remoção do DOM
    cardEl.style.transition = 'all 0.3s';
    cardEl.style.transform  = 'scale(0.85)';
    cardEl.style.opacity    = '0';
    setTimeout(() => {
      cardEl.remove();
      const grid = document.getElementById('lsGrid');
      if (grid && grid.children.length === 0) showState('empty');
    }, 300);
  } catch(e) {
    alert(t('error_delete') + e.message);
    cardEl.style.opacity = '1';
    cardEl.style.pointerEvents = '';
  }
}

// ── Máquina de estados da página ─────────────────────────────
// Mostra apenas o estado relevante, esconde os restantes
function showState(state, msg) {
  document.getElementById('lsLoading').style.display = state === 'loading'  ? '' : 'none';
  document.getElementById('lsSignIn' ).style.display = state === 'signIn'   ? '' : 'none';
  document.getElementById('lsEmpty'  ).style.display = state === 'empty'    ? '' : 'none';
  document.getElementById('lsError'  ).style.display = state === 'error'    ? '' : 'none';
  document.getElementById('lsGrid'   ).style.display = state === 'grid'     ? '' : 'none';
  if (state === 'error' && msg) document.getElementById('lsErrorMsg').textContent = msg;
}

// ── Utilitários (fallbacks para modo standalone) ──────────────
// Em modo SPA, estas funções vêm do app-router.js.
// Em modo standalone (my-lightshows.html directo), definimos aqui.
if (typeof extractVideoId === 'undefined') {
  window.extractVideoId = function(url) {
    if (!url) return null;
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
      if (u.searchParams.has('v'))         return u.searchParams.get('v');
    } catch(e) {}
    const m = url.match(/[?&]v=([^&]+)/);
    return m ? m[1] : null;
  };
}
if (typeof escapeHtml === 'undefined') {
  window.escapeHtml = function(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  };
}
if (typeof formatTimeAgo === 'undefined') {
  window.formatTimeAgo = function(date) {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60)    return typeof t === 'function' ? t('time_just_now') : 'just now';
    if (diff < 3600)  return Math.floor(diff / 60) + ' min ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  };
}
if (typeof getTimelinesRef === 'undefined') {
  window.getTimelinesRef = function(uid) {
    return firebase.firestore().collection('users').doc(uid).collection('timelines');
  };
}

// Modo standalone: regista como callback global de auth
if (typeof SPA === 'undefined') window.onAuthReady = _mlsOnAuthReady;
