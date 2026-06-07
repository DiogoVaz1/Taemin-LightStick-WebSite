// ============================================================
// auth.js — Autenticação com Google via Firebase Auth
//
// FLUXO:
//   1. setupAuth() é chamado no DOMContentLoaded
//   2. Firebase verifica se o utilizador já tinha sessão aberta
//   3. onAuthStateChanged() dispara com user=null ou user={...}
//   4. onAuthReady(user) é chamado → router despacha para a view activa
//
// VARIÁVEL GLOBAL: currentUser
//   Acessível por todos os outros ficheiros (db.js, player.js, etc.)
//   Vale null se não está autenticado, ou o objecto Firebase User se está.
// ============================================================

let currentUser   = null;  // utilizador actual (null = não autenticado)
let fbInitialized = false; // true se o Firebase foi configurado correctamente

// Inicializa o Firebase e começa a ouvir mudanças de autenticação
function setupAuth() {
  fbInitialized = initFirebase(); // definida em firebase-config.js
  renderNavAuth(null); // mostra botão "Sign In" enquanto carrega
  if (!fbInitialized) return; // Firebase não configurado — para aqui

  // onAuthStateChanged dispara:
  //   - imediatamente ao carregar (com o utilizador da sessão anterior ou null)
  //   - sempre que o utilizador faz login ou logout
  firebase.auth().onAuthStateChanged(user => {
    currentUser = user;
    renderNavAuth(user);                                    // actualiza a navbar
    if (typeof onAuthReady === 'function') onAuthReady(user); // notifica o router
  });
}

// Abre popup do Google para autenticação
async function signInWithGoogle() {
  if (!fbInitialized) {
    alert(t('firebase_not_ready'));
    return;
  }
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await firebase.auth().signInWithPopup(provider);
    // Quando o popup fecha com sucesso, onAuthStateChanged dispara automaticamente
  } catch(e) {
    // Ignora erro de popup fechado pelo utilizador (não é um erro real)
    if (e.code !== 'auth/popup-closed-by-user') {
      alert(t('auth_login_error') + e.message);
    }
  }
}

// Faz logout
async function signOutUser() {
  if (!fbInitialized) return;
  await firebase.auth().signOut();
  // onAuthStateChanged dispara com user=null
}

// Renderiza a área de autenticação na navbar (canto superior direito)
// Quando autenticado: foto + nome + botão "Sair"
// Quando não autenticado: botão "Entrar"
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

// Inicia o processo de autenticação quando o DOM está pronto
document.addEventListener('DOMContentLoaded', setupAuth);
