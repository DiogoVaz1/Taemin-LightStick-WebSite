// ============================================================
// create-show-modal.js
// Modal "Novo LightShow" — pede nome + URL, cria no Firestore
// e redireciona para player.html?tl=ID
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
          <div class="modal-title">🎬 Novo LightShow</div>
          <button class="modal-close" id="csmCloseBtn">✕</button>
        </div>

        <!-- Step 1: not signed in -->
        <div id="csmStepAuth" style="display:none;text-align:center;padding:1rem 0 0.5rem">
          <div style="font-size:2.5rem;margin-bottom:0.75rem">🔐</div>
          <p style="color:var(--muted);font-size:0.9rem;margin-bottom:1.25rem;line-height:1.6">
            Inicia sessão para guardar e gerir os teus lightshows.
          </p>
          <button class="btn btn-primary" id="csmSignInBtn" style="width:100%">
            Entrar com Google
          </button>
        </div>

        <!-- Step 2: signed in, fill form -->
        <div id="csmStepForm" style="display:none">
          <div class="csm-field">
            <label class="csm-label" for="csmName">Nome do lightshow</label>
            <input id="csmName" class="csm-input" type="text"
                   placeholder="Ex: Taemin — Move (Fancam 2018)" maxlength="80">
          </div>
          <div class="csm-field">
            <label class="csm-label" for="csmUrl">URL do YouTube</label>
            <input id="csmUrl" class="csm-input" type="url"
                   placeholder="https://youtube.com/watch?v=…">
          </div>
          <div id="csmError" class="csm-error" style="display:none"></div>
          <button id="csmCreateBtn" class="btn btn-primary" style="width:100%;margin-top:0.25rem">
            🎬 Criar LightShow
          </button>
        </div>

      </div>`;

    el.addEventListener('click', closeModal);
    document.body.appendChild(el);

    // Wire buttons
    document.getElementById('csmCloseBtn' ).addEventListener('click', closeModal);
    document.getElementById('csmSignInBtn').addEventListener('click', handleSignIn);
    document.getElementById('csmCreateBtn').addEventListener('click', handleCreate);

    // Allow Enter to submit
    document.getElementById('csmUrl').addEventListener('keydown', e => {
      if (e.key === 'Enter') handleCreate();
    });
    document.getElementById('csmName').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('csmUrl').focus();
    });

    // React to auth changes so the modal stays in sync
    if (typeof firebase !== 'undefined') {
      try {
        firebase.auth().onAuthStateChanged(user => {
          if (document.getElementById('csmOverlay').style.display !== 'none') {
            _refreshStep(user);
          }
        });
      } catch(e) { /* firebase not ready yet — openModal() will handle it */ }
    }
  });

  // ── Public API ────────────────────────────────────────────
  window.openCreateShowModal = function () {
    const overlay = document.getElementById('csmOverlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    const user = _currentUser();
    _refreshStep(user);
    // Focus the right field
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
      // Pre-fill name if there's a video URL already in the field
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
    btn.textContent = loading ? '⏳ A criar…' : '🎬 Criar LightShow';
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
    btn.textContent = 'A entrar…';
    try {
      await signInWithGoogle();           // defined in auth.js
    } finally {
      btn.disabled = false;
      btn.textContent = 'Entrar com Google';
    }
  }

  async function handleCreate() {
    _setError('');

    const title    = (document.getElementById('csmName').value || '').trim();
    const videoUrl = (document.getElementById('csmUrl' ).value || '').trim();

    if (!title) {
      _setError('Indica um nome para o lightshow.');
      document.getElementById('csmName').focus();
      return;
    }
    if (!videoUrl) {
      _setError('Cola o URL do YouTube.');
      document.getElementById('csmUrl').focus();
      return;
    }
    if (!_extractVideoId(videoUrl)) {
      _setError('URL inválido — usa um link do tipo youtube.com/watch?v=… ou youtu.be/…');
      document.getElementById('csmUrl').focus();
      return;
    }

    const user = _currentUser();
    if (!user) { _setError('Sessão expirou — tenta entrar novamente.'); return; }

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

      // Redirect to the studio with the new lightshow pre-loaded
      location.href = `player.html?tl=${ref.id}`;
    } catch (e) {
      _setError('Erro ao criar: ' + e.message);
      _setLoading(false);
    }
  }

})();
