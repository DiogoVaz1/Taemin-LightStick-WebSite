// ============================================================
// tickets.js — Public Tickets View
// ============================================================

let _ticketsData     = [];
let _ticketsFilter   = 'all';
let _ticketsUnsub    = null;
let _ticketsExpanded = new Set();

// Conversation (chat) — only one open at a time
let _ticketsChatId   = null;  // ticket id whose conversation is open
let _ticketsMsgUnsub = null;  // messages subcollection listener
let _ticketsMsgCache = [];    // cached messages for the open conversation

// ── Lifecycle ─────────────────────────────────────────────
function initTickets() {
  _ticketsFilter   = 'all';
  _ticketsExpanded = new Set();
  _setActiveFilter('all');
  _ticketsSubscribe();
}

function destroyTickets() {
  if (_ticketsUnsub) { _ticketsUnsub(); _ticketsUnsub = null; }
  _ticketsCloseChat();
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
    const chatOpen  = _ticketsChatId === t.id;
    const canReply  = !!currentUser && (isAdmin(currentUser) || (t.userUid && currentUser.uid === t.userUid));
    const msgFull   = _tEsc(t.message || '');
    const msgShort  = msgFull.length > 200 ? msgFull.slice(0, 200) + '…' : msgFull;
    const canExpand = (t.message || '').length > 200;

    return `
      <div class="ticket-card ${t.status === 'resolved' ? 'ticket-resolved' : ''}">
        <div class="ticket-card-top">
          <span class="admin-tag admin-tag-${t.type}">${_tTypeLabel(t.type)}</span>
          ${t.status === 'resolved' ? '<span class="admin-resolved-badge">Resolved</span>' : '<span class="ticket-open-badge">Open</span>'}
          ${_newReplyBadgeHTML(t)}
          <span class="ticket-meta">${_tEsc(t.name || 'Anonymous')} · ${date}</span>
        </div>
        <div class="ticket-message ${expanded ? 'expanded' : ''}">
          ${expanded ? msgFull.replace(/\n/g,'<br>') : msgShort.replace(/\n/g,'<br>')}
        </div>
        <div class="ticket-card-footer">
          <div class="ticket-footer-left">
            ${canExpand
              ? `<button class="ticket-expand-btn" onclick="ticketToggleExpand('${t.id}')">${expanded ? 'Show less' : 'Read more'}</button>`
              : ''}
            <button class="ticket-chat-btn" onclick="ticketToggleChat('${t.id}')">
              ${chatOpen ? 'Hide conversation' : 'Conversation'}
            </button>
          </div>
          ${isCreator
            ? `<button class="ticket-delete-btn" onclick="ticketDelete('${t.id}')">Delete</button>`
            : ''}
        </div>
        ${chatOpen ? `
          <div class="chat-section ticket-chat-section">
            <div class="chat-thread" id="ticketChatThread"><div class="chat-loading">Loading…</div></div>
            ${canReply
              ? `<div class="chat-input-row">
                   <textarea id="ticketReplyInput" class="chat-input" rows="2" placeholder="Write a reply…"
                             onkeydown="ticketReplyKeydown(event, '${t.id}')"></textarea>
                   <button class="btn btn-sm btn-primary" onclick="ticketsSendReply('${t.id}')">Send</button>
                 </div>`
              : `<div class="chat-readonly">Sign in as the ticket author to join the conversation.</div>`}
          </div>` : ''}
      </div>`;
  }).join('');

  // Re-attach the open conversation thread after the list is rebuilt
  if (_ticketsChatId) _ticketsRenderThread();
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

// ── Conversation (chat) ────────────────────────────────────
function ticketToggleChat(id) {
  if (_ticketsChatId === id) { _ticketsCloseChat(); return; }
  _ticketsChatId   = id;
  _ticketsMsgCache = [];
  const t = _ticketsData.find(x => x.id === id);
  _markTicketSeen(id, t && t.lastMsgAt ? _msgMillis(t.lastMsgAt) : Date.now());
  _persistTicketSeen(id, t);
  _ticketsSubscribeMessages(id);
  _ticketsRender();
}

function _ticketsCloseChat() {
  if (_ticketsMsgUnsub) { _ticketsMsgUnsub(); _ticketsMsgUnsub = null; }
  const wasOpen = _ticketsChatId !== null;
  _ticketsChatId   = null;
  _ticketsMsgCache = [];
  if (wasOpen) _ticketsRender();
}

function _ticketsSubscribeMessages(id) {
  if (_ticketsMsgUnsub) { _ticketsMsgUnsub(); _ticketsMsgUnsub = null; }
  _ticketsMsgUnsub = firebase.firestore()
    .collection('feedback').doc(id).collection('messages')
    .orderBy('createdAt', 'asc')
    .onSnapshot(snap => {
      if (_ticketsChatId !== id) return; // conversation was closed meanwhile
      _ticketsMsgCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Conversation is open → keep it marked as read
      const maxTs = _ticketsMsgCache.reduce((mx, m) => Math.max(mx, _msgMillis(m.createdAt)), 0);
      if (maxTs) _markTicketSeen(id, maxTs);
      _persistTicketSeen(id, _ticketsData.find(x => x.id === id));
      _ticketsRenderThread();
    }, err => {
      console.error('[Tickets chat]', err);
      const el = document.getElementById('ticketChatThread');
      if (el) el.innerHTML = '<div class="chat-empty" style="color:var(--danger)">Failed to load conversation.</div>';
    });
}

function _ticketsRenderThread() {
  const el = document.getElementById('ticketChatThread');
  if (!el) return;
  if (!_ticketsMsgCache.length) {
    el.innerHTML = '<div class="chat-empty">No replies yet.</div>';
    return;
  }
  el.innerHTML = _ticketsMsgCache.map(_chatMsgHTML).join('');
  el.scrollTop = el.scrollHeight;
}

function ticketReplyKeydown(ev, id) {
  if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); ticketsSendReply(id); }
}

async function ticketsSendReply(id) {
  if (!currentUser) return;
  const t = _ticketsData.find(x => x.id === id);
  const admin = isAdmin(currentUser);
  if (!t || (!admin && !(t.userUid && currentUser.uid === t.userUid))) return;

  const input = document.getElementById('ticketReplyInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.disabled = true;
  try {
    await firebase.firestore()
      .collection('feedback').doc(id).collection('messages').add({
        text,
        senderUid:  currentUser.uid,
        senderName: window._userName || currentUser.displayName || (admin ? 'Support' : (t.name || 'User')),
        isAdmin:    admin,
        createdAt:  firebase.firestore.FieldValue.serverTimestamp(),
      });
    input.value = '';
    // Denormalise onto the ticket so the "New reply" badge updates in realtime
    firebase.firestore().collection('feedback').doc(id).update({
      lastMsgAt:      firebase.firestore.FieldValue.serverTimestamp(),
      lastMsgByAdmin: admin,
    }).catch(e => console.warn('[Ticket reply] ticket update failed', e));
  } catch (e) {
    console.error('[Ticket reply]', e);
    alert('Failed to send reply.');
  }
  input.disabled = false;
  input.focus();
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
