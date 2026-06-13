// ============================================================
// auth.js — Autenticação com Email/Password (Firebase Auth)
//
// FLUXO:
//   1. setupAuth() é chamado no DOMContentLoaded
//   2. Firebase verifica se o utilizador já tinha sessão aberta
//   3. onAuthStateChanged() dispara com user=null ou user={...}
//   4. onAuthReady(user) é chamado → router despacha para a view activa
//
// VARIÁVEL GLOBAL: currentUser
//   Acessível por todos os outros ficheiros (db.js, player.js, etc.)
// ============================================================

let currentUser   = null;  // utilizador actual (null = não autenticado)
let fbInitialized = false; // true se o Firebase foi configurado correctamente

// ── Inicialização ─────────────────────────────────────────────
function setupAuth() {
  fbInitialized = initFirebase();
  renderNavAuth(null);
  if (!fbInitialized) return;

  firebase.auth().onAuthStateChanged(async user => {
    currentUser = user;
    renderNavAuth(user);           // render imediato com info básica
    closeSignInModal();
    if (user) {
      await ensureUserDoc(user);   // carrega foto + username do Firestore
      renderNavAuth(user);         // re-render com foto e nome corretos
    }
    if (typeof onAuthReady === 'function') onAuthReady(user);
  });
}

// ── Modal de Sign In ──────────────────────────────────────────
function openSignInModal() {
  const modal = document.getElementById('signInModal');
  if (!modal) return;
  siShowLogin(); // garante que abre sempre no modo login
  modal.style.display = 'flex';
  siClearError();
  setTimeout(() => {
    const emailEl = document.getElementById('siEmail');
    if (emailEl) emailEl.focus();
  }, 100);
}

function closeSignInModal() {
  const modal = document.getElementById('signInModal');
  if (modal) modal.style.display = 'none';
}

// Modo: Entrar (email + password)
function siShowLogin() {
  const username  = document.getElementById('siUsername');
  const loginBtns = document.getElementById('siLoginButtons');
  const regBtns   = document.getElementById('siRegisterButtons');
  const title     = document.getElementById('siModalTitle');
  if (username)  username.style.display  = 'none';
  if (loginBtns) loginBtns.style.display = '';
  if (regBtns)   regBtns.style.display   = 'none';
  if (title)     title.innerHTML = '🔐 ' + t('sign_in_title');
  siClearError();
}

// Modo: Criar conta (username + email + password)
function siShowRegister() {
  const username  = document.getElementById('siUsername');
  const loginBtns = document.getElementById('siLoginButtons');
  const regBtns   = document.getElementById('siRegisterButtons');
  const title     = document.getElementById('siModalTitle');
  if (username)  username.style.display  = '';
  if (loginBtns) loginBtns.style.display = 'none';
  if (regBtns)   regBtns.style.display   = '';
  if (title)     title.innerHTML = '✨ ' + t('signin_create');
  siClearError();
  setTimeout(() => {
    const u = document.getElementById('siUsername');
    if (u) u.focus();
  }, 50);
}

function siShowError(msg) {
  const el = document.getElementById('siError');
  if (el) { el.textContent = msg; el.style.display = ''; }
}

function siClearError() {
  const el = document.getElementById('siError');
  if (el) { el.textContent = ''; el.style.display = 'none'; }
}

function siSetLoading(loading) {
  const emailBtn  = document.getElementById('siEmailBtn');
  const regBtn    = document.getElementById('siRegisterBtn');
  if (emailBtn) emailBtn.disabled = loading;
  if (regBtn)   regBtn.disabled   = loading;
}

// ── Email + Password: Sign In ─────────────────────────────────
async function siEmailSignIn() {
  if (!fbInitialized) return;
  siClearError();
  const email    = document.getElementById('siEmail')?.value?.trim();
  const password = document.getElementById('siPassword')?.value;
  if (!email || !password) { siShowError(t('signin_fill_all')); return; }

  siSetLoading(true);
  try {
    await firebase.auth().signInWithEmailAndPassword(email, password);
    // onAuthStateChanged fecha o modal e atualiza a UI
  } catch(e) {
    siSetLoading(false);
    switch (e.code) {
      case 'auth/user-not-found':
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
        siShowError(t('signin_wrong_creds')); break;
      case 'auth/invalid-email':
        siShowError(t('signin_invalid_email')); break;
      case 'auth/too-many-requests':
        siShowError(t('signin_too_many')); break;
      default:
        siShowError(e.message);
    }
  }
}

// ── Email + Password: Criar conta ─────────────────────────────
async function siEmailRegister() {
  if (!fbInitialized) return;
  siClearError();
  const username = document.getElementById('siUsername')?.value?.trim();
  const email    = document.getElementById('siEmail')?.value?.trim();
  const password = document.getElementById('siPassword')?.value;
  if (!username) { siShowError(t('signin_fill_username')); return; }
  if (!email || !password) { siShowError(t('signin_fill_all')); return; }
  if (password.length < 6) { siShowError(t('signin_pass_short')); return; }

  siSetLoading(true);
  try {
    const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
    // Guardar o username como displayName no perfil
    await cred.user.updateProfile({ displayName: username });
    // onAuthStateChanged trata do resto
  } catch(e) {
    siSetLoading(false);
    switch (e.code) {
      case 'auth/email-already-in-use':
        siShowError(t('signin_email_used')); break;
      case 'auth/invalid-email':
        siShowError(t('signin_invalid_email')); break;
      case 'auth/weak-password':
        siShowError(t('signin_pass_short')); break;
      default:
        siShowError(e.message);
    }
  }
}

// ── Email: Recuperar password ──────────────────────────────────
async function siForgotPassword() {
  siClearError();
  const email = document.getElementById('siEmail')?.value?.trim();
  if (!email) { siShowError(t('signin_email_for_reset')); return; }

  siSetLoading(true);
  try {
    await firebase.auth().sendPasswordResetEmail(email);
    siShowError('✅ ' + t('signin_reset_sent'));
  } catch(e) {
    siShowError(e.code === 'auth/user-not-found'
      ? t('signin_wrong_creds')
      : e.message);
  } finally {
    siSetLoading(false);
  }
}

// ── Cache global da foto de perfil (base64 ou URL) ───────────
// Firebase Auth não aceita base64 como photoURL, por isso
// guardamos no Firestore e fazemos cache aqui para uso imediato.
window._userPhoto = null; // string: base64 data URL ou HTTP URL
window._userName  = null; // string: username do Firestore

// ── Criar / atualizar documento do utilizador no Firestore ────
async function ensureUserDoc(user) {
  if (!firebase.firestore) return;
  try {
    const ref  = firebase.firestore().collection('users').doc(user.uid);
    const snap = await ref.get();
    if (!snap.exists) {
      const uname = user.displayName || user.email?.split('@')[0] || 'Fan';
      await ref.set({
        uid:       user.uid,
        username:  uname,
        email:     user.email || '',
        photoURL:  user.photoURL || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      window._userPhoto = user.photoURL || null;
      window._userName  = uname;
    } else {
      const data = snap.data();
      // Cache: prioridade para photoBase64 (upload), depois photoURL
      window._userPhoto = data.photoBase64 || data.photoURL || user.photoURL || null;
      window._userName  = data.username || user.displayName || user.email?.split('@')[0] || 'Fan';
      // Atualiza só se o displayName mudou via auth externo
      if (user.displayName && user.displayName !== data.username) {
        await ref.update({
          username:  user.displayName,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  } catch(e) {
    console.warn('[auth] ensureUserDoc:', e.message);
    window._userPhoto = user.photoURL || null;
    window._userName  = user.displayName || user.email?.split('@')[0] || 'Fan';
  }
}

// ── Logout ─────────────────────────────────────────────────────
async function signOutUser() {
  if (!fbInitialized) return;
  await firebase.auth().signOut();
}

// ── Sidebar / Navbar auth rendering ───────────────────────────
function renderNavAuth(user) {
  _renderSidebarAuth(user);   // SPA sidebar (app.html)
  _renderNavbarAuth(user);    // standalone nav (viewer.html, etc.)
}

// Sidebar footer: avatar + username + sign out / sign in
function _renderSidebarAuth(user) {
  const el = document.getElementById('sbAuthArea');
  if (!el) return;
  const name = user
    ? (window._userName || user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'User')
    : null;
  if (user) {
    const photo   = window._userPhoto || user.photoURL || null;
    const initial = (user.displayName || user.email || '?')[0].toUpperCase();
    el.innerHTML = `
      <div class="sb-user-row" onclick="SPA.navigate('profile');closeSidebarMobile()"
           style="cursor:pointer" title="${_escHtml(name)}">
        ${photo
          ? `<img src="${photo}" alt="${name}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0"
                  onerror="this.outerHTML='<div class=nav-avatar-placeholder style=width:28px;height:28px;min-width:28px;font-size:0.78rem>${initial}</div>'">`
          : `<div class="nav-avatar-placeholder" style="width:28px;height:28px;min-width:28px;font-size:0.78rem">${initial}</div>`
        }
        <span class="sb-user-name">${_escHtml(name)}</span>
        <button class="sb-signout-btn" onclick="event.stopPropagation();signOutUser()" title="${t('sign_out')}">⇥</button>
      </div>`;
  } else {
    el.innerHTML = `
      <button class="sb-signin-btn" onclick="openSignInModal()">
        <span class="sb-icon">🔐</span>
        <span class="sb-label">${t('sign_in').replace('🔐 ','')}</span>
      </button>`;
  }
}

// Top navbar (viewer.html standalone)
function _renderNavbarAuth(user) {
  const el = document.getElementById('navAuthArea');
  if (!el) return;
  if (user) {
    el.innerHTML = `
      <div class="nav-user-info">
        ${user.photoURL
          ? `<img class="nav-avatar" src="${user.photoURL}" alt="${user.displayName || ''}">`
          : `<div class="nav-avatar-placeholder">${(user.displayName || user.email || '?')[0].toUpperCase()}</div>`
        }
        <span class="nav-username">${user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'User'}</span>
        <button class="btn btn-ghost nav-signout-btn" onclick="signOutUser()">${t('sign_out')}</button>
      </div>`;
  } else {
    el.innerHTML = `
      <button class="btn btn-ghost nav-signin-btn" onclick="openSignInModal()">
        <span style="font-size:1rem;vertical-align:middle;margin-right:4px">🔐</span>${t('sign_in').replace('🔐 ','')}
      </button>`;
  }
}

function _escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

document.addEventListener('DOMContentLoaded', setupAuth);
