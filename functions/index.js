// ============================================================
// Cloud Functions — Ticket email notifications (delayed + seen-aware)
// ============================================================
// Flow:
//   1. A new ticket / reply fires a Firestore trigger (Madrid region).
//   2. The trigger ENQUEUES a delayed task (waits DELAY_SECONDS).
//   3. When the task runs, it re-reads the ticket and only sends the
//      email if the recipient has NOT opened it in the meantime
//      (checked via adminSeenAt / authorSeenAt written by the site).
//
// The delayed task handler runs in us-central1 (where Cloud Tasks is
// the default) while the Firestore triggers stay in the DB region.
//
// Deploy:  firebase deploy --only functions
// ============================================================

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onTaskDispatched }  = require('firebase-functions/v2/tasks');
const { setGlobalOptions }  = require('firebase-functions/v2');
const { defineSecret }      = require('firebase-functions/params');
const { initializeApp }     = require('firebase-admin/app');
const { getFirestore }      = require('firebase-admin/firestore');
const { getFunctions }      = require('firebase-admin/functions');
const nodemailer            = require('nodemailer');

initializeApp();
const db = getFirestore();

// Firestore triggers must run in the same region as the database (Madrid)
setGlobalOptions({ region: 'europe-southwest1' });

const GMAIL_APP_PASSWORD = defineSecret('GMAIL_APP_PASSWORD');

// ── Config — change these if needed ─────────────────────────
const GMAIL_USER    = 'mr.tomcat16789@gmail.com'; // Gmail that sends the emails
const ADMIN_EMAIL   = 'diogovazz@protonmail.com'; // inbox for "new ticket / new reply" notices
const SITE_URL      = 'https://lightstickwaves.com';
const DELAY_SECONDS = 5 * 60; // grace window: wait 5 min, skip if already seen in-app
const TASK_QUEUE    = 'deliverTicketEmail'; // must match the exported handler name

// ── Email helpers ───────────────────────────────────────────
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function nl2br(s) { return esc(s).replace(/\n/g, '<br>'); }

function layout(inner) {
  return `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0b1220">
    ${inner}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
    <p style="font-size:12px;color:#64748b">LightStickWaves · <a href="${SITE_URL}">${SITE_URL}</a></p>
  </div>`;
}
function btn(label) {
  return `<p style="margin-top:20px"><a href="${SITE_URL}/app.html" style="background:#0891b2;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">${label}</a></p>`;
}
function quote(text) {
  return `<blockquote style="margin:0;padding:12px 16px;background:#f1f5f9;border-radius:8px">${nl2br(text)}</blockquote>`;
}

async function sendMail(to, subject, html) {
  const tx = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD.value() },
  });
  await tx.sendMail({ from: `LightStickWaves <${GMAIL_USER}>`, to, subject, html });
}

function toMillis(ts) { return (ts && ts.toMillis) ? ts.toMillis() : 0; }

// Enqueue a delayed delivery. Handler lives in us-central1 (Cloud Tasks default region).
async function scheduleDelivery(data) {
  await getFunctions().taskQueue(TASK_QUEUE).enqueue(data, {
    scheduleDelaySeconds: DELAY_SECONDS,
    dispatchDeadlineSeconds: 60,
  });
}

// ── 1) New ticket → schedule an admin notification ──────────
exports.onNewTicket = onDocumentCreated('feedback/{id}', async (event) => {
  const t = event.data && event.data.data();
  if (!t) return;
  await scheduleDelivery({ kind: 'newTicket', ticketId: event.params.id, atMillis: Date.now() });
});

// ── 2) New reply → schedule a notification for the other party ─
exports.onNewTicketMessage = onDocumentCreated('feedback/{id}/messages/{msgId}', async (event) => {
  const m = event.data && event.data.data();
  if (!m) return;
  await scheduleDelivery({
    kind:       'reply',
    ticketId:   event.params.id,
    isAdmin:    !!m.isAdmin,
    senderName: m.senderName || '',
    text:       m.text || '',
    atMillis:   Date.now(),
  });
});

// ── 3) Delayed delivery — sends only if still unseen ────────
exports.deliverTicketEmail = onTaskDispatched(
  {
    region:      'us-central1',
    secrets:     [GMAIL_APP_PASSWORD],
    retryConfig: { maxAttempts: 3, minBackoffSeconds: 30 },
    rateLimits:  { maxConcurrentDispatches: 5 },
  },
  async (req) => {
    const d = req.data || {};
    if (!d.ticketId) return;

    const snap = await db.collection('feedback').doc(d.ticketId).get();
    const t = snap.data();
    if (!t) return; // ticket deleted meanwhile

    if (d.kind === 'newTicket') {
      // Skip if the admin already opened this ticket after it was created
      if (toMillis(t.adminSeenAt) >= d.atMillis) return;
      const subject = `🎫 New ${t.type || 'ticket'} from ${t.name || 'a user'}`;
      const html = layout(`
        <h2 style="margin:0 0 12px">New ticket received</h2>
        <p><strong>Type:</strong> ${esc(t.type)}</p>
        <p><strong>From:</strong> ${esc(t.name)}${t.email ? ` &lt;${esc(t.email)}&gt;` : ''}</p>
        <p><strong>Message:</strong></p>
        ${quote(t.message)}
        ${btn('Open the admin inbox')}`);
      await sendMail(ADMIN_EMAIL, subject, html);
      return;
    }

    // kind === 'reply'
    if (d.isAdmin) {
      // Admin replied → notify the author, unless they already read it
      if (!t.email) return;
      if (toMillis(t.authorSeenAt) >= d.atMillis) return;
      const subject = '💬 New reply to your ticket on LightStickWaves';
      const html = layout(`
        <h2 style="margin:0 0 12px">You have a new reply</h2>
        <p>${esc(d.senderName || 'Support')} replied to your ticket:</p>
        ${quote(d.text)}
        ${btn('Open the conversation')}`);
      await sendMail(t.email, subject, html);
    } else {
      // User replied → notify the admin, unless they already read it
      if (toMillis(t.adminSeenAt) >= d.atMillis) return;
      const subject = `💬 New reply on ticket from ${t.name || 'a user'}`;
      const html = layout(`
        <h2 style="margin:0 0 12px">New reply on a ticket</h2>
        <p>${esc(d.senderName || t.name || 'A user')} wrote:</p>
        ${quote(d.text)}
        ${btn('Open the admin inbox')}`);
      await sendMail(ADMIN_EMAIL, subject, html);
    }
  }
);
