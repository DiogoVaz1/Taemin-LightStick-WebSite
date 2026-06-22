# LightStickWaves — Claude Context

## Stack
- Framework-free static SPA (`app.html`). No npm/bundler. Firebase Auth + Firestore + AppCheck. Vercel deploy.
- Dev server: Python `http.server` port 5500 via `.claude/launch.json`
- Font: Space Grotesk. Design tokens in `css/style.css` `:root` + overridden at runtime by `js/themes.js`

## Key Files
- `app.html` — SPA shell (1600+ lines). All views here, shown/hidden via `display`.
- `css/style.css` — ~3300 line design system
- `js/player.js` — LightShow Studio logic (keyframes, BLE sync, timeline)
- `js/db.js` — Firestore CRUD (save/load lightshows)
- `js/app-router.js` — SPA router. Contains global `extractVideoId(url)` and `escapeHtml(s)` — do not duplicate these in other files.
- `js/i18n.js` — translations. Supported languages: **EN, PT, KO**. All UI strings need `data-i18n` attr + key in all 3 langs.
- `js/themes.js` — theme system. Always update BOTH `style.css` `:root` AND `themes.js` when changing colors.

## SPA Views
`#view-home`, `#view-controller` (BLE), `#view-studio` (editor), `#view-viewer`, `#view-lightshows`, `#view-community`, `#view-about`, `#view-help`, `#view-terms`

## LightShow Studio — State & Architecture
- `playerKeyframes[]` — `{ t, effectId, duration, brightness?, animation? }`. `animation`: `undefined`=Solid, `'flicker'`, `'wave'`, `'fade-out'`, `'fade-in'`
- `_selectedKfSet` (Set) — multi-select. `selectedKfIdx` — last touched.
- `_clipboard = { kfs: [] }` — copy/paste
- `#playerTrack` — single-zone timeline (56px desktop / 65px mobile). `contextmenu`=add/edit; `mousedown`=seek/pan/drag
- `#playerRuler` — draggable (mouse + touch): drag=pan, click/tap=seek. Handler: `onRulerMouseDown`.
- `updateCursor(t)` — updates cursor + `#playerTimeDisplay` (even when paused)
- `syncTick()` — 100ms BLE loop. Handles all `kf.animation` types incl. fade-in/out brightness interpolation
- Mobile toolbars: `.mobile-add-bar` (always visible ≤600px) + `#mobileKfBar` (JS-toggled when kf selected)
- Band touch events MUST be `{ passive: false }` + `preventDefault()` — prevents browser scroll hijack
- **Mobile band interaction**: short tap = select (mobileKfBar); long-press 500ms = context menu (color/effects/delete)

## Utility Functions — Global (app-router.js, loaded first)
- `extractVideoId(url)` — YouTube URL → video ID. Single canonical copy in `app-router.js`. Do NOT re-implement.
- `escapeHtml(s)` — XSS-safe HTML escaping. Single canonical copy in `app-router.js`. Do NOT re-implement as `_esc`, `_escHtml`, etc.
- `formatTime(s, decimal=false)` — "M:SS" format. In `player.js`. Pass `decimal=true` for "M:SS.S" (studio time display only).

## db.js Rules
- `applyTimeline(tl)` and `importKf()` must map keyframes as `{ ...k, duration: k.duration ?? 2 }` — never pick only `{ t, effectId, duration }` or `animation`/`brightness` is lost.
- `saveCurrentTimeline()` serializes `playerKeyframes` directly AND syncs community post if `window._activeCommunityPostId` is set (show is public).
- `window._activeCommunityPostId` — set in `applyTimeline()`, updated in `setShowVisibility()`. Used to keep community post in sync on save.

## Terminology
- Keyframe segments are called **"segments"** everywhere in the UI (EN: "segments", PT: "segmentos", KO: "세그먼트"). Do NOT use "cues" in UI strings. i18n key: `card_segments`.

## CSS — Mobile Touch
- `.player-track`, `.player-band`, `.player-ruler` all have `user-select: none; -webkit-user-select: none; -webkit-touch-callout: none` — prevents text selection / iOS callout on long-press.

## Design Rules
- No animated bg orbs (removed). Static `#bgTint` radial gradient only.
- No gradient text (`background-clip: text`). No `text-shadow` on hero. No glow `box-shadow` on buttons.
- No glassmorphism on cards (blur only for modals/overlays).
- `preview_screenshot` hangs on localhost (Firebase AppCheck). Use `preview_inspect` instead.

## DELETED — Do Not Re-Add
- `playerFades` array and entire fade track system (removed Jun 2026). Fade In/Out now live as `kf.animation` on keyframes.
- `renderFadeTrack`, `showFadePicker`, `hideFadePicker`, `confirmFade`, `selectedFadeIdx`, `_ctxIsFade`, `_ctxFadeIdx`, `_pendingFadeType` — all gone.
- `ctx-fade-items` menu section in app.html — gone.
- `fadePickerOverlay` in app.html — gone.
- Second timeline zone (`.player-fade-band`) — gone.
- Duplicate helpers: `fmtTime` (viewer.js), `_escapeHtml` (viewer.js), `_escHtml` (auth.js), `_esc` (admin.js), `colorStrip` (my-lightshows.js) — all removed. Use globals from app-router.js.

## After Every Change — Mandatory
1. **Mobile**: layout works ≤600px. Touch targets ≥44px. No right-click-only flows.
2. **Translations**: new visible text → `data-i18n` attr + key in EN + PT + KO in `js/i18n.js`.
