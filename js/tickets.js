// ============================================================
// tickets.js — Public Tickets View
// ============================================================

let _ticketsData     = [];
let _ticketsFilter   = 'all';
let _ticketsUnsub    = null;
let _ticketsExpanded = new Set();

// ── Lifecycle ─────────────────────────────────────────────
function initTickets() {
  _ticketsFilter   = 'all';
  _ticketsExpanded = new Set();
  _setActiveFilter('all');
  _ticketsSubscribe();
}

function destroyTickets() {
  if (_ticketsUnsub) { _ticketsUnsub(); _ticketsUnsub = null; }
}

// ── Realtime listener ──────────────────────────────────────
function _ticketsSubscribe() {
  if (_ticketsUnsub) _ticketsUnsub();
  const list = document.getElementById('ticketsList');
  if (list) list.innerHTML = '<div class="tickets-loading">Loading…</div>';

  _ticketsUnsub = firebase.firestore()
    .collection('feedback')
    .orderBy('createdAt', 'desc')
    .onSnapshot(snap => {
      _ticketsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      _ticketsRender();
    }, err => {
      console.error('[Tickets]', err);
      const list = document.getElementById('ticketsList');
      if (list) list.innerHTML = '<div class="tickets-empty">Failed to load. Try again later.</div>';
    });
}

// ── Filter ─────────────────────────────────────────────────
function ticketsSetFilter(f) {
  _ticketsFilter = f;
  _setActiveFilter(f);
  _ticketsRender();
}

function _setActiveFilter(f) {
  document.querySelectorAll('.tickets-filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === f);
  });
}

function _ticketsFiltered() {
  return _ticketsData.filter(t => {
    if (_ticketsFilter === 'all')      return true;
    if (_ticketsFilter === 'open')     return t.status !== 'resolved';
    if (_ticketsFilter === 'resolved') return t.status === 'resolved';
    return t.type === _ticketsFilter;
  });
}

// ── Render ─────────────────────────────────────────────────
function _ticketsRender() {
  const list = document.getElementById('ticketsList');
  if (!list) return;
  const tickets = _ticketsFiltered();

  if (!tickets.length) {
    list.innerHTML = '<div class="tickets-empty">No tickets here yet.</div>';
    return;
  }

  list.innerHTML = tickets.map(t => {
    const date      = t.createdAt ? _tFmtDate(t.createdAt.toDate()) : '—';
    const expanded  = _ticketsExpanded.has(t.id);
    const isCreator = currentUser && currentUser.uid && t.userUid && currentUser.uid === t.userUid;
    const msgFull   = _tEsc(t.message || '');
    const msgShort  = msgFull.length > 200 ? msgFull.slice(0, 200) + '…' : msgFull;
    const canExpand = (t.message || '').length > 200;

    return `
      <div class="ticket-card ${t.status === 'resolved' ? 'ticket-resolved' : ''}">
        <div class="ticket-card-top">
          <span class="admin-tag admin-tag-${t.type}">${_tTypeLabel(t.type)}</span>
          ${t.status === 'resolved' ? '<span class="admin-resolved-badge">Resolved</span>' : '<span class="ticket-open-badge">Open</span>'}
          <span class="ticket-meta">${_tEsc(t.name || 'Anonymous')} · ${date}</span>
        </div>
        <div class="ticket-message ${expanded ? 'expanded' : ''}">
          ${expanded ? msgFull.replace(/\n/g,'<br>') : msgShort.replace(/\n/g,'<br>')}
        </div>
        <div class="ticket-card-footer">
          ${canExpand
            ? `<button class="ticket-expand-btn" onclick="ticketToggleExpand('${t.id}')">${expanded ? 'Show less' : 'Read more'}</button>`
            : '<span></span>'}
          ${isCreator
            ? `<button class="ticket-delete-btn" onclick="ticketDelete('${t.id}')">Delete</button>`
            : ''}
        </div>
      </div>`;
  }).join('');
}

// ── Actions ────────────────────────────────────────────────
function ticketToggleExpand(id) {
  if (_ticketsExpanded.has(id)) _ticketsExpanded.delete(id);
  else _ticketsExpanded.add(id);
  _ticketsRender();
}

async function ticketDelete(id) {
  if (!currentUser) return;
  const t = _ticketsData.find(t => t.id === id);
  if (!t || t.userUid !== currentUser.uid) return;
  if (!confirm('Delete your ticket permanently?')) return;
  await firebase.firestore().collection('feedback').doc(id).delete();
}

// ── Helpers ────────────────────────────────────────────────
function _tTypeLabel(type) {
  return { bug: 'Bug', feedback: 'Feedback', suggestion: 'Suggestion', other: 'Other' }[type] || type;
}

function _tFmtDate(d) {
  const now  = new Date();
  const diff = now - d;
  if (diff < 60000)     return 'just now';
  if (diff < 3600000)   return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000)  return Math.floor(diff / 3600000) + 'h ago';
  if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
  return d.toLocaleDateString();
}

function _tEsc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
