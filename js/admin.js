// ============================================================
// admin.js — Feedback Inbox (admin only)
// ============================================================

const ADMIN_EMAIL = 'diogovazz@protonmail.com';

let _adminTickets      = [];   // all tickets loaded from Firestore
let _adminFilter       = 'all'; // 'all' | 'open' | 'resolved' | type
let _adminSelected     = null; // selected ticket id
let _adminUnsub        = null; // Firestore listener unsubscribe

function isAdmin(user) {
  return user && user.email === ADMIN_EMAIL;
}

// ── Called when view-admin becomes active ─────────────────────
function initAdmin(user) {
  if (!isAdmin(user)) {
    SPA.navigate('home');
    return;
  }
  _adminFilter   = 'all';
  _adminSelected = null;
  _adminSubscribe();
}

function destroyAdmin() {
  if (_adminUnsub) { _adminUnsub(); _adminUnsub = null; }
}

// ── Realtime Firestore listener ───────────────────────────────
function _adminSubscribe() {
  if (_adminUnsub) _adminUnsub();
  const el = document.getElementById('adminTicketList');
  if (el) el.innerHTML = '<div class="admin-loading">Loading…</div>';

  _adminUnsub = firebase.firestore()
    .collection('feedback')
    .orderBy('createdAt', 'desc')
    .onSnapshot(snap => {
      _adminTickets = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      _adminRenderList();
      _adminUpdateCounts();
    }, err => {
      console.error('[Admin]', err);
      const el = document.getElementById('adminTicketList');
      if (el) el.innerHTML = '<div class="admin-loading" style="color:var(--danger)">Failed to load tickets. Check Firestore rules.</div>';
    });
}

// ── Filter ────────────────────────────────────────────────────
function adminSetFilter(f) {
  _adminFilter   = f;
  _adminSelected = null;
  document.querySelectorAll('.admin-filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === f);
  });
  _adminRenderList();
  _adminRenderDetail(null);
}

function _adminFiltered() {
  return _adminTickets.filter(t => {
    if (_adminFilter === 'all')      return true;
    if (_adminFilter === 'open')     return t.status !== 'resolved';
    if (_adminFilter === 'resolved') return t.status === 'resolved';
    return t.type === _adminFilter;
  });
}

// ── Render list ───────────────────────────────────────────────
function _adminRenderList() {
  const el = document.getElementById('adminTicketList');
  if (!el) return;
  const tickets = _adminFiltered();

  if (!tickets.length) {
    el.innerHTML = '<div class="admin-empty">No tickets here.</div>';
    return;
  }

  el.innerHTML = tickets.map(t => {
    const date = t.createdAt ? _adminFmtDate(t.createdAt.toDate()) : '—';
    const isSelected = t.id === _adminSelected;
    return `
      <div class="admin-ticket-row ${isSelected ? 'selected' : ''} ${t.status === 'resolved' ? 'resolved' : ''}"
           onclick="adminSelectTicket('${t.id}')">
        <div class="admin-ticket-top">
          <span class="admin-tag admin-tag-${t.type}">${_adminTypeLabel(t.type)}</span>
          ${t.status === 'resolved' ? '<span class="admin-resolved-badge">Resolved</span>' : ''}
          <span class="admin-ticket-date">${date}</span>
        </div>
        <div class="admin-ticket-name">${escapeHtml(t.name || 'Anonymous')}</div>
        <div class="admin-ticket-preview">${escapeHtml((t.message || '').slice(0, 90))}${(t.message || '').length > 90 ? '…' : ''}</div>
      </div>`;
  }).join('');
}

// ── Render detail ─────────────────────────────────────────────
function adminSelectTicket(id) {
  _adminSelected = id;
  _adminRenderList(); // update selected state
  const t = _adminTickets.find(t => t.id === id);
  _adminRenderDetail(t);

  // On mobile: show detail panel
  document.getElementById('adminDetail').classList.add('admin-detail-open');
}

function adminCloseDetail() {
  _adminSelected = null;
  _adminRenderList();
  _adminRenderDetail(null);
  document.getElementById('adminDetail').classList.remove('admin-detail-open');
}

function _adminRenderDetail(t) {
  const el = document.getElementById('adminDetail');
  if (!el) return;
  if (!t) {
    el.innerHTML = '<div class="admin-detail-empty"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><p>Select a ticket</p></div>';
    return;
  }
  const date = t.createdAt ? t.createdAt.toDate().toLocaleString() : '—';
  el.innerHTML = `
    <div class="admin-detail-header">
      <button class="admin-back-btn" onclick="adminCloseDetail()">← Back</button>
      <div class="admin-detail-actions">
        ${t.status !== 'resolved'
          ? `<button class="btn btn-sm admin-resolve-btn" onclick="adminResolve('${t.id}')">Mark Resolved</button>`
          : `<button class="btn btn-sm btn-ghost" onclick="adminReopen('${t.id}')">Reopen</button>`}
        <button class="btn btn-sm btn-danger" onclick="adminDelete('${t.id}')">Delete</button>
      </div>
    </div>
    <div class="admin-detail-body">
      <div class="admin-detail-meta">
        <span class="admin-tag admin-tag-${t.type}">${_adminTypeLabel(t.type)}</span>
        ${t.status === 'resolved' ? '<span class="admin-resolved-badge">Resolved</span>' : ''}
        <span class="admin-detail-date">${date}</span>
      </div>
      <div class="admin-detail-from">
        <strong>${escapeHtml(t.name || 'Anonymous')}</strong>
        ${t.email ? `<a href="mailto:${escapeHtml(t.email)}" class="admin-email-link">${escapeHtml(t.email)}</a>` : ''}
        ${t.userUid ? `<span class="admin-uid">UID: ${t.userUid}</span>` : ''}
      </div>
      <div class="admin-detail-message">${escapeHtml(t.message || '').replace(/\n/g, '<br>')}</div>
    </div>`;
}

// ── Actions ───────────────────────────────────────────────────
async function adminResolve(id) {
  await firebase.firestore().collection('feedback').doc(id).update({ status: 'resolved' });
}

async function adminReopen(id) {
  await firebase.firestore().collection('feedback').doc(id).update({ status: 'open' });
}

async function adminDelete(id) {
  if (!confirm('Delete this ticket permanently?')) return;
  await firebase.firestore().collection('feedback').doc(id).delete();
  adminCloseDetail();
}

// ── Counts ────────────────────────────────────────────────────
function _adminUpdateCounts() {
  const open = _adminTickets.filter(t => t.status !== 'resolved').length;
  const el = document.getElementById('adminOpenCount');
  if (!el) return;
  el.textContent = open || '';
  el.style.display = open ? '' : 'none';
}

// ── Helpers ───────────────────────────────────────────────────
function _adminTypeLabel(type) {
  return { bug: 'Bug', feedback: 'Feedback', suggestion: 'Suggestion', other: 'Other' }[type] || type;
}

function _adminFmtDate(d) {
  const now  = new Date();
  const diff = now - d;
  if (diff < 60000)       return 'just now';
  if (diff < 3600000)     return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000)    return Math.floor(diff / 3600000) + 'h ago';
  if (diff < 604800000)   return Math.floor(diff / 86400000) + 'd ago';
  return d.toLocaleDateString();
}


// ── Show/hide admin sidebar link ──────────────────────────────
function updateAdminSidebarLink(user) {
  const link = document.getElementById('sb-admin');
  if (link) link.style.display = isAdmin(user) ? '' : 'none';
}
