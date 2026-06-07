// ============================================================
// auth.js — Google Sign-In via Firebase Authentication
// ============================================================
let currentUser   = null;
let fbInitialized = false;

function setupAuth() {
  fbInitialized = initFirebase();
  renderNavAuth(null);
  if (!fbInitialized) return;

  firebase.auth().onAuthStateChanged(user => {
    currentUser = user;
    renderNavAuth(user);
    if (typeof onAuthReady === 'function') onAuthReady(user);
  });
}

async function signInWithGoogle() {
  if (!fbInitialized) {
    alert(t('firebase_not_ready'));
    return;
  }
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await firebase.auth().signInWithPopup(provider);
  } catch(e) {
    if (e.code !== 'auth/popup-closed-by-user') {
      alert(t('auth_login_error') + e.message);
    }
  }
}

async function signOutUser() {
  if (!fbInitialized) return;
  await firebase.auth().signOut();
}

function renderNavAuth(user) {
  const el = document.getElementById('navAuthArea');
  if (!el) return;

  if (user) {
    el.innerHTML = `
      <div class="nav-user-info">
        ${user.photoURL
          ? `<img class="nav-avatar" src="${user.photoURL}" alt="${user.displayName}">`
          : `<div class="nav-avatar-placeholder">${(user.displayName||'?')[0].toUpperCase()}</div>`
        }
        <span class="nav-username">${user.displayName?.split(' ')[0] || 'User'}</span>
        <button class="btn btn-ghost nav-signout-btn" onclick="signOutUser()">${t('sign_out')}</button>
      </div>`;
  } else {
    el.innerHTML = `
      <button class="btn btn-ghost nav-signin-btn" onclick="signInWithGoogle()">
        <span style="font-size:1rem;vertical-align:middle;margin-right:4px">🔐</span> ${t('sign_in').replace('🔐 ','')}
      </button>`;
  }
}

document.addEventListener('DOMContentLoaded', setupAuth);
