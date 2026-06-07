// ============================================================
// db.js — CRUD de Lightshows no Firestore
//
// ESTRUTURA NO FIRESTORE:
//   users/{uid}/timelines/{docId}
//     title        : string  — nome do lightshow
//     videoUrl     : string  — URL do YouTube
//     keyframes    : array   — [{t, effectId, duration}] lista de cues de luz
//     fades        : array   — [{t, effectId, duration}] transições suaves
//     bpm          : number  — batimentos por minuto
//     beatOffset   : number  — offset do primeiro beat (ms)
//     duration     : number  — duração total em segundos
//     isPublic     : boolean — true se partilhado na comunidade
//     createdAt    : timestamp
//     updatedAt    : timestamp
//
// VARIÁVEIS GLOBAIS USADAS:
//   currentUser           — de auth.js (utilizador actual)
//   playerKeyframes       — de player.js (lista de keyframes em edição)
//   playerFades           — de player.js (lista de fades em edição)
//   bpm / beatOffset      — de player.js
//   window._activeTimelineId    — ID do lightshow aberto no studio
//   window._activeTimelineTitle — título do lightshow aberto
// ============================================================

// ============================================================
// Guardar ou actualizar o lightshow actual no Firestore
// Retorna o ID do documento guardado.
// ============================================================
async function saveCurrentTimeline(title) {
  if (!currentUser) { alert('Faz login primeiro.'); return null; }

  const dur = parseFloat(document.getElementById('playerDuration')?.value) || 60;
  const data = {
    title,
    videoUrl:   document.getElementById('ytUrl')?.value?.trim() || '',
    keyframes:  playerKeyframes,
    fades:      playerFades || [],
    bpm:        bpm || 0,
    beatOffset: beatOffset || 0,
    duration:   dur,
    updatedAt:  firebase.firestore.FieldValue.serverTimestamp(),
  };

  if (window._activeTimelineId) {
    // Já existe → actualiza o documento existente
    await getTimelinesRef(currentUser.uid).doc(window._activeTimelineId).update(data);
    return window._activeTimelineId;
  } else {
    // Novo lightshow → cria documento novo
    data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    const ref = await getTimelinesRef(currentUser.uid).add(data);
    window._activeTimelineId = ref.id; // guarda o ID para futuros saves
    return ref.id;
  }
}

// Carrega todos os lightshows do utilizador (mais recentes primeiro)
async function fetchUserTimelines() {
  if (!currentUser) return [];
  const snap = await getTimelinesRef(currentUser.uid)
    .orderBy('updatedAt', 'desc')
    .limit(50)
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ============================================================
// Aplicar um lightshow ao editor (studio)
// Carrega todos os dados do lightshow nos controlos do editor.
// ============================================================
function applyTimeline(tl) {
  window._activeTimelineId    = tl.id;
  window._activeTimelineTitle = tl.title || '';

  // Mostra o título na barra do editor
  const titleEl = document.getElementById('pebShowTitle');
  if (titleEl) titleEl.textContent = tl.title || '—';

  // Restaura o URL do vídeo
  const urlInput = document.getElementById('ytUrl');
  if (urlInput && tl.videoUrl) urlInput.value = tl.videoUrl;

  // Restaura a duração
  const durInput = document.getElementById('playerDuration');
  if (durInput && tl.duration) durInput.value = tl.duration;

  // Restaura BPM e offset
  if (tl.bpm) {
    bpm        = tl.bpm;
    beatOffset = tl.beatOffset || 0;
    const bpmInput = document.getElementById('bpmInput');
    if (bpmInput) bpmInput.value = Math.round(bpm);
  }

  // Restaura keyframes (cues de luz)
  // Garante que cada keyframe tem os campos necessários e ordena por tempo
  playerKeyframes = (tl.keyframes || []).map(k => ({ t: k.t, effectId: k.effectId, duration: k.duration ?? 2 }));
  playerKeyframes.sort((a, b) => a.t - b.t);

  // Restaura fades (transições suaves entre cores)
  playerFades = (tl.fades || [])
    .filter(f => typeof f.t === 'number' && typeof f.effectId === 'number' && typeof f.duration === 'number');
  playerFades.sort((a, b) => a.t - b.t);

  // Re-renderiza todos os componentes visuais do studio
  renderPlayerTimeline();
  renderFadeTrack();
  renderBeatGrid();
  renderTimeRuler();

  // Carrega o vídeo se existir URL
  if (tl.videoUrl) loadVideo();

  // Mostra o botão de visibilidade (público/privado) com o estado actual
  const visBtn = document.getElementById('studioVisibilityBtn');
  if (visBtn) {
    visBtn.style.display = '';
    _studioSetVisibilityBtn(tl.isPublic || false);
  }

  closeTimelinesModal();
  updateSaveBtnLabel();
}

// Apaga um lightshow do Firestore
async function deleteTimelineById(id) {
  if (!currentUser) return;
  if (!confirm('Apagar este lightshow?')) return;
  await getTimelinesRef(currentUser.uid).doc(id).delete();
  // Se era o lightshow activo, limpa o estado
  if (window._activeTimelineId === id) window._activeTimelineId = null;
  openTimelinesModal(); // actualiza a lista
}

// ============================================================
// Visibilidade (Público / Privado) — integrado com a Comunidade
//
// Tornar público  → cria automaticamente um post em community/
// Tornar privado  → apaga o post de community/ se existir
//
// Desta forma o toggle 🔒/🌐 é a única acção necessária para
// partilhar ou retirar da comunidade.
// ============================================================

async function setShowVisibility(tlId, makePublic) {
  if (!currentUser || !tlId) return;

  const tlRef = getTimelinesRef(currentUser.uid).doc(tlId);

  // Precisamos dos dados completos para criar o post de comunidade
  const tlDoc = await tlRef.get();
  if (!tlDoc.exists) return;
  const tlData = { id: tlDoc.id, ...tlDoc.data() };

  if (makePublic && !tlData.communityPostId) {
    // ── Tornar público → publicar na comunidade ──────────────
    const postData = {
      uid:         currentUser.uid,
      authorName:  currentUser.displayName ||
                   (currentUser.email ? currentUser.email.split('@')[0] : 'Fan'),
      title:       tlData.title || 'LightShow',
      videoUrl:    tlData.videoUrl || '',
      keyframes:   tlData.keyframes || [],
      fades:       tlData.fades || [],
      duration:    tlData.duration || 60,
      bpm:         tlData.bpm || 0,
      publishedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt:   firebase.firestore.FieldValue.serverTimestamp(),
      likesCount:  0,
      tlId:        tlId,
    };
    const postRef = await firebase.firestore().collection('community').add(postData);
    await tlRef.update({ isPublic: true, communityPostId: postRef.id });

  } else if (!makePublic && tlData.communityPostId) {
    // ── Tornar privado → remover da comunidade ───────────────
    try {
      await firebase.firestore().collection('community').doc(tlData.communityPostId).delete();
    } catch(e) { console.warn('[db] community delete:', e.message); }
    await tlRef.update({
      isPublic:        false,
      communityPostId: firebase.firestore.FieldValue.delete(),
    });

  } else {
    // ── Apenas actualiza isPublic (sem mudança de estado de comunidade) ──
    await tlRef.update({ isPublic: makePublic });
  }
}

// Actualiza o botão de visibilidade no studio
function _studioSetVisibilityBtn(isPublic) {
  const btn = document.getElementById('studioVisibilityBtn');
  if (!btn) return;
  btn.textContent = isPublic ? '🌐' : '🔒';
  btn.title       = isPublic
    ? (typeof t === 'function' ? t('vis_public_tip')  : 'Public — click to make private')
    : (typeof t === 'function' ? t('vis_private_tip') : 'Private — click to make public');
  btn.className   = 'btn btn-sm vis-toggle-btn ' + (isPublic ? 'vis-public' : 'vis-private');
  btn.dataset.pub = isPublic ? '1' : '0';
}

// Alterna visibilidade quando o botão é clicado no studio
async function studioToggleVisibility() {
  const tlId = window._activeTimelineId;
  const btn  = document.getElementById('studioVisibilityBtn');
  if (!tlId || !btn) return;
  const isPublic = btn.dataset.pub === '1';
  btn.disabled   = true;
  try {
    await setShowVisibility(tlId, !isPublic);
    _studioSetVisibilityBtn(!isPublic);
  } catch(e) { alert(e.message); }
  btn.disabled = false;
}

// ============================================================
// UI do botão Save
// ============================================================

async function onSaveClick() {
  if (!currentUser) {
    openSignInModal();
    return;
  }

  let title = window._activeTimelineTitle || '';

  // Só pede o nome se for um lightshow completamente novo (sem ID)
  if (!title && !window._activeTimelineId) {
    const videoUrl = document.getElementById('ytUrl')?.value?.trim() || '';
    const suggested = videoUrl
      ? 'LightShow — ' + (videoUrl.length > 40 ? videoUrl.slice(0, 40) + '…' : videoUrl)
      : 'Novo LightShow';
    title = prompt('Nome do lightshow:', suggested);
    if (!title) return; // utilizador cancelou
  } else if (!title) {
    title = 'LightShow';
  }

  window._activeTimelineTitle = title;

  const btn = document.getElementById('saveTimelineBtn');
  if (btn) { btn.disabled = true; btn.textContent = '💾 A guardar…'; }

  try {
    await saveCurrentTimeline(title);
    if (btn) { btn.textContent = '✓ Guardado'; btn.disabled = false; }
    setTimeout(updateSaveBtnLabel, 2000);
  } catch(e) {
    alert('Erro ao guardar: ' + e.message);
    if (btn) { btn.disabled = false; updateSaveBtnLabel(); }
  }
}

// Actualiza o label do botão Save e gere a visibilidade do botão de público/privado
function updateSaveBtnLabel() {
  const btn = document.getElementById('saveTimelineBtn');
  if (btn) { btn.textContent = '💾 Guardar'; btn.disabled = false; }
  // Esconde o botão de visibilidade quando não há lightshow carregado
  const visBtn = document.getElementById('studioVisibilityBtn');
  if (visBtn) visBtn.style.display = window._activeTimelineId ? '' : 'none';
}

// ============================================================
// Modal de listagem de lightshows (dentro do studio)
// ============================================================
function openTimelinesModal() {
  if (!currentUser) { openSignInModal(); return; }
  const modal = document.getElementById('timelinesModal');
  if (modal) {
    modal.style.display = 'flex';
    renderTimelinesModal();
  }
}

function closeTimelinesModal() {
  const modal = document.getElementById('timelinesModal');
  if (modal) modal.style.display = 'none';
}

// Cache dos lightshows carregados — evita re-fetch ao clicar em "Carregar"
let _timelinesCache = [];

async function renderTimelinesModal() {
  const list = document.getElementById('timelinesModalList');
  if (!list) return;
  list.innerHTML = '<div style="color:var(--muted);font-size:0.85rem;text-align:center;padding:1rem">A carregar…</div>';

  try {
    const timelines = await fetchUserTimelines();
    _timelinesCache = timelines;

    if (timelines.length === 0) {
      list.innerHTML = '<div class="tl-empty">Ainda não tens lightshows guardados.</div>';
      return;
    }

    list.innerHTML = '';
    timelines.forEach((tl, idx) => {
      const updatedAt = tl.updatedAt?.toDate?.() ?? new Date();
      const timeAgo   = formatTimeAgo(updatedAt);
      const isActive  = tl.id === window._activeTimelineId;

      const row = document.createElement('div');
      row.className = 'tl-row' + (isActive ? ' tl-row-active' : '');

      const info = document.createElement('div');
      info.className = 'tl-row-info';
      info.innerHTML =
        `<div class="tl-row-title">${escapeHtml(tl.title)}${isActive ? ' <span class="tl-active-badge">atual</span>' : ''}</div>` +
        `<div class="tl-row-meta">${tl.keyframes?.length ?? 0} keyframes · ${tl.bpm ? Math.round(tl.bpm) + ' BPM' : 'sem BPM'} · ${timeAgo}</div>` +
        (tl.videoUrl ? `<div class="tl-row-url">${escapeHtml(tl.videoUrl.slice(0, 60))}${tl.videoUrl.length > 60 ? '…' : ''}</div>` : '');

      const actions = document.createElement('div');
      actions.className = 'tl-row-actions';

      const loadBtn = document.createElement('button');
      loadBtn.className = 'btn btn-primary';
      loadBtn.style.cssText = 'font-size:0.75rem;padding:0.3rem 0.7rem';
      loadBtn.textContent = 'Carregar';
      loadBtn.addEventListener('click', () => applyTimeline(_timelinesCache[idx]));

      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-danger';
      delBtn.style.cssText = 'font-size:0.75rem;padding:0.3rem 0.7rem';
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', () => deleteTimelineById(tl.id));

      actions.appendChild(loadBtn);
      actions.appendChild(delBtn);
      row.appendChild(info);
      row.appendChild(actions);
      list.appendChild(row);
    });
  } catch(e) {
    list.innerHTML = `<div style="color:#ef4444;font-size:0.8rem;padding:0.5rem">Erro: ${e.message}</div>`;
  }
}

// Carrega um lightshow específico pelo ID do documento Firestore
// Usado pelo router quando se navega para studio com ?tl=ID
async function loadTimelineById(id) {
  if (!currentUser) return;
  try {
    const doc = await getTimelinesRef(currentUser.uid).doc(id).get();
    if (doc.exists) {
      applyTimeline({ id: doc.id, ...doc.data() });
    } else {
      console.warn('[db] Timeline not found:', id);
    }
  } catch(e) {
    console.error('[db] loadTimelineById error:', e);
  }
}

// ============================================================
// Callback de autenticação para o studio
// Chamado pelo router (app-router.js) quando o Firebase resolve o auth.
// ============================================================
function _dbOnAuthReady(user) {
  updateSaveBtnLabel();
  const saveBtn = document.getElementById('saveTimelineBtn');
  const loadBtn = document.getElementById('openTimelinesBtn');
  if (!user) {
    // Utilizador não autenticado — limpa o estado
    window._activeTimelineId    = null;
    window._activeTimelineTitle = null;
  }
  if (saveBtn) saveBtn.style.display = '';
  if (loadBtn) loadBtn.style.display = '';

  // Se o studio foi aberto com ?tl=ID (vindo do My Lightshows),
  // carrega esse lightshow assim que o auth resolver
  if (user && window._pendingTimelineId) {
    const id = window._pendingTimelineId;
    window._pendingTimelineId = null;
    loadTimelineById(id);
  }
}

// ============================================================
// Compatibilidade com modo standalone (player.html sem SPA)
// Estes fallbacks existem se o ficheiro for usado sem app-router.js
// ============================================================
if (typeof SPA === 'undefined') {
  window.onAuthReady = _dbOnAuthReady;
  if (typeof escapeHtml    === 'undefined') window.escapeHtml    = function(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
  if (typeof formatTimeAgo === 'undefined') window.formatTimeAgo = function(date) { const d=Math.floor((Date.now()-date.getTime())/1000); if(d<60) return 'agora mesmo'; if(d<3600) return Math.floor(d/60)+' min atrás'; if(d<86400) return Math.floor(d/3600)+'h atrás'; return Math.floor(d/86400)+'d atrás'; };
  if (typeof getTimelinesRef=== 'undefined') window.getTimelinesRef= function(uid) { return firebase.firestore().collection('users').doc(uid).collection('timelines'); };
}
