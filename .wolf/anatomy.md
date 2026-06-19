# Project Anatomy — LightStickWaves

## Stack
- Framework-free static site (raw HTML/CSS/JS), no npm/bundler
- Firebase (Auth, Firestore, AppCheck) + Vercel deployment
- Dev server: Python `http.server` on port 5500 via `.claude/launch.json`

## Key Files
- `app.html` — SPA shell (1600+ lines). All views live here, JS shows/hides via `display:none/block`. Never reloads.
- `css/style.css` — ~3300 line design system. `:root` tokens are fallbacks; `js/themes.js` overrides at runtime.
- `js/themes.js` — Theme system. `applyTheme(key)` writes CSS vars on `documentElement.style`. Always update both files together.
- `index.html` — Immediate redirect to `app.html#home`
- `PRODUCT.md` — Product register, brand personality, design principles

## SPA Views (in app.html)
- `#view-home` — Landing with hero + nav-tiles + home-preview-section
- `#view-controller` — BLE lightstick controller
- `#view-studio` — LightShow Studio (YouTube sync)
- `#view-viewer` — Viewer (plays a saved show)
- `#view-lightshows` — My Lightshows library
- `#view-community` — Community hub
- `#view-about`, `#view-help`, `#view-terms` — Static info pages

## Design System (current — "Instrument" redesign Jun 2026)
- Font: Space Grotesk (Google Fonts)
- BG: `#09090e`, Card: `#111118`, Accent: `#7c6bf8`, Accent2: `#e86c9f`
- No animated background orbs — replaced with `#bgTint` static radial gradient
- No gradient text, no glassmorphism on cards (blur reserved for modals only)
- Nav-tiles 2×2 grid on home page (replaces hero CTAs + feature grid)
- Spacing: 4pt base scale `--sp-1..16`; Radius: `--r-sm/md/lg/xl`

## LightShow Studio — Key Concepts (as of Jun 2026)
- `js/player.js` — all studio logic. State: `playerKeyframes[]`, `selectedKfIdx`, `_selectedKfSet` (Set), `_clipboard = { kfs: [] }`, `viewStart`, `viewWindow`, `bpm`, `beatOffset`
- Keyframe shape: `{ t, effectId, duration, brightness?, animation? }`. `animation` values: `undefined`=Solid, `'flicker'`, `'wave'`, `'fade-out'`, `'fade-in'`
- `js/db.js` — Firestore CRUD. `applyTimeline(tl)` loads a saved show into editor state. `saveCurrentTimeline(title)` writes to Firestore. **IMPORTANT**: use `{ ...k }` spread when mapping keyframes to preserve `animation`/`brightness` — do NOT destructure only `{ t, effectId, duration }`
- `#playerTrack` — single-zone timeline div (height 56px desktop / 65px mobile). No second fade zone. `contextmenu` = add/edit; `mousedown` = seek/pan/drag
- Band touch handlers MUST be `{ passive: false }` + `preventDefault()` — otherwise browser steals scroll gesture
- `updateCursor(t)` — updates cursor line + `#playerTimeDisplay` (even when paused)
- `syncTick()` — 100ms BLE sync loop. Handles flicker/wave/fade-in/fade-out animations via `kf.animation`
- Mobile toolbars: `.mobile-add-bar` (always visible ≤600px) + `#mobileKfBar` (shown via JS when kf selected)
- **playerFades system is GONE** — do not reference `playerFades`, `renderFadeTrack`, `showFadePicker`, `selectedFadeIdx`, `_ctxIsFade` anywhere

## Known Gotchas
- Firebase AppCheck blocks `preview_screenshot` on localhost (CPU-blocking CAPTCHA loop). Use `preview_inspect` instead.
- `SPA.navigate('controller')` fails without BLE context — use hash nav or DOM manipulation for testing.
- i18n system (`data-i18n` attrs) overrides text content on render — new HTML text is just a fallback.
- `db.js:saveCurrentTimeline` still writes `fades: playerFades || []` — `playerFades` is undefined so writes `[]`. Harmless, but old Firestore docs may have stale `fades` field (ignored on load).
