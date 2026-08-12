// ============================================================
// feedback.js — Feedback / Bug Report → Firestore
// ============================================================

// Display name + email pulled from the signed-in account
function _fbAccountName() {
  if (!currentUser) return '';
  return window._userName || currentUser.displayName ||
         (currentUser.email ? currentUser.email.split('@')[0] : 'User');
}

function openFeedbackModal() {
  const form   = document.getElementById('feedbackForm');
  const signin = document.getElementById('feedbackSignin');
  document.getElementById('feedbackSuccess').style.display = 'none';
  document.getElementById('feedbackError').style.display   = 'none';

  // Logged out → require an account to submit
  if (!currentUser) {
    form.style.display   = 'none';
    signin.style.display = '';
    document.getElementById('feedbackModal').style.display = 'flex';
    return;
  }

  // Logged in → prefill identity from the account, only ask type + message
  signin.style.display = 'none';
  form.style.display   = '';

  const name  = _fbAccountName();
  const email = currentUser.email || '';
  const idEl  = document.getElementById('fbIdentity');
  if (idEl) {
    const label = t('fb_as') || 'Sending as';
    idEl.innerHTML = `${escapeHtml(label)} <strong>${escapeHtml(name)}</strong>` +
                     (email ? ` · ${escapeHtml(email)}` : '');
  }

  document.getElementById('fbMessage').value = '';
  document.getElementById('fbType').value    = 'bug';
  const btn = document.getElementById('fbSubmitBtn');
  if (btn) { btn.disabled = false; btn.textContent = t('fb_send') || 'Send'; }
  document.getElementById('feedbackModal').style.display = 'flex';
}

function closeFeedbackModal() {
  document.getElementById('feedbackModal').style.display = 'none';
}

// From the sign-in-required state → open the auth modal
function feedbackGoSignIn() {
  closeFeedbackModal();
  if (typeof openSignInModal === 'function') openSignInModal();
}

async function submitFeedback() {
  // Only signed-in users can submit
  if (!currentUser) {
    document.getElementById('feedbackForm').style.display   = 'none';
    document.getElementById('feedbackSignin').style.display = '';
    return;
  }

  const type    = document.getElementById('fbType').value;
  const name    = _fbAccountName();
  const email   = currentUser.email || '';
  const message = document.getElementById('fbMessage').value.trim();

  if (!message) {
    const errEl = document.getElementById('feedbackError');
    errEl.textContent = t('fb_err_empty') || 'Please write a message before sending.';
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
      name:      name  || 'User',
      email:     email || '',
      message,
      status:    'open',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      userUid:   currentUser.uid,
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
