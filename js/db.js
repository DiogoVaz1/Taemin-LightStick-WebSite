// ============================================================
// db.js — Firestore CRUD for user timelines
// ============================================================
// Data structure:
//   users/{uid}/timelines/{docId}
//     title      : string
//     videoUrl   : string
//     keyframes  : [{t, effectId}]
//     bpm        : number
//     beatOffset : number
//     duration   : number
//     createdAt  : timestamp
//     updatedAt  : timestamp
// ============================================================

function getTimelinesRef(uid) {
  return firebase.firestore().collection('users').doc(uid).collection('timelines');
}

// Save or update the current player timeline
// Returns the saved doc ID
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

  // If we have an active doc ID, update it; otherwise create new
  if (window._activeTimelineId) {
    await getTimelinesRef(currentUser.uid).doc(window._activeTimelineId).update(data);
    return window._activeTimelineId;
  } else {
    data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    const ref = await getTimelinesRef(currentUser.uid).add(data);
    window._activeTimelineId = ref.id;
    return ref.id;
  }
}

// Load all timelines for current user (most recent first)
async function fetchUserTimelines() {
  if (!currentUser) return [];
  const snap = await getTimelinesRef(currentUser.uid)
    .orderBy('updatedAt', 'desc')
    .limit(50)
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Load a specific timeline into the player
function applyTimeline(tl) {
  window._activeTimelineId    = tl.id;
  window._activeTimelineTitle = tl.title || '';

  // Show title in editor bar
  const titleEl = document.getElementById('pebShowTitle');
  if (titleEl) titleEl.textContent = tl.title || '—';

  // Restore video URL
  const urlInput = document.getElementById('ytUrl');
  if (urlInput && tl.videoUrl) urlInput.value = tl.videoUrl;

  // Restore duration
  const durInput = document.getElementById('playerDuration');
  if (durInput && tl.duration) durInput.value = tl.duration;

  // Restore BPM / beat offset
  if (tl.bpm) {
    bpm        = tl.bpm;
    beatOffset = tl.beatOffset || 0;
    const bpmInput = document.getElementById('bpmInput');
    if (bpmInput) bpmInput.value = Math.round(bpm);
  }

  // Restore keyframes
  playerKeyframes = (tl.keyframes || []).map(k => ({ t: k.t, effectId: k.effectId, duration: k.duration ?? 2 }));
  playerKeyframes.sort((a, b) => a.t - b.t);

  // Restore fades
  playerFades = (tl.fades || [])
    .filter(f => typeof f.t === 'number' && typeof f.effectId === 'number' && typeof f.duration === 'number');
  playerFades.sort((a, b) => a.t - b.t);

  // Re-render everything
  renderPlayerTimeline();
  renderFadeTrack();
  renderBeatGrid();
  renderTimeRuler();

  // Load video if URL provided
  if (tl.videoUrl) loadVideo();

  closeTimelinesModal();
  updateSaveBtnLabel();
}

// Delete a timeline
async function deleteTimelineById(id) {
  if (!currentUser) return;
  if (!confirm('Apagar este lightshow?')) return;
  await getTimelinesRef(currentUser.uid).doc(id).delete();
  if (window._activeTimelineId === id) window._activeTimelineId = null;
  openTimelinesModal(); // refresh list
}

// ============================================================
// Save UI
// ============================================================
async function onSaveClick() {
  if (!currentUser) {
    signInWithGoogle();
    return;
  }

  let title = window._activeTimelineTitle || '';
  if (!title && !window._activeTimelineId) {
    // Só pede nome se for um lightshow completamente novo (sem ID ainda)
    const videoUrl = document.getElementById('ytUrl')?.value?.trim() || '';
    const suggested = videoUrl
      ? 'LightShow — ' + (videoUrl.length > 40 ? videoUrl.slice(0, 40) + '…' : videoUrl)
      : 'Novo LightShow';
    title = prompt('Nome do lightshow:', suggested);
    if (!title) return; // user cancelled
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

function updateSaveBtnLabel() {
  const btn = document.getElementById('saveTimelineBtn');
  if (!btn) return;
  btn.textContent = window._activeTimelineId ? '💾 Guardar' : '💾 Guardar';
  btn.disabled = false;
}

// ============================================================
// Timelines modal
// ============================================================
function openTimelinesModal() {
  if (!currentUser) { signInWithGoogle(); return; }
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

// Cache of timelines loaded from Firestore — used by onclick handlers
let _timelinesCache = [];

async function renderTimelinesModal() {
  const list = document.getElementById('timelinesModalList');
  if (!list) return;
  list.innerHTML = '<div style="color:var(--muted);font-size:0.85rem;text-align:center;padding:1rem">A carregar…</div>';

  try {
    const timelines = await fetchUserTimelines();
    _timelinesCache = timelines; // store so onclick can reference by index

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

      // Info section
      const info = document.createElement('div');
      info.className = 'tl-row-info';
      info.innerHTML =
        `<div class="tl-row-title">${escapeHtml(tl.title)}${isActive ? ' <span class="tl-active-badge">atual</span>' : ''}</div>` +
        `<div class="tl-row-meta">${tl.keyframes?.length ?? 0} keyframes · ${tl.bpm ? Math.round(tl.bpm) + ' BPM' : 'sem BPM'} · ${timeAgo}</div>` +
        (tl.videoUrl ? `<div class="tl-row-url">${escapeHtml(tl.videoUrl.slice(0, 60))}${tl.videoUrl.length > 60 ? '…' : ''}</div>` : '');

      // Action buttons — reference by cache index, no JSON in HTML
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

function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatTimeAgo(date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60)   return 'agora mesmo';
  if (diff < 3600) return Math.floor(diff/60) + ' min atrás';
  if (diff < 86400) return Math.floor(diff/3600) + 'h atrás';
  return Math.floor(diff/86400) + 'd atrás';
}

// Load a single timeline by Firestore document ID
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

// Called by auth.js when sign-in state changes
function onAuthReady(user) {
  updateSaveBtnLabel();
  const saveBtn = document.getElementById('saveTimelineBtn');
  const loadBtn = document.getElementById('openTimelinesBtn');
  if (!user) {
    window._activeTimelineId    = null;
    window._activeTimelineTitle = null;
  }
  if (saveBtn) saveBtn.style.display = '';
  if (loadBtn) loadBtn.style.display = '';

  // Auto-load timeline if page was opened with ?tl=ID (from My Lightshows)
  if (user && window._pendingTimelineId) {
    const id = window._pendingTimelineId;
    window._pendingTimelineId = null;
    loadTimelineById(id);
  }
}
