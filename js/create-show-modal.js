// ============================================================
// create-show-modal.js
// Modal "New LightShow" — asks for name + URL, creates in
// Firestore and redirects to player.html?tl=ID
// ============================================================

(function () {

  // ── Inject modal HTML on DOMContentLoaded ─────────────────
  document.addEventListener('DOMContentLoaded', () => {
    const el = document.createElement('div');
    el.id = 'csmOverlay';
    el.className = 'modal-overlay';
    el.style.display = 'none';
    el.innerHTML = `
      <div class="modal-box csm-box" onclick="event.stopPropagation()">

        <div class="modal-header">
          <div class="modal-title" id="csmTitle"></div>
          <button class="modal-close" id="csmCloseBtn">✕</button>
        </div>

        <!-- Step 1: not signed in -->
        <div id="csmStepAuth" style="display:none;text-align:center;padding:1rem 0 0.5rem">
          <div style="font-size:2.5rem;margin-bottom:0.75rem">🔐</div>
          <p id="csmSigninDesc" style="color:var(--muted);font-size:0.9rem;margin-bottom:1.25rem;line-height:1.6"></p>
          <button class="btn btn-primary" id="csmSignInBtn" style="width:100%"></button>
        </div>

        <!-- Step 2: signed in, fill form -->
        <div id="csmStepForm" style="display:none">
          <div class="csm-field">
            <label class="csm-label" id="csmNameLabel" for="csmName"></label>
            <input id="csmName" class="csm-input" type="text" maxlength="80">
          </div>
          <div class="csm-field">
            <label class="csm-label" id="csmUrlLabel" for="csmUrl"></label>
            <input id="csmUrl" class="csm-input" type="url">
          </div>
          <div id="csmError" class="csm-error" style="display:none"></div>
          <button id="csmCreateBtn" class="btn btn-primary" style="width:100%;margin-top:0.25rem"></button>
        </div>

      </div>`;

    el.addEventListener('click', closeModal);
    document.body.appendChild(el);

    // Wire buttons
    document.getElementById('csmCloseBtn' ).addEventListener('click', closeModal);
    document.getElementById('csmSignInBtn').addEventListener('click', handleSignIn);
    document.getElementById('csmCreateBtn').addEventListener('click', handleCreate);

    document.getElementById('csmUrl').addEventListener('keydown', e => {
      if (e.key === 'Enter') handleCreate();
    });
    document.getElementById('csmName').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('csmUrl').focus();
    });

    // React to auth changes
    if (typeof firebase !== 'undefined') {
      try {
        firebase.auth().onAuthStateChanged(user => {
          if (document.getElementById('csmOverlay').style.display !== 'none') {
            _refreshStep(user);
          }
        });
      } catch(e) {}
    }

    _applyModalStrings();
  });

  // ── Apply translated strings to modal ────────────────────
  function _applyModalStrings() {
    const safe = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const ph   = (id, val) => { const el = document.getElementById(id); if (el) el.placeholder  = val; };

    safe('csmTitle',      t('csm_title'));
    safe('csmSigninDesc', t('csm_signin_desc'));
    safe('csmSignInBtn',  t('csm_signin_btn'));
    safe('csmNameLabel',  t('csm_name_label'));
    safe('csmUrlLabel',   t('csm_url_label'));
    safe('csmCreateBtn',  t('csm_create_btn'));
    ph  ('csmName',       t('csm_name_ph'));
    ph  ('csmUrl',        t('csm_url_ph'));
  }

  // ── Public API ────────────────────────────────────────────
  window.openCreateShowModal = function () {
    const overlay = document.getElementById('csmOverlay');
    if (!overlay) return;
    _applyModalStrings();
    overlay.style.display = 'flex';
    const user = _currentUser();
    _refreshStep(user);
    setTimeout(() => {
      const el = user
        ? document.getElementById('csmName')
        : document.getElementById('csmSignInBtn');
      el && el.focus();
    }, 80);
  };

  function closeModal() {
    const overlay = document.getElementById('csmOverlay');
    if (overlay) overlay.style.display = 'none';
    _setError('');
    _setLoading(false);
  }

  // ── Helpers ───────────────────────────────────────────────
  function _currentUser() {
    try { return firebase.auth().currentUser; } catch(e) { return null; }
  }

  function _refreshStep(user) {
    document.getElementById('csmStepAuth').style.display = user ? 'none' : '';
    document.getElementById('csmStepForm').style.display = user ? ''     : 'none';
    if (user) {
      const nameEl = document.getElementById('csmName');
      if (nameEl && !nameEl.value) nameEl.focus();
    }
  }

  function _setError(msg) {
    const el = document.getElementById('csmError');
    if (!el) return;
    el.textContent = msg;
    el.style.display = msg ? '' : 'none';
  }

  function _setLoading(loading) {
    const btn = document.getElementById('csmCreateBtn');
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = loading ? t('csm_creating') : t('csm_create_btn');
  }

  function _extractVideoId(url) {
    if (!url) return null;
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
      if (u.searchParams.has('v'))         return u.searchParams.get('v');
    } catch (e) {}
    const m = url.match(/[?&]v=([^&]+)/);
    return m ? m[1] : null;
  }

  // ── Handlers ──────────────────────────────────────────────
  async function handleSignIn() {
    const btn = document.getElementById('csmSignInBtn');
    btn.disabled = true;
    btn.textContent = t('csm_signin_loading');
    try {
      await signInWithGoogle();
    } finally {
      btn.disabled = false;
      btn.textContent = t('csm_signin_btn');
    }
  }

  async function handleCreate() {
    _setError('');

    const title    = (document.getElementById('csmName').value || '').trim();
    const videoUrl = (document.getElementById('csmUrl' ).value || '').trim();

    if (!title) {
      _setError(t('csm_err_no_name'));
      document.getElementById('csmName').focus();
      return;
    }
    if (!videoUrl) {
      _setError(t('csm_err_no_url'));
      document.getElementById('csmUrl').focus();
      return;
    }
    if (!_extractVideoId(videoUrl)) {
      _setError(t('csm_err_bad_url'));
      document.getElementById('csmUrl').focus();
      return;
    }

    const user = _currentUser();
    if (!user) { _setError(t('csm_err_session')); return; }

    _setLoading(true);
    try {
      const db  = firebase.firestore();
      const ref = await db
        .collection('users').doc(user.uid)
        .collection('timelines')
        .add({
          title,
          videoUrl,
          keyframes:  [],
          bpm:        0,
          beatOffset: 0,
          duration:   60,
          createdAt:  firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt:  firebase.firestore.FieldValue.serverTimestamp(),
        });

      location.href = `player.html?tl=${ref.id}`;
    } catch (e) {
      _setError(t('csm_err_create') + e.message);
      _setLoading(false);
    }
  }

})();
