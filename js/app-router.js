// ============================================================
// app-router.js — Roteador SPA (Single Page Application)
//
// PORQUÊ EXISTE:
//   O Bluetooth desconecta se a página recarregar.
//   A solução é ter tudo num único HTML e mostrar/esconder
//   secções com display:none / display:block — nunca há
//   navegação real entre páginas.
//
// COMO FUNCIONA:
//   1. SPA.init() — lê o URL (#home, #studio, etc.) e mostra a view certa
//   2. SPA.navigate('view', params) — muda de view sem recarregar
//   3. _onEnter / _onLeave — chamados ao entrar/sair de cada view
//   4. onAuthReady(user) — despacha o estado de login para a view activa
// ============================================================

const SPA = (() => {
  // Lista de todas as views disponíveis.
  // Cada uma corresponde a um elemento #view-{nome} no HTML.
  const VIEWS = ['home', 'lightshows', 'studio', 'viewer', 'controller', 'community', 'profile', 'about', 'help', 'terms', 'admin', 'tickets'];

  let _current = null;  // view actualmente visível
  let _params  = {};    // parâmetros da view (ex: { tl: 'abc123' })

  // ── Navegar para uma view ──────────────────────────────────
  // Chamado em qualquer sítio com: SPA.navigate('studio', { tl: id })
  function navigate(view, params) {
    if (!VIEWS.includes(view)) view = 'lightshows'; // fallback seguro
    params = params || {};
    _params  = params;

    // Esconde TODAS as views e os seus nav bars
    VIEWS.forEach(v => {
      const el    = document.getElementById('view-' + v);
      const navEl = document.getElementById('nav-' + v);
      if (el)    el.style.display    = 'none';
      if (navEl) navEl.style.display = 'none';
    });

    // Mostra apenas a view de destino e o seu nav bar
    const target = document.getElementById('view-' + view);
    const navEl  = document.getElementById('nav-'  + view);
    if (target) target.style.display = 'block'; // 'block' e não '' porque o CSS tem display:none na classe
    if (navEl)  navEl.style.display  = '';

    const prev = _current;
    _current = view;

    // Marca o item activo na sidebar
    setSidebarActive(view);

    // Injeta o footer no #mainContent (exceto Studio e Viewer que são full-screen)
    _injectFooter(view);

    // Pausa o vídeo se o utilizador sair do studio ou viewer
    _onLeave(prev);

    // Actualiza o título da aba do browser
    const titles = { home: 'Home', lightshows: 'My Lightshows', viewer: 'Viewer', studio: 'LightShow Studio', controller: 'Controller', community: 'Community' };
    document.title = 'LightStickWaves — ' + (titles[view] || 'LightStickWaves');

    // Actualiza o URL sem recarregar a página
    // Ex: app.html?tl=abc123#studio
    try {
      const url = new URL(location.href);
      url.hash = view;
      if (params.tl)   url.searchParams.set('tl',   params.tl);
      else             url.searchParams.delete('tl');
      if (params.post) url.searchParams.set('post', params.post);
      else             url.searchParams.delete('post');
      history.pushState({ view: view, params: params }, '', url.toString());
    } catch(e) {}

    _onEnter(view, params, prev);

    // Vercel Analytics — track SPA page view
    window.va?.('pageview', { path: '/' + view });
  }

  // ── Actualizar apenas os parâmetros do URL ─────────────────
  // Usado pelo viewer para guardar o ID do lightshow sem mudar de view.
  // Usa replaceState (não pushState) para não criar entrada no histórico.
  function setParam(key, value) {
    _params[key] = value;
    try {
      const url = new URL(location.href);
      if (value) url.searchParams.set(key, value);
      else       url.searchParams.delete(key);
      url.hash = _current || 'lightshows';
      history.replaceState({ view: _current, params: _params }, '', url.toString());
    } catch(e) {}
  }

  // ── Ao SAIR de uma view: pausa vídeos ─────────────────────
  // Evita que o YouTube continue a tocar em background quando
  // o utilizador muda para outra view.
  function _onLeave(prev) {
    if (prev === 'studio') {
      try { if (typeof ytPlayer !== 'undefined' && ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo(); } catch(e) {}
    }
    if (prev === 'viewer') {
      try { if (typeof viewerYTPlayer !== 'undefined' && viewerYTPlayer && viewerYTPlayer.pauseVideo) viewerYTPlayer.pauseVideo(); } catch(e) {}
    }
    if (prev === 'admin') {
      if (typeof destroyAdmin === 'function') destroyAdmin();
    }
    if (prev === 'tickets') {
      if (typeof destroyTickets === 'function') destroyTickets();
    }
  }

  // ── Ao ENTRAR numa view: inicializa o seu conteúdo ────────
  function _onEnter(view, params, prev) {
    if (view === 'home') {
      if (typeof _homeEnter   === 'function') _homeEnter();
    } else if (view === 'lightshows') {
      if (typeof _mlsEnter    === 'function') _mlsEnter();
    } else if (view === 'viewer') {
      if (typeof _viewerEnter === 'function') _viewerEnter(params.tl || null);
    } else if (view === 'studio') {
      if (typeof _studioEnter === 'function') _studioEnter(params.tl || null);
    } else if (view === 'controller') {
      if (typeof _ctrlEnter   === 'function') _ctrlEnter();
    } else if (view === 'community') {
      if (typeof _communityEnter === 'function') _communityEnter();
    } else if (view === 'profile') {
      if (typeof _profileEnter === 'function') _profileEnter();
    } else if (view === 'admin') {
      if (typeof initAdmin === 'function') initAdmin(currentUser);
    } else if (view === 'tickets') {
      if (typeof initTickets === 'function') initTickets();
    }
  }

  // ── Footer global ──────────────────────────────────────────
  // Injeta o footer no #mainContent como último filho.
  // O mainContent é flex-column com min-height:100vh, por isso
  // o footer com margin-top:auto fica sempre colado ao fundo.
  function _injectFooter(view) {
    document.querySelectorAll('.site-footer').forEach(el => el.remove());
    if (view === 'studio' || view === 'viewer' || view === 'admin' || view === 'tickets') return;
    const mc = document.getElementById('mainContent');
    if (!mc) return;
    const f = document.createElement('footer');
    f.className = 'site-footer';
    f.innerHTML =
      '<div class="site-footer-links">' +
        '<button class="site-footer-btn" onclick="SPA.navigate(\'about\')" data-i18n="footer_about">' + t('footer_about') + '</button>' +
        '<span class="site-footer-sep">·</span>' +
        '<button class="site-footer-btn" onclick="SPA.navigate(\'help\')" data-i18n="footer_help">' + t('footer_help') + '</button>' +
        '<span class="site-footer-sep">·</span>' +
        '<button class="site-footer-btn" onclick="SPA.navigate(\'terms\')" data-i18n="footer_terms">' + t('footer_terms') + '</button>' +
        '<span class="site-footer-sep">·</span>' +
        '<button class="site-footer-btn" onclick="openFeedbackModal()" data-i18n="footer_feedback">' + t('footer_feedback') + '</button>' +
      '</div>' +
      '<div class="site-footer-copy">' +
        '<span data-i18n="footer_copy">' + t('footer_copy') + '</span> &middot; ' +
        '<a href="https://ko-fi.com/vazinho" target="_blank" rel="noopener" class="site-footer-kofi" data-i18n="sb_kofi">' + t('sb_kofi') + '</a>' +
      '</div>';
    mc.appendChild(f);
  }

  // ── Inicialização (chamado uma vez no DOMContentLoaded) ────
  function init() {
    // Lê a view do hash do URL (#studio, #viewer, etc.)
    const hash   = (location.hash || '').replace('#', '') || 'home';
    const params = {};
    // Lê parâmetros do URL (?tl=abc123 ou ?post=abc123)
    const tl     = new URLSearchParams(location.search).get('tl');
    const post   = new URLSearchParams(location.search).get('post');
    if (tl)   params.tl   = tl;
    if (post) params.post = post;

    _params  = params;
    _current = VIEWS.includes(hash) ? hash : 'lightshows';

    // Mostra só a view inicial, esconde as restantes
    VIEWS.forEach(v => {
      const el    = document.getElementById('view-' + v);
      const navEl = document.getElementById('nav-'  + v);
      const show  = (v === _current);
      if (el)    el.style.display    = show ? 'block' : 'none';
      if (navEl) navEl.style.display = show ? '' : 'none';
    });

    // Marca o item activo na sidebar
    setSidebarActive(_current);

    // Injeta o footer no carregamento inicial
    _injectFooter(_current);

    // Suporte para os botões Anterior/Seguinte do browser
    window.addEventListener('popstate', function(e) {
      if (e.state && e.state.view) navigate(e.state.view, e.state.params || {});
    });

    _onEnter(_current, params, null);
  }

  function current() { return _current; }
  function params()  { return _params;  }

  // API pública do router
  return { navigate: navigate, init: init, current: current, params: params, setParam: setParam };
})();

// ============================================================
// setStatus — actualiza TODOS os indicadores BLE no site
//
// Chamado pelo ble.js quando o estado da ligação muda.
// Como temos múltiplas views com indicadores BLE, actualizamos
// todos ao mesmo tempo — só o da view activa é visível.
//
// Estados: 'connected' | 'connecting' | '' (desligado)
// ============================================================
function setStatus(state, text) {
  // Pontos de status (pequeno círculo colorido) — usam data-ble-dot
  document.querySelectorAll('[data-ble-dot]').forEach(function(el) {
    el.className = 'status-dot' + (state ? ' status-' + state : '');
  });

  // Textos de status — usam data-ble-text
  var notConnected = (typeof t === 'function') ? t('ctrl_not_connected') : 'Not connected';
  document.querySelectorAll('[data-ble-text]').forEach(function(el) {
    el.textContent = text || notConnected;
  });

  // Botão flutuante BLE (FAB no canto inferior direito)
  var fab = document.getElementById('bleFab');
  if (fab) {
    fab.classList.remove('ble-connected', 'ble-connecting');
    if (state === 'connected')  fab.classList.add('ble-connected');   // pulsa roxo
    if (state === 'connecting') fab.classList.add('ble-connecting');  // pisca amarelo
  }

  // Botão de conectar específico do viewer
  const vDot = document.getElementById('viewerStatusDot');
  const vBtn = document.getElementById('viewerConnectBtn');
  if (vDot) {
    vDot.className = 'viewer-connect-status';
    if (state === 'connected')  vDot.classList.add('viewer-status-connected');
    if (state === 'connecting') vDot.classList.add('viewer-status-connecting');
  }
  if (vBtn) {
    const label = (typeof t === 'function')
      ? (state === 'connected' ? t('viewer_disconnect') : t('viewer_connect'))
      : (state === 'connected' ? 'Disconnect' : 'Connect Lightstick');
    const dotEl = vBtn.querySelector('.viewer-connect-status');
    vBtn.textContent = label;
    if (dotEl) vBtn.prepend(dotEl);
  }
}

// ============================================================
// log — escreve mensagens no painel de log da view activa
//
// No studio → #playerLog (últimas 40 mensagens, mais recente no topo)
// Noutras views → #logBox (scroll para baixo)
// ============================================================
function log(msg, type) {
  var view  = SPA.current();
  var boxId = (view === 'studio') ? 'playerLog' : 'logBox';
  var box   = document.getElementById(boxId);
  if (!box) return;

  var d = document.createElement('div');
  d.className = 'log-line log-' + (type || 'info');

  if (view === 'studio') {
    var now = new Date();
    var ts  = now.getMinutes().toString().padStart(2,'0') + ':' + now.getSeconds().toString().padStart(2,'0');
    d.textContent = '[' + ts + '] ' + msg;
    box.prepend(d); // mais recente no topo
    while (box.children.length > 40) box.removeChild(box.lastChild); // limite de 40 linhas
  } else {
    var time = new Date().toLocaleTimeString('en',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'});
    d.textContent = '[' + time + '] ' + msg;
    box.appendChild(d);
    box.scrollTop = box.scrollHeight; // auto-scroll para baixo
  }
}

// ============================================================
// onAuthReady — dispatcher do estado de autenticação Firebase
//
// Chamado por auth.js quando o Firebase resolve o estado de login.
// Acontece ao carregar a página (pode demorar ~0.5s).
// Dependendo da view activa, despacha para a função correcta.
// ============================================================
function onAuthReady(user) {
  var view = SPA.current();
  if (view === 'home'       && typeof _homeOnAuthReady     === 'function') _homeOnAuthReady(user);
  if (view === 'lightshows' && typeof _mlsOnAuthReady      === 'function') _mlsOnAuthReady(user);
  if (view === 'studio'     && typeof _dbOnAuthReady       === 'function') _dbOnAuthReady(user);
  if (view === 'viewer'     && typeof _viewerOnAuthReady   === 'function') _viewerOnAuthReady(user);
  if (view === 'profile'    && typeof _profileOnAuthReady  === 'function') _profileOnAuthReady(user);
  // controller e community não precisam de autenticação
}

// ============================================================
// Utilitários partilhados — usados em vários ficheiros
// ============================================================

// Espera N milissegundos (usado no handshake BLE)
function delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

// Referência para a colecção de timelines de um utilizador no Firestore
function getTimelinesRef(uid) {
  return firebase.firestore().collection('users').doc(uid).collection('timelines');
}

// Escapa caracteres HTML perigosos para evitar XSS
function escapeHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Formata uma data como "2 min ago", "3h ago", etc.
function formatTimeAgo(date) {
  var diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60)    return typeof t === 'function' ? t('time_just_now') : 'just now';
  if (diff < 3600)  return Math.floor(diff / 60)  + ' ' + (typeof t === 'function' ? t('time_min_ago') : 'min ago');
  if (diff < 86400) return Math.floor(diff / 3600) + (typeof t === 'function' ? t('time_h_ago') : 'h ago');
  return Math.floor(diff / 86400) + (typeof t === 'function' ? t('time_d_ago') : 'd ago');
}

// Extrai o ID de vídeo de um URL do YouTube
// Ex: "https://youtube.com/watch?v=ABC123" → "ABC123"
function extractVideoId(url) {
  if (!url) return null;
  try {
    var u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1); // youtu.be/ABC123
    if (u.searchParams.has('v'))         return u.searchParams.get('v'); // ?v=ABC123
  } catch(e) {}
  var m = url.match(/[?&]v=([^&]+)/);
  return m ? m[1] : null;
}

// ============================================================
// Callbacks de entrada em cada view
// Chamados pelo router quando se navega para uma view.
// ============================================================

// Home: carrega preview dos lightshows do utilizador.
// Limpa o cache da preview de comunidade para buscar posts frescos a cada visita.
function _homeEnter() {
  var user = null;
  try { user = firebase.auth().currentUser; } catch(e) {}
  var commGrid = document.getElementById('homeCommunityGrid');
  if (commGrid) { commGrid.dataset.built = ''; commGrid.innerHTML = ''; }
  if (typeof _homeOnAuthReady === 'function') _homeOnAuthReady(user);
}

// Community: carrega o feed de lightshows públicos
function _communityEnter() {
  if (typeof loadCommunityFeed === 'function') loadCommunityFeed();
}

// My Lightshows: carrega a grid de lightshows ou mostra "faz login"
function _mlsEnter() {
  var user = null;
  try { user = firebase.auth().currentUser; } catch(e) {}
  if (!user) {
    if (typeof showState === 'function') showState('signIn');
  } else {
    if (typeof loadShows === 'function') loadShows();
  }
}

// Viewer: mostra loading e decide entre post de comunidade ou lightshow próprio.
//
// FLUXO:
//   - Se params.post está definido → é um post de comunidade (sem auth)
//   - Se params.tl está definido   → é lightshow próprio (precisa de auth)
//   - Se nenhum          → mostra erro "nenhum lightshow especificado"
//
// NOTA: Para lightshows próprios, não mostra erro de login imediatamente porque
// o Firebase pode ainda não ter resolvido o estado de auth (~0.5s).
// _viewerOnAuthReady() trata do erro de login se necessário.
function _viewerEnter(tlId) {
  var loadingEl = document.getElementById('viewerLoading');
  var contentEl = document.getElementById('viewerContent');
  var errorEl   = document.getElementById('viewerError');
  if (loadingEl) loadingEl.style.display = '';
  if (contentEl) contentEl.style.display = 'none';
  if (errorEl)   errorEl.style.display   = 'none';

  // Esconde botão de like (só visível em posts de comunidade)
  var likeBtn = document.getElementById('viewerLikeBtn');
  if (likeBtn) likeBtn.style.display = 'none';

  // ── Post de comunidade (não precisa de auth) ──────────────
  var postId = SPA.params().post;
  if (postId) {
    if (typeof loadCommunityViewerPost === 'function') loadCommunityViewerPost(postId);
    return;
  }

  // ── Lightshow próprio ─────────────────────────────────────
  if (!tlId) {
    if (typeof showViewerError === 'function')
      showViewerError(typeof t === 'function' ? t('viewer_no_show') : 'No show selected');
    return;
  }
  var user = null;
  try { user = firebase.auth().currentUser; } catch(e) {}
  if (user) {
    // Auth já resolveu — carrega imediatamente
    if (typeof loadViewerShow === 'function') loadViewerShow(user, tlId);
  }
  // Se user=null: fica no loading, _viewerOnAuthReady() vai tratar disto
}

// Studio: move o #sharedPlayerBar para dentro do studio e carrega o lightshow.
//
// TRUQUE DO sharedPlayerBar:
//   O mesmo elemento DOM (#sharedPlayerBar) é partilhado entre studio e controller.
//   Em vez de duplicar, movemos fisicamente o elemento com appendChild().
//   Isto preserva todos os event listeners e estado do player.
function _studioEnter(tlId) {
  var bar = document.getElementById('sharedPlayerBar');
  var page = document.querySelector('#view-studio .player-page');
  if (bar && page && bar.parentNode !== page) page.appendChild(bar);

  if (tlId) {
    var user = null;
    try { user = firebase.auth().currentUser; } catch(e) {}
    if (user && typeof loadTimelineById === 'function') {
      loadTimelineById(tlId);
    } else {
      // Guarda o ID para carregar quando o auth resolver
      window._pendingTimelineId = tlId;
    }
  }
  // Re-renderiza os componentes visuais do studio
  if (typeof renderPlayerTimeline === 'function') renderPlayerTimeline();
  if (typeof renderFadeTrack      === 'function') renderFadeTrack();
  if (typeof renderBeatGrid       === 'function') renderBeatGrid();
  if (typeof renderTimeRuler      === 'function') renderTimeRuler();
  if (typeof renderPlayerScrubber === 'function') renderPlayerScrubber();
}

// Controller: move o #sharedPlayerBar para o controller e inicializa.
function _ctrlEnter() {
  var bar = document.getElementById('sharedPlayerBar');
  var container = document.querySelector('#view-controller .container');
  if (bar && container && bar.parentNode !== container) container.appendChild(bar);
  if (typeof _initController === 'function') _initController();
}

// ============================================================
// Bootstrap — arranca o router quando o DOM está pronto
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
  SPA.init();
  // Restore sidebar collapsed state on desktop
  if (window.innerWidth > 768 && localStorage.getItem('sb-collapsed') === '1') {
    var sb = document.getElementById('sidebar');
    var mw = document.getElementById('mainWrapper');
    if (sb) sb.classList.add('sb-collapsed');
    if (mw) mw.style.marginLeft = '56px';
  }
});

// ============================================================
// Sidebar helpers
// ============================================================

// Mapeia cada view para o ID do botão na sidebar
var _sbMap = {
  home:       'sb-home',
  community:  'sb-community',
  controller: 'sb-controller',
  lightshows: 'sb-lightshows',
  studio:     'sb-lightshows',
  viewer:     'sb-lightshows',
  profile:    null,
  admin:      'sb-admin',
  tickets:    'sb-tickets',
};

function setSidebarActive(view) {
  document.querySelectorAll('.sb-item').forEach(function(el) {
    el.classList.remove('sb-active');
  });
  var id = _sbMap[view];
  if (id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('sb-active');
  }
}

// Toggle sidebar: no desktop colapsa (futuro), no mobile abre/fecha
function toggleSidebar() {
  var sb = document.getElementById('sidebar');
  if (!sb) return;
  if (window.innerWidth <= 768) {
    var isOpen = sb.classList.toggle('sb-open');
    var overlay = document.getElementById('sbOverlay');
    if (overlay) overlay.classList.toggle('sb-visible', isOpen);
  } else {
    var collapsed = sb.classList.toggle('sb-collapsed');
    document.getElementById('mainWrapper') && (document.getElementById('mainWrapper').style.marginLeft = collapsed ? '56px' : '220px');
    localStorage.setItem('sb-collapsed', collapsed ? '1' : '0');
  }
}

// Fecha sidebar em mobile (chamado ao clicar num item)
function closeSidebarMobile() {
  if (window.innerWidth > 768) return;
  var sb = document.getElementById('sidebar');
  var overlay = document.getElementById('sbOverlay');
  if (sb) sb.classList.remove('sb-open');
  if (overlay) overlay.classList.remove('sb-visible');
}
