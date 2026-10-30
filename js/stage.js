// ============================================================
// Stage colour - the site takes its colour from the lightstick.
// --stick (css) is the colour the lightstick is showing. It tints the
// page glow and the lightstick drawing on Home; text and controls keep
// using the theme accent so contrast never depends on the stick colour.
// Also drives the Home colour picker and the primary Connect button.
// ============================================================
const _STAGE_KEY = 'lsw-stage-id';
let _stageId = null;           // effect id last picked, null = theme colour

function _stageThemeColor() {
  return (typeof THEMES !== 'undefined' && THEMES[currentTheme]?.accent) || '#01ffff';
}

function stageSet(color, id = null) {
  document.documentElement.style.setProperty('--stick', color);
  _stageId = id;
  try {
    if (id === null) localStorage.removeItem(_STAGE_KEY);
    else localStorage.setItem(_STAGE_KEY, String(id));
  } catch (e) {}
  _stageSyncPicker();
}

// A theme was picked explicitly: go back to its colour.
function stageThemeChanged() {
  stageSet(_stageThemeColor(), null);
}

function stageIsConnected() {
  return typeof rxChar !== 'undefined' && (!!rxChar || (typeof _extraDevices !== 'undefined' && _extraDevices.some(d => d.rxChar)));
}

function stageCtaClick() {
  if (stageIsConnected()) SPA.navigate('controller');
  else openManager();
}

// Called on pick, on entering Home and when the connection list changes.
function stageRefresh() {
  const connected = stageIsConnected();
  const cta   = document.getElementById('stageCtaLabel');
  const hint  = document.getElementById('stagePickHint');
  if (cta) {
    cta.dataset.i18n = connected ? 'hero_cta_controller' : 'hero_cta_connect';
    cta.textContent  = t(cta.dataset.i18n);
  }
  if (hint) {
    hint.dataset.i18n = connected ? 'hero_hint_live' : 'hero_hint_preview';
    hint.textContent  = t(hint.dataset.i18n);
  }
}

function _stageSyncPicker() {
  const e    = _stageId === null ? null : EFFECTS[_stageId];
  const name = document.getElementById('stagePickName');
  if (name) {
    if (e) { name.removeAttribute('data-i18n'); name.textContent = `${e.name} · ${e.id}`; }
    else   { name.dataset.i18n = 'hero_pick_prompt'; name.textContent = t('hero_pick_prompt'); }
  }
  document.querySelectorAll('#stageSwatches .stage-sw').forEach(b => {
    b.setAttribute('aria-pressed', String(Number(b.dataset.id) === _stageId));
  });
  stageRefresh();
}

function stagePick(id) {
  if (typeof setEffect === 'function') setEffect(id);   // sets stage colour + sends if connected
  else stageSet(EFFECTS[id].color, id);
}

function _stageBuild() {
  const grid = document.getElementById('stageSwatches');
  if (!grid || typeof EFFECTS_BY_HUE === 'undefined') return;
  grid.innerHTML = EFFECTS_BY_HUE.map(e =>
    `<button class="stage-sw" data-id="${e.id}" style="--c:${e.color}" aria-pressed="false" ` +
    `aria-label="${e.name}, mode ${e.id}" title="${e.name}" onclick="stagePick(${e.id})"></button>`
  ).join('');
}

(function stageInit() {
  _stageBuild();
  let saved = null;
  try { saved = localStorage.getItem(_STAGE_KEY); } catch (e) {}
  const id = saved === null ? NaN : Number(saved);
  if (EFFECTS[id]) stageSet(EFFECTS[id].color, id);
  else stageSet(_stageThemeColor(), null);
})();
