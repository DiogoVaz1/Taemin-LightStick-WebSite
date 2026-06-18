// ============================================================
// feedback.js — Feedback / Bug Report → Firestore
// ============================================================

function openFeedbackModal() {
  document.getElementById('feedbackForm').style.display    = '';
  document.getElementById('feedbackSuccess').style.display = 'none';
  document.getElementById('feedbackError').style.display   = 'none';
  document.getElementById('fbMessage').value = '';
  document.getElementById('fbEmail').value   = '';
  document.getElementById('fbName').value    = '';
  document.getElementById('fbType').value    = 'bug';
  const btn = document.getElementById('fbSubmitBtn');
  if (btn) { btn.disabled = false; btn.textContent = 'Send'; }
  document.getElementById('feedbackModal').style.display = 'flex';
}

function closeFeedbackModal() {
  document.getElementById('feedbackModal').style.display = 'none';
}

async function submitFeedback() {
  const type    = document.getElementById('fbType').value;
  const name    = document.getElementById('fbName').value.trim();
  const email   = document.getElementById('fbEmail').value.trim();
  const message = document.getElementById('fbMessage').value.trim();

  if (!message) {
    const errEl = document.getElementById('feedbackError');
    errEl.textContent = 'Please write a message before sending.';
    errEl.style.display = '';
    return;
  }

  const btn = document.getElementById('fbSubmitBtn');
  btn.disabled    = true;
  btn.textContent = 'Sending…';
  document.getElementById('feedbackError').style.display = 'none';

  try {
    if (!fbInitialized) throw new Error('Firebase not ready');

    await firebase.firestore().collection('feedback').add({
      type,
      name:      name  || 'Anonymous',
      email:     email || '',
      message,
      status:    'open',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      userUid:   currentUser ? currentUser.uid : null,
    });

    document.getElementById('feedbackForm').style.display    = 'none';
    document.getElementById('feedbackSuccess').style.display = '';
  } catch (err) {
    console.error('[Feedback]', err);
    const errEl = document.getElementById('feedbackError');
    errEl.textContent = 'Failed to send. Please try again.';
    errEl.style.display = '';
    btn.disabled    = false;
    btn.textContent = 'Send';
  }
}

document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape' && document.getElementById('feedbackModal')?.style.display !== 'none') {
    closeFeedbackModal();
  }
});
