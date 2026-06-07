// ============================================================
// index-preview.js — Home page preview strips
// ============================================================

function onAuthReady(user) {
  if (user) {
    loadHomeMyShows(user);
  } else {
    document.getElementById('homeMyShowsSignIn').style.display = '';
    document.getElementById('homeMyShowsGrid').style.display   = 'none';
    document.getElementById('homeMyShowsEmpty').style.display  = 'none';
  }
  renderCommunityPreview();
  document.getElementById('homePreviewSection').style.display = '';
}

// ── My Lightshows preview ────────────────────────────────────
async function loadHomeMyShows(user) {
  try {
    const snap = await firebase.firestore()
      .collection('users').doc(user.uid).collection('timelines')
      .orderBy('updatedAt', 'desc')
      .limit(4)
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

// ── Community preview (placeholder cards) ───────────────────
function renderCommunityPreview() {
  const grid = document.getElementById('homeCommunityGrid');
  if (!grid || grid.dataset.built) return;
  grid.dataset.built = '1';

  const placeholders = [
    { title: 'Guilty — fan edit',        kf: 12, bpm: 124, colors: ['#ec4899','#8b5cf6','#ec4899'] },
    { title: 'Move — choreography sync', kf: 8,  bpm: 100, colors: ['#6366f1','#a855f7','#22d3ee'] },
    { title: 'Atlantis — full concert',  kf: 20, bpm: 112, colors: ['#0ea5e9','#8b5cf6','#0ea5e9'] },
    { title: 'IDEA — fan made',          kf: 6,  bpm: 95,  colors: ['#f59e0b','#ec4899','#8b5cf6'] },
  ];

  placeholders.forEach(p => {
    const card = document.createElement('div');
    card.className = 'ls-card home-community-card';

    const strip = document.createElement('div');
    strip.style.cssText = `height:44px;display:flex;width:100%;flex-shrink:0;`;
    p.colors.forEach(c => {
      const seg = document.createElement('div');
      seg.style.cssText = `flex:1;background:${c};`;
      strip.appendChild(seg);
    });
    card.appendChild(strip);

    const body = document.createElement('div');
    body.className = 'ls-card-body';
    body.innerHTML = `
      <div class="ls-card-title">${p.title}</div>
      <div class="ls-card-meta">${p.kf} ${t('card_segments')} · ${p.bpm} BPM</div>`;
    card.appendChild(body);

    const actions = document.createElement('div');
    actions.className = 'ls-card-actions';
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary btn-sm';
    btn.style.flex = '1';
    btn.textContent = t('btn_coming_soon');
    btn.disabled = true;
    actions.appendChild(btn);
    card.appendChild(actions);

    grid.appendChild(card);
  });
}

// ── Build a real lightshow card ──────────────────────────────
function buildPreviewCard(tl, idx) {
  const card = document.createElement('div');
  card.className = 'ls-card';
  card.style.animationDelay = (idx * 0.05) + 's';

  const videoId   = _pvExtractId(tl.videoUrl || '');
  const updatedAt = tl.updatedAt?.toDate?.() ?? new Date();
  const timeAgo   = _pvTimeAgo(updatedAt);
  const kfCount   = tl.keyframes?.length ?? 0;
  const bpmText   = tl.bpm ? Math.round(tl.bpm) + ' BPM' : t('card_no_bpm');

  if (videoId) {
    const thumb = document.createElement('div');
    thumb.className = 'ls-card-thumb';
    thumb.innerHTML = `
      <img src="https://img.youtube.com/vi/${videoId}/mqdefault.jpg"
           alt="" loading="lazy"
           onerror="this.parentElement.style.display='none'">
      <div class="ls-card-thumb-overlay"></div>`;
    const strip = _pvColorStrip(tl.keyframes, 38);
    strip.style.cssText += 'position:absolute;bottom:0;left:0;width:100%;opacity:0.85;border-radius:0;';
    thumb.appendChild(strip);
    card.appendChild(thumb);
  } else {
    card.appendChild(_pvColorStrip(tl.keyframes, 44));
  }

  const body = document.createElement('div');
  body.className = 'ls-card-body';
  body.innerHTML = `
    <div class="ls-card-title">${_pvEsc(tl.title || t('card_no_title'))}</div>
    <div class="ls-card-meta">${kfCount} ${t('card_segments')} · ${bpmText} · ${timeAgo}</div>`;
  card.appendChild(body);

  const actions = document.createElement('div');
  actions.className = 'ls-card-actions';

  const playBtn = document.createElement('a');
  playBtn.className = 'btn btn-success btn-sm';
  playBtn.style.cssText = 'flex:1;text-align:center;';
  playBtn.textContent = t('btn_play');
  playBtn.href = `viewer.html?tl=${tl.id}`;
  actions.appendChild(playBtn);

  const editBtn = document.createElement('a');
  editBtn.className = 'btn btn-primary btn-sm';
  editBtn.style.cssText = 'flex:1;text-align:center;';
  editBtn.textContent = t('btn_edit');
  editBtn.href = `player.html?tl=${tl.id}`;
  actions.appendChild(editBtn);

  card.appendChild(actions);
  return card;
}

// ── Helpers ──────────────────────────────────────────────────
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

function _pvEsc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _pvTimeAgo(date) {
  const d = Math.floor((Date.now() - date.getTime()) / 1000);
  if (d < 60)    return t('time_just_now');
  if (d < 3600)  return Math.floor(d / 60)  + ' ' + t('time_min_ago');
  if (d < 86400) return Math.floor(d / 3600) + t('time_h_ago');
  return Math.floor(d / 86400) + t('time_d_ago');
}
