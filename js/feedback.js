// ============================================================
// feedback.js — Feedback / Bug Report modal (Formspree)
// ============================================================

const FORMSPREE_URL = 'https://formspree.io/f/mojzdznq';

function openFeedbackModal() {
  // Reset to form state
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

  const typeLabels = {
    bug: '🐛 Bug Report',
    feedback: '💬 Feedback',
    suggestion: '💡 Suggestion',
    other: '📝 Other',
  };

  try {
    const res = await fetch(FORMSPREE_URL, {
      method:  'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type:    typeLabels[type] || type,
        name:    name || 'Anonymous',
        email:   email || '(not provided)',
        message,
        _subject: `[LightStickWaves] ${typeLabels[type] || type}`,
      }),
    });

    if (res.ok) {
      document.getElementById('feedbackForm').style.display    = 'none';
      document.getElementById('feedbackSuccess').style.display = '';
    } else {
      throw new Error('Server error ' + res.status);
    }
  } catch (err) {
    const errEl = document.getElementById('feedbackError');
    errEl.textContent = 'Failed to send. Please try again later.';
    errEl.style.display = '';
    btn.disabled    = false;
    btn.textContent = 'Send';
  }
}

// Close on Escape key
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape' && document.getElementById('feedbackModal')?.style.display !== 'none') {
    closeFeedbackModal();
  }
});
