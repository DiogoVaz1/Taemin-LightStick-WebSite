// ============================================================
// community.js — Community Feed
//
// ESTRUTURA FIRESTORE:
//   community/{postId}
//     uid:         string  — UID do autor
//     authorName:  string  — nome de exibição do autor
//     title:       string  — título do lightshow
//     videoUrl:    string  — URL do YouTube
//     keyframes:   array   — [{t, effectId, duration}]
//     fades:       array   — [{t, effectId, duration}]
//     duration:    number  — duração total em segundos
//     bpm:         number  — batimentos por minuto
//     publishedAt: Timestamp — data de publicação
//     updatedAt:   Timestamp — data de última atualização
//     likesCount:  number  — total de likes
//     tlId:        string  — referência ao documento de timeline original
//
//   users/{uid}/communityLikes/{postId}
//     likedAt: Timestamp — quando o utilizador curtiu
//
// REGRAS FIRESTORE NECESSÁRIAS (adicionar no Firebase Console):
//   match /community/{postId} {
//     allow read: if true;
//     allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
//     allow update: if request.auth != null && (
//       resource.data.uid == request.auth.uid ||
//       request.resource.data.diff(resource.data).affectedKeys().hasOnly(['likesCount'])
//     );
//     allow delete: if request.auth != null && resource.data.uid == request.auth.uid;
//   }
//   match /users/{uid}/communityLikes/{postId} {
//     allow read, write: if request.auth != null && request.auth.uid == uid;
//   }
// ============================================================

// ── Estado interno ─────────────────────────────────────────────
let _commPosts = [];          // posts carregados do Firestore
let _commLikes = new Set();   // IDs dos posts que o utilizador curtiu
let _commUser  = null;        // utilizador Firebase actual
let _commQuery = '';          // filtro de pesquisa actual
let _commSort  = 'latest';    // 'latest' | 'likes'

// ── Entry point — chamado pelo router ao entrar na view Community ──
async function loadCommunityFeed() {
  _commUser = null;
  try { _commUser = firebase.auth().currentUser; } catch(e) {}

  _showCommState('loading');

  try {
    // Busca sempre por publishedAt desc (evita necessidade de índice composto)
    const snap = await firebase.firestore()
      .collection('community')
      .orderBy('publishedAt', 'desc')
      .limit(50)
      .get();

    _commPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Carrega os likes do utilizador actual
    _commLikes.clear();
    if (_commUser) {
      try {
        const likesSnap = await firebase.firestore()
          .collection('users').doc(_commUser.uid)
          .collection('communityLikes')
          .get();
        likesSnap.docs.forEach(d => _commLikes.add(d.id));
      } catch(e) { /* utilizador sem likes ainda */ }
    }

    _renderCommGrid();
  } catch(e) {
    _showCommState('error', e.message);
  }
}

// ── Renderiza a grelha (aplica filtro de pesquisa + ordenação) ──
function _renderCommGrid() {
  const grid = document.getElementById('commGrid');
  if (!grid) return;

  let posts = _commPosts;

  // Filtra por pesquisa (título ou autor)
  if (_commQuery) {
    const q = _commQuery.toLowerCase();
    posts = posts.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.authorName || '').toLowerCase().includes(q)
    );
  }

  // Ordena (a Firestore já devolve por publishedAt desc; "likes" ordena no cliente)
  if (_commSort === 'likes') {
    posts = [...posts].sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
  }

  if (posts.length === 0) {
    _showCommState('empty');
    return;
  }

  grid.innerHTML = '';
  posts.forEach((post, idx) => {
    const card = buildCommCard(post);
    card.style.animationDelay = (idx * 0.04) + 's';
    grid.appendChild(card);
  });

  _showCommState('grid');
}

// ── Constrói um card individual ────────────────────────────────
function buildCommCard(post) {
  const card = document.createElement('div');
  card.className = 'ls-card comm-card';
  card.style.cursor = 'pointer';

  // Clicar no card abre o viewer (modo comunidade)
  card.addEventListener('click', () => SPA.navigate('viewer', { post: post.id }));

  // Thumbnail do YouTube
  const videoId = _commExtractId(post.videoUrl || '');
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

  const kfCount = post.keyframes?.length ?? 0;
  const bpmText = post.bpm ? Math.round(post.bpm) + ' BPM' : t('card_no_bpm');
  const durText = _commFmtTime(post.duration || 0);

  const body = document.createElement('div');
  body.className = 'ls-card-body';
  body.innerHTML = `
    <div class="ls-card-title">${escapeHtml(post.title || t('card_no_title'))}</div>
    <div class="ls-card-meta">
      ${escapeHtml(post.authorName || '—')} · ${durText} · ${kfCount} ${t('card_segments')} · ${bpmText}
    </div>`;
  card.appendChild(body);

  // Botões de acção
  const actions = document.createElement('div');
  actions.className = 'ls-card-actions';

  // Play → viewer comunidade (stopPropagation evita double-fire com o click do card)
  const playBtn = document.createElement('button');
  playBtn.className = 'btn btn-success btn-sm';
  playBtn.style.flex = '1';
  playBtn.textContent = t('btn_play');
  playBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    SPA.navigate('viewer', { post: post.id });
  });
  actions.appendChild(playBtn);

  // Like ❤️ (stopPropagation evita navegar para o viewer)
  const liked = _commLikes.has(post.id);
  const likeBtn = document.createElement('button');
  likeBtn.className = 'btn btn-ghost btn-sm comm-like-btn' + (liked ? ' liked' : '');
  likeBtn.dataset.postId = post.id;
  likeBtn.dataset.liked  = liked ? '1' : '0';
  likeBtn.dataset.count  = post.likesCount || 0;
  likeBtn.textContent    = (liked ? '❤️' : '🤍') + ' ' + (post.likesCount || 0);
  likeBtn.title          = liked ? t('viewer_liked') : t('viewer_like');
  likeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleCommLike(post.id, likeBtn);
  });
  actions.appendChild(likeBtn);

  card.appendChild(actions);
  return card;
}

// ── Like / Unlike ──────────────────────────────────────────────
// Usa actualização optimista (actualiza UI imediatamente, reverte em caso de erro).
async function toggleCommLike(postId, btn) {
  const user = firebase.auth().currentUser;
  if (!user) {
    alert(t('comm_like_signin'));
    return;
  }

  const liked = btn.dataset.liked === '1';
  const count = parseInt(btn.dataset.count) || 0;
  btn.disabled = true;

  // Actualização optimista — reflecte o estado final antes da resposta do servidor
  const newLiked = !liked;
  const newCount = liked ? count - 1 : count + 1;
  btn.textContent   = (newLiked ? '❤️' : '🤍') + ' ' + newCount;
  btn.className     = 'btn btn-ghost btn-sm comm-like-btn' + (newLiked ? ' liked' : '');
  btn.dataset.liked = newLiked ? '1' : '0';
  btn.dataset.count = newCount;
  if (newLiked) _commLikes.add(postId); else _commLikes.delete(postId);

  try {
    const likeRef = firebase.firestore()
      .collection('users').doc(user.uid)
      .collection('communityLikes').doc(postId);
    const postRef = firebase.firestore().collection('community').doc(postId);

    if (liked) {
      // Era liked → unlike
      await likeRef.delete();
      await postRef.update({ likesCount: firebase.firestore.FieldValue.increment(-1) });
    } else {
      // Não era liked → like
      await likeRef.set({ likedAt: firebase.firestore.FieldValue.serverTimestamp() });
      await postRef.update({ likesCount: firebase.firestore.FieldValue.increment(1) });
    }

    // Actualiza o cache em memória
    const p = _commPosts.find(x => x.id === postId);
    if (p) p.likesCount = newCount;

  } catch(e) {
    // Reverte o estado optimista em caso de erro
    btn.textContent   = (liked ? '❤️' : '🤍') + ' ' + count;
    btn.className     = 'btn btn-ghost btn-sm comm-like-btn' + (liked ? ' liked' : '');
    btn.dataset.liked = liked ? '1' : '0';
    btn.dataset.count = count;
    if (liked) _commLikes.add(postId); else _commLikes.delete(postId);
    alert('Error: ' + e.message);
  }

  btn.disabled = false;
}

// ── Publicar na comunidade ─────────────────────────────────────
// Chamado a partir do botão "Share" nos cards de My Lightshows.
// Cria um documento em community/ e actualiza o timeline com communityPostId.
async function publishToCommunity(tl, shareBtn) {
  if (!confirm(t('comm_publish_confirm'))) return;

  const user = firebase.auth().currentUser;
  if (!user) { alert(t('viewer_login_req')); return; }

  shareBtn.disabled    = true;
  shareBtn.textContent = '⏳';

  try {
    const postData = {
      uid:         user.uid,
      authorName:  user.displayName || (user.email ? user.email.split('@')[0] : 'Fan'),
      title:       tl.title || t('card_no_title'),
      videoUrl:    tl.videoUrl || '',
      keyframes:   tl.keyframes || [],
      fades:       tl.fades || [],
      duration:    tl.duration || 60,
      bpm:         tl.bpm || 0,
      publishedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt:   firebase.firestore.FieldValue.serverTimestamp(),
      likesCount:  0,
      tlId:        tl.id,
    };

    // Cria o post na colecção community
    const postRef = await firebase.firestore().collection('community').add(postData);

    // Liga o timeline ao post (para poder actualizar/remover depois)
    await getTimelinesRef(user.uid).doc(tl.id).update({
      communityPostId: postRef.id,
      isPublic: true,
    });

    // Actualiza o botão para estado "publicado"
    _setShareBtnPublished(shareBtn, postRef.id, tl.id);
    tl.communityPostId = postRef.id; // actualiza o objecto em memória

  } catch(e) {
    alert('Error publishing: ' + e.message);
    _setShareBtnUnpublished(shareBtn, tl);
  }

  shareBtn.disabled = false;
}

// ── Remover da comunidade ──────────────────────────────────────
// Apaga o documento community/{postId} e remove communityPostId do timeline.
async function unpublishFromCommunity(postId, tlId, shareBtn) {
  if (!confirm(t('comm_unpublish_confirm'))) return;

  const user = firebase.auth().currentUser;
  if (!user) return;

  shareBtn.disabled    = true;
  shareBtn.textContent = '⏳';

  try {
    // Apaga o post da comunidade
    await firebase.firestore().collection('community').doc(postId).delete();

    // Remove communityPostId e marca como privado
    await getTimelinesRef(user.uid).doc(tlId).update({
      communityPostId: firebase.firestore.FieldValue.delete(),
      isPublic:        false,
    });

    // Actualiza o botão para estado "não publicado"
    const tl = { id: tlId, communityPostId: null };
    _setShareBtnUnpublished(shareBtn, tl);

  } catch(e) {
    alert('Error removing: ' + e.message);
    _setShareBtnPublished(shareBtn, postId, tlId);
  }

  shareBtn.disabled = false;
}

// ── Helpers para o botão de partilha ──────────────────────────

// Estado: publicado (verde com ícone 🌐)
function _setShareBtnPublished(btn, postId, tlId) {
  btn.textContent   = t('comm_published_btn');
  btn.title         = t('comm_unpublish_confirm');
  btn.className     = 'btn btn-sm comm-share-btn comm-share-published';
  btn.dataset.post  = postId;
  btn.dataset.tl    = tlId;
  btn.onclick       = (e) => { e.stopPropagation(); unpublishFromCommunity(postId, tlId, btn); };
}

// Estado: não publicado (ghost com ícone 🌐)
function _setShareBtnUnpublished(btn, tl) {
  btn.textContent   = t('comm_publish_btn');
  btn.title         = t('comm_publish_confirm');
  btn.className     = 'btn btn-ghost btn-sm comm-share-btn';
  btn.dataset.post  = '';
  btn.dataset.tl    = tl.id;
  btn.onclick       = (e) => { e.stopPropagation(); publishToCommunity(tl, btn); };
}

// ── Pesquisa ───────────────────────────────────────────────────
// Chamado pelo oninput do campo de pesquisa
function commSearch(val) {
  _commQuery = val;
  _renderCommGrid();
}

// ── Ordenação ──────────────────────────────────────────────────
// Chamado pelo onchange do select de ordenação
function commSetSort(val) {
  _commSort = val;
  _renderCommGrid(); // re-ordena em memória, sem nova consulta ao Firestore
}

// ── Máquina de estados da página ──────────────────────────────
function _showCommState(state, msg) {
  const loading = document.getElementById('commLoading');
  const empty   = document.getElementById('commEmpty');
  const error   = document.getElementById('commError');
  const grid    = document.getElementById('commGrid');

  if (loading) loading.style.display = state === 'loading' ? '' : 'none';
  if (empty)   empty.style.display   = state === 'empty'   ? '' : 'none';
  if (error)   error.style.display   = state === 'error'   ? '' : 'none';
  if (grid)    grid.style.display    = state === 'grid'    ? '' : 'none';

  if (state === 'error' && msg) {
    const msgEl = document.getElementById('commErrorMsg');
    if (msgEl) msgEl.textContent = msg;
  }
}

// ── Card para a preview da Home (versão simplificada) ──────────
// Chamado por index-preview.js para mostrar posts reais na home.
function buildCommHomeCard(post) {
  const card = document.createElement('div');
  card.className = 'ls-card home-community-card';
  card.style.cursor = 'pointer';

  // Clicar → viewer (modo comunidade)
  card.addEventListener('click', () => SPA.navigate('viewer', { post: post.id }));

  const videoId = _commExtractId(post.videoUrl || '');
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

  const kfCount = post.keyframes?.length ?? 0;
  const bpmText = post.bpm ? Math.round(post.bpm) + ' BPM' : '';

  const body = document.createElement('div');
  body.className = 'ls-card-body';
  body.innerHTML = `
    <div class="ls-card-title">${escapeHtml(post.title || t('card_no_title'))}</div>
    <div class="ls-card-meta">${escapeHtml(post.authorName || '—')} · ${kfCount} ${t('card_segments')}${bpmText ? ' · ' + bpmText : ''}</div>`;
  card.appendChild(body);

  const actions = document.createElement('div');
  actions.className = 'ls-card-actions';

  const playBtn = document.createElement('button');
  playBtn.className = 'btn btn-success btn-sm';
  playBtn.style.flex = '1';
  playBtn.textContent = t('btn_play');
  playBtn.addEventListener('click', (e) => { e.stopPropagation(); SPA.navigate('viewer', { post: post.id }); });
  actions.appendChild(playBtn);

  const likeSpan = document.createElement('span');
  likeSpan.style.cssText = 'font-size:0.8rem;color:var(--muted);align-self:center;padding-left:0.25rem';
  likeSpan.textContent = '❤️ ' + (post.likesCount || 0);
  actions.appendChild(likeSpan);

  card.appendChild(actions);
  return card;
}

// ── Utilitários privados ───────────────────────────────────────

// Extrai ID de vídeo YouTube de um URL
function _commExtractId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
    if (u.searchParams.has('v'))         return u.searchParams.get('v');
  } catch {}
  return (url.match(/[?&]v=([^&]+)/) || [])[1] || null;
}

// Formata segundos como "M:SS"
function _commFmtTime(s) {
  const m   = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}
