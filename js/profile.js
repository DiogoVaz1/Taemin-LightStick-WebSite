// ============================================================
// profile.js — Página de perfil do utilizador
//
// Permite alterar: nome de utilizador, foto (URL ou upload),
// e palavra-passe (com reautenticação).
// ============================================================

// Chamado pelo router ao entrar na view profile
function _profileEnter() {
  _renderProfilePage();
}

// Chamado pelo auth dispatcher quando o auth resolve
function _profileOnAuthReady(user) {
  if (!user) {
    // Não autenticado — volta para home
    SPA.navigate('home');
    return;
  }
  _renderProfilePage();
}

// Preenche a página com os dados do utilizador actual
function _renderProfilePage() {
  const user = currentUser;
  if (!user) return;

  const name  = user.displayName || user.email?.split('@')[0] || 'User';
  const email = user.email || '';

  // Header
  const headerName  = document.getElementById('profileHeaderName');
  const headerEmail = document.getElementById('profileHeaderEmail');
  if (headerName)  headerName.textContent  = name;
  if (headerEmail) headerEmail.textContent = email;

  // Avatar grande
  _renderProfileAvatar(user);

  // Campos de edição
  const usernameEl = document.getElementById('profileUsername');
  const photoEl    = document.getElementById('profilePhotoUrl');
  if (usernameEl) usernameEl.value = user.displayName || '';
  // No campo de URL só mostramos URLs HTTP — base64 não faz sentido mostrar no input
  const photo = window._userPhoto || user.photoURL || '';
  if (photoEl) photoEl.value = photo.startsWith('data:') ? '' : photo;

  // Limpar mensagens
  _profileMsg('Info', '');
  _profileMsg('Pass', '');
}

// Renderiza o avatar grande no header da página
function _renderProfileAvatar(user) {
  const el = document.getElementById('profileAvatarLg');
  if (!el) return;
  // Usa cache global (base64 ou URL HTTP) se disponível
  const photo   = window._userPhoto || user.photoURL || null;
  const initial = (user.displayName || user.email || '?')[0].toUpperCase();
  if (photo) {
    el.innerHTML = `<img src="${photo}" alt="avatar"
                        style="width:100%;height:100%;object-fit:cover;border-radius:50%"
                        onerror="this.parentElement.textContent='${initial}'">`;
  } else {
    el.textContent = initial;
  }
}

// ── Upload de ficheiro → URL base64 → preenche o campo ───────
function profileFileChanged(input) {
  const file = input?.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    // Redimensionar a imagem com canvas (máx 256×256 px)
    const img = new Image();
    img.onload = function() {
      const SIZE   = 256;
      const canvas = document.createElement('canvas');
      const scale  = Math.min(SIZE / img.width, SIZE / img.height, 1);
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const photoEl = document.getElementById('profilePhotoUrl');
      if (photoEl) photoEl.value = dataUrl;
      // Pré-visualiza imediatamente
      const avatarEl = document.getElementById('profileAvatarLg');
      if (avatarEl) avatarEl.innerHTML = `<img src="${dataUrl}"
          style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ── Guardar informações de perfil ─────────────────────────────
async function saveProfileInfo() {
  const user = currentUser;
  if (!user) return;

  const name        = document.getElementById('profileUsername')?.value?.trim() || '';
  const photoInput  = document.getElementById('profilePhotoUrl')?.value?.trim() || '';
  // Se o campo tem base64 (do upload), usa-o; senão usa o valor do campo URL
  const isBase64    = photoInput.startsWith('data:');

  if (!name) {
    _profileMsg('Info', t('signin_fill_username'), 'error'); return;
  }

  _profileSetLoading('Info', true);
  try {
    // 1. Firebase Auth — só aceita URLs HTTP, nunca base64
    const authUpdate = { displayName: name };
    if (!isBase64) authUpdate.photoURL = photoInput || null;
    await user.updateProfile(authUpdate);

    // 2. Firestore — guarda tudo (incluindo base64 em photoBase64)
    const fsUpdate = {
      username:  name,
      photoURL:  isBase64 ? (window._userPhoto?.startsWith('data:') ? '' : (window._userPhoto || '')) : (photoInput || ''),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    if (isBase64) {
      fsUpdate.photoBase64 = photoInput; // guarda base64 separado
    } else {
      fsUpdate.photoBase64 = firebase.firestore.FieldValue.delete(); // limpa base64 se usou URL
    }
    await firebase.firestore().collection('users').doc(user.uid).update(fsUpdate);

    // 3. Atualiza cache global
    window._userPhoto = isBase64 ? photoInput : (photoInput || null);

    // 4. Atualiza sidebar
    if (typeof renderNavAuth === 'function') renderNavAuth(user);

    _renderProfilePage();
    _profileMsg('Info', '✅ ' + t('profile_saved'), 'success');
  } catch(e) {
    _profileMsg('Info', e.message, 'error');
  } finally {
    _profileSetLoading('Info', false);
  }
}

// ── Alterar palavra-passe ─────────────────────────────────────
async function saveProfilePassword() {
  const user = currentUser;
  if (!user) return;

  const currentPass = document.getElementById('profileCurrentPass')?.value || '';
  const newPass     = document.getElementById('profileNewPass')?.value     || '';
  const confirmPass = document.getElementById('profileConfirmPass')?.value || '';

  if (!currentPass || !newPass || !confirmPass) {
    _profileMsg('Pass', t('signin_fill_all'), 'error'); return;
  }
  if (newPass !== confirmPass) {
    _profileMsg('Pass', t('profile_pass_mismatch'), 'error'); return;
  }
  if (newPass.length < 6) {
    _profileMsg('Pass', t('signin_pass_short'), 'error'); return;
  }

  _profileSetLoading('Pass', true);
  try {
    // Reautenticar antes de mudar a password
    const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPass);
    await user.reauthenticateWithCredential(credential);

    // Mudar a password
    await user.updatePassword(newPass);

    // Limpar campos
    document.getElementById('profileCurrentPass').value = '';
    document.getElementById('profileNewPass').value     = '';
    document.getElementById('profileConfirmPass').value = '';

    _profileMsg('Pass', '✅ ' + t('profile_pass_changed'), 'success');
  } catch(e) {
    switch (e.code) {
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        _profileMsg('Pass', t('signin_wrong_creds'), 'error'); break;
      case 'auth/too-many-requests':
        _profileMsg('Pass', t('signin_too_many'), 'error'); break;
      default:
        _profileMsg('Pass', e.message, 'error');
    }
  } finally {
    _profileSetLoading('Pass', false);
  }
}

// ── Utilitários ───────────────────────────────────────────────
function _profileMsg(section, msg, type) {
  const el = document.getElementById('profile' + section + 'Msg');
  if (!el) return;
  if (!msg) { el.style.display = 'none'; el.textContent = ''; return; }
  el.textContent = msg;
  el.style.display = '';
  el.className = 'profile-msg profile-msg-' + (type || 'info');
}

function _profileSetLoading(section, loading) {
  const btn = document.getElementById('profile' + section + 'Btn');
  if (btn) btn.disabled = loading;
}
