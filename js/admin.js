// ============================================================
// admin.js — Feedback Inbox (admin only)
// ============================================================

const ADMIN_EMAIL = 'diogovazz@protonmail.com';

let _adminTickets      = [];   // all tickets loaded from Firestore
let _adminFilter       = 'all'; // 'all' | 'open' | 'resolved' | type
let _adminSelected     = null; // selected ticket id
let _adminUnsub        = null; // Firestore listener unsubscribe

// Conversation (chat) state for the open ticket
let _adminMsgUnsub     = null; // messages subcollection listener
let _adminMsgCache     = [];   // cached messages for the open ticket

// Always-on open-ticket badge (runs on every page, not just the inbox)
let _adminBadgeUnsub   = null;

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
  _adminUnsubMessages();
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
  _adminUnsubMessages();
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
          ${_newReplyBadgeHTML(t)}
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
  const t = _adminTickets.find(t => t.id === id);
  _markTicketSeen(id, t && t.lastMsgAt ? _msgMillis(t.lastMsgAt) : Date.now());
  _persistTicketSeen(id, t);
  _adminRenderList(); // update selected state + clear badge
  _adminRenderDetail(t);
  _adminSubscribeMessages(id);

  // On mobile: show detail panel
  document.getElementById('adminDetail').classList.add('admin-detail-open');
}

function adminCloseDetail() {
  _adminSelected = null;
  _adminUnsubMessages();
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

      <div class="chat-section">
        <div class="chat-section-title">Conversation</div>
        <div class="chat-thread" id="adminChatThread"><div class="chat-loading">Loading…</div></div>
        <div class="chat-input-row">
          <textarea id="adminReplyInput" class="chat-input" rows="2" placeholder="Write a reply…"
                    onkeydown="adminReplyKeydown(event, '${t.id}')"></textarea>
          <button class="btn btn-sm btn-primary" onclick="adminSendReply('${t.id}')">Send</button>
        </div>
      </div>
    </div>`;

  _adminRenderThread();
}

// ── Conversation (chat) ───────────────────────────────────────
function _adminUnsubMessages() {
  if (_adminMsgUnsub) { _adminMsgUnsub(); _adminMsgUnsub = null; }
  _adminMsgCache = [];
}

function _adminSubscribeMessages(id) {
  _adminUnsubMessages();
  _adminMsgUnsub = firebase.firestore()
    .collection('feedback').doc(id).collection('messages')
    .orderBy('createdAt', 'asc')
    .onSnapshot(snap => {
      _adminMsgCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Conversation is open → keep it marked as read
      const maxTs = _adminMsgCache.reduce((mx, m) => Math.max(mx, _msgMillis(m.createdAt)), 0);
      if (maxTs) _markTicketSeen(id, maxTs);
      _persistTicketSeen(id, _adminTickets.find(x => x.id === id));
      _adminRenderThread();
    }, err => {
      console.error('[Admin chat]', err);
      const el = document.getElementById('adminChatThread');
      if (el) el.innerHTML = '<div class="chat-empty" style="color:var(--danger)">Failed to load conversation.</div>';
    });
}

function _adminRenderThread() {
  const el = document.getElementById('adminChatThread');
  if (!el) return;
  if (!_adminMsgCache.length) {
    el.innerHTML = '<div class="chat-empty">No replies yet. Write the first one below.</div>';
    return;
  }
  el.innerHTML = _adminMsgCache.map(_chatMsgHTML).join('');
  el.scrollTop = el.scrollHeight;
}

function adminReplyKeydown(ev, id) {
  if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); adminSendReply(id); }
}

async function adminSendReply(id) {
  if (!currentUser) return;
  const input = document.getElementById('adminReplyInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.disabled = true;
  try {
    await firebase.firestore()
      .collection('feedback').doc(id).collection('messages').add({
        text,
        senderUid:  currentUser.uid,
        senderName: window._userName || currentUser.displayName || 'Support',
        isAdmin:    true,
        createdAt:  firebase.firestore.FieldValue.serverTimestamp(),
      });
    input.value = '';
    // Denormalise onto the ticket so the "New reply" badge updates in realtime
    firebase.firestore().collection('feedback').doc(id).update({
      lastMsgAt:      firebase.firestore.FieldValue.serverTimestamp(),
      lastMsgByAdmin: true,
    }).catch(e => console.warn('[Admin reply] ticket update failed', e));
  } catch (e) {
    console.error('[Admin reply]', e);
    alert('Failed to send reply.');
  }
  input.disabled = false;
  input.focus();
}

// Shared chat bubble renderer (used by admin + tickets views)
function _chatMsgHTML(m) {
  const who  = m.isAdmin ? 'chat-msg-admin' : 'chat-msg-user';
  const name = escapeHtml(m.senderName || (m.isAdmin ? 'Support' : 'User'));
  const when = m.createdAt ? _adminFmtDate(m.createdAt.toDate()) : 'now';
  const body = escapeHtml(m.text || '').replace(/\n/g, '<br>');
  return `
    <div class="chat-msg ${who}">
      <div class="chat-msg-meta">${name} · ${when}</div>
      <div class="chat-bubble">${body}</div>
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
function _setAdminOpenCount(n) {
  const el = document.getElementById('adminOpenCount');
  if (!el) return;
  el.textContent = n || '';
  el.style.display = n ? '' : 'none';
}

function _adminUpdateCounts() {
  const open = _adminTickets.filter(t => t.status !== 'resolved').length;
  _setAdminOpenCount(open);
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


// ── New-reply badge: local read-state + logic (shared w/ tickets.js) ──
const _TICKET_SEEN_KEY = 'lsw-ticket-seen';

function _ticketSeenMap() {
  try { return JSON.parse(localStorage.getItem(_TICKET_SEEN_KEY) || '{}'); }
  catch (e) { return {}; }
}
function _ticketSeenAt(id) {
  const v = _ticketSeenMap()[id];
  return typeof v === 'number' ? v : 0;
}
function _markTicketSeen(id, millis) {
  const m   = _ticketSeenMap();
  const val = typeof millis === 'number' && millis > 0 ? millis : Date.now();
  if ((m[id] || 0) >= val) return;   // never move backwards
  m[id] = val;
  try { localStorage.setItem(_TICKET_SEEN_KEY, JSON.stringify(m)); } catch (e) {}
}
function _msgMillis(ts) {
  return ts && ts.toDate ? ts.toDate().getTime() : 0;
}

// Persist a server-side "seen" marker so the delayed email function can tell
// whether the recipient already opened the ticket (and skip the email).
// Admin writes adminSeenAt; the ticket author writes authorSeenAt.
function _persistTicketSeen(id, ticket) {
  if (!currentUser || !id) return;
  const admin    = isAdmin(currentUser);
  const isAuthor = !!ticket && ticket.userUid && currentUser.uid === ticket.userUid;
  if (!admin && !isAuthor) return; // only admin or author may mark a ticket seen
  const patch = admin
    ? { adminSeenAt:  firebase.firestore.FieldValue.serverTimestamp() }
    : { authorSeenAt: firebase.firestore.FieldValue.serverTimestamp() };
  firebase.firestore().collection('feedback').doc(id).update(patch)
    .catch(e => console.warn('[seen] persist failed', e));
}

// True when a ticket has a reply aimed at the current viewer they haven't opened.
// Admin ← replies from the user; ticket author ← replies from the admin.
function _ticketHasNewReply(t) {
  if (!t || !t.lastMsgAt) return false;
  // Never badge the conversation that's currently open in either view
  if (typeof _adminSelected !== 'undefined' && _adminSelected === t.id) return false;
  if (typeof _ticketsChatId  !== 'undefined' && _ticketsChatId  === t.id) return false;

  const admin     = isAdmin(currentUser);
  const isCreator = !!currentUser && t.userUid && currentUser.uid === t.userUid;
  if (!admin && !isCreator)                 return false; // not your conversation
  if (admin  && t.lastMsgByAdmin !== false) return false; // last msg was admin's own
  if (!admin && t.lastMsgByAdmin !== true)  return false; // last msg was your own

  return _msgMillis(t.lastMsgAt) > _ticketSeenAt(t.id);
}

function _newReplyBadgeHTML(t) {
  return _ticketHasNewReply(t) ? '<span class="new-reply-badge">New reply</span>' : '';
}

// ── Show/hide admin sidebar link ──────────────────────────────
function updateAdminSidebarLink(user) {
  const link = document.getElementById('sb-admin');
  if (link) link.style.display = isAdmin(user) ? '' : 'none';
  startAdminInboxBadge(user); // keep the open-ticket badge live on every page
}

// Always-on listener that keeps the sidebar "Inbox" badge in sync with the
// number of open tickets — regardless of which view is active.
function startAdminInboxBadge(user) {
  if (_adminBadgeUnsub) { _adminBadgeUnsub(); _adminBadgeUnsub = null; }
  if (!isAdmin(user)) { _setAdminOpenCount(0); return; }

  _adminBadgeUnsub = firebase.firestore()
    .collection('feedback')
    .onSnapshot(snap => {
      let open = 0;
      snap.forEach(d => { if (d.data().status !== 'resolved') open++; });
      _setAdminOpenCount(open);
    }, err => console.warn('[Admin badge]', err));
}
