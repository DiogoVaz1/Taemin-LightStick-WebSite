// ============================================================
// my-lightshows.js — "My Lightshows" page logic
// ============================================================

// Called by auth.js when sign-in state changes
function onAuthReady(user) {
  if (!user) {
    showState('signIn');
  } else {
    loadShows();
  }
}

// ── Firestore helpers ────────────────────────────────────────
function getTimelinesRef(uid) {
  return firebase.firestore()
    .collection('users').doc(uid).collection('timelines');
}

async function loadShows() {
  const user = firebase.auth().currentUser;
  if (!user) { showState('signIn'); return; }

  showState('loading');
  try {
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

// ── Render ───────────────────────────────────────────────────
function renderShows(list) {
  const grid = document.getElementById('lsGrid');
  grid.innerHTML = '';

  list.forEach((tl, idx) => {
    const card = buildCard(tl, idx);
    grid.appendChild(card);
  });

  showState('grid');
}

function buildCard(tl, idx) {
  const card = document.createElement('div');
  card.className = 'ls-card';
  card.style.animationDelay = (idx * 0.05) + 's';

  const videoId   = extractVideoId(tl.videoUrl || '');
  const updatedAt = tl.updatedAt?.toDate?.() ?? new Date();
  const timeAgo   = formatTimeAgo(updatedAt);
  const kfCount   = tl.keyframes?.length ?? 0;
  const bpmText   = tl.bpm ? Math.round(tl.bpm) + ' BPM' : t('card_no_bpm');

  // ── Top section: thumbnail or colour strip ────────────────
  if (videoId) {
    const thumb = document.createElement('div');
    thumb.className = 'ls-card-thumb';
    thumb.innerHTML = `
      <img src="https://img.youtube.com/vi/${videoId}/mqdefault.jpg"
           alt="thumbnail" loading="lazy"
           onerror="this.parentElement.style.display='none'">
      <div class="ls-card-thumb-overlay"></div>`;
    const strip = colorStrip(tl.keyframes, 38);
    strip.style.cssText += 'position:absolute;bottom:0;left:0;width:100%;opacity:0.85;border-radius:0;';
    thumb.appendChild(strip);
    card.appendChild(thumb);
  } else {
    card.appendChild(colorStrip(tl.keyframes, 44));
  }

  // ── Body ──────────────────────────────────────────────────
  const body = document.createElement('div');
  body.className = 'ls-card-body';
  body.innerHTML = `
    <div class="ls-card-title">${escapeHtml(tl.title || t('card_no_title'))}</div>
    <div class="ls-card-meta">${kfCount} ${t('card_segments')} · ${bpmText} · ${timeAgo}</div>
    ${tl.videoUrl
      ? `<div class="ls-card-url">${escapeHtml(tl.videoUrl.replace('https://','').slice(0,55))}${tl.videoUrl.length>60?'…':''}</div>`
      : ''}`;
  card.appendChild(body);

  // ── Actions ───────────────────────────────────────────────
  const actions = document.createElement('div');
  actions.className = 'ls-card-actions';

  const playBtn = document.createElement('a');
  playBtn.className = 'btn btn-success btn-sm';
  playBtn.style.flex = '1';
  playBtn.style.textAlign = 'center';
  playBtn.textContent = t('btn_play');
  playBtn.href = `viewer.html?tl=${tl.id}`;
  actions.appendChild(playBtn);

  const editBtn = document.createElement('a');
  editBtn.className = 'btn btn-primary btn-sm';
  editBtn.style.flex = '1';
  editBtn.style.textAlign = 'center';
  editBtn.textContent = t('btn_edit');
  editBtn.href = `player.html?tl=${tl.id}`;
  actions.appendChild(editBtn);

  const delBtn = document.createElement('button');
  delBtn.className = 'btn btn-ghost btn-sm';
  delBtn.textContent = '🗑️';
  delBtn.title = t('btn_delete_title');
  delBtn.addEventListener('click', () => deleteShow(tl.id, card));
  actions.appendChild(delBtn);

  card.appendChild(actions);
  return card;
}

// Build a horizontal colour-strip div from keyframe effectIds
function colorStrip(keyframes, height) {
  const strip = document.createElement('div');
  strip.style.cssText = `display:flex;height:${height}px;width:100%;flex-shrink:0;`;

  const kfs = (keyframes || []).slice(0, 32);
  if (kfs.length === 0) {
    strip.style.background = '#0d0d18';
    return strip;
  }

  const totalDur = kfs.reduce((s, k) => s + (k.duration ?? 2), 0) || 1;
  kfs.forEach(kf => {
    const seg = document.createElement('div');
    const pct = ((kf.duration ?? 2) / totalDur * 100).toFixed(2);
    const color = (typeof EFFECTS !== 'undefined' && EFFECTS[kf.effectId])
      ? EFFECTS[kf.effectId].color
      : '#8b5cf6';
    seg.style.cssText = `flex:0 0 ${pct}%;background:${color};`;
    strip.appendChild(seg);
  });
  return strip;
}

// ── Delete ───────────────────────────────────────────────────
async function deleteShow(id, cardEl) {
  const user = firebase.auth().currentUser;
  if (!user) return;
  if (!confirm(t('confirm_delete'))) return;

  cardEl.style.opacity = '0.4';
  cardEl.style.pointerEvents = 'none';

  try {
    await getTimelinesRef(user.uid).doc(id).delete();
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

// ── State machine ────────────────────────────────────────────
function showState(state, msg) {
  document.getElementById('lsLoading').style.display = state === 'loading'  ? '' : 'none';
  document.getElementById('lsSignIn' ).style.display = state === 'signIn'   ? '' : 'none';
  document.getElementById('lsEmpty'  ).style.display = state === 'empty'    ? '' : 'none';
  document.getElementById('lsError'  ).style.display = state === 'error'    ? '' : 'none';
  document.getElementById('lsGrid'   ).style.display = state === 'grid'     ? '' : 'none';
  if (state === 'error' && msg) document.getElementById('lsErrorMsg').textContent = msg;
}

// ── Utilities ────────────────────────────────────────────────
function extractVideoId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
    if (u.searchParams.has('v'))         return u.searchParams.get('v');
  } catch {}
  const m = url.match(/[?&]v=([^&]+)/);
  return m ? m[1] : null;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatTimeAgo(date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60)    return t('time_just_now');
  if (diff < 3600)  return Math.floor(diff / 60)   + ' ' + t('time_min_ago');
  if (diff < 86400) return Math.floor(diff / 3600)  + t('time_h_ago');
  return Math.floor(diff / 86400) + t('time_d_ago');
}
