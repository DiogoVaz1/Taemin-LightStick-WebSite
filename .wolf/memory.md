# Session Memory

## 2026-06-19 — LightShow Studio major overhaul (mobile UX + fade refactor)

### Context
Full studio editor overhaul across `app.html`, `css/style.css`, `js/player.js`, `js/db.js`.

### 1. Mobile editor toolbars (app.html + style.css + player.js)
- `mobile-add-bar`: always visible on mobile (≤600px), has "🎨 Cor" button → calls `mobileAddColor()`
- `mobileKfBar` (id): visible on mobile only when a keyframe is selected (`style.display` toggled by JS)
  - Shows: label "Seg #N", 🎨 Cor, animation cycle button, 🗑️ delete
  - JS: `mobileKfColor()`, `mobileKfCycleAnim()`, `mobileKfDelete()`
  - `updateSelectionHint()` syncs visibility + animation button label
- CSS: both bars `display:none` by default; `@media (≤600px)` shows `.mobile-add-bar` as flex; `mobileKfBar` shown via inline `style.display=''`

### 2. Touch swipe-to-pan + long-press + touch drag on bands
- Track unified touchstart handler: `touchmove > 8px` = pan; `500ms timer` = long-press (context menu); tap = seek
- Band `touchstart`/`touchmove` must be `{ passive: false }` + `ev.preventDefault()` / `mv.preventDefault()` — otherwise browser steals gesture for scroll
- `_startBandDrag(startClientX, kfRef)` returns `{ move(clientX), wasDragged() }` — shared by mouse and touch

### 3. Time display update during pause (player.js)
- `updateCursor(t)` now also sets `#playerTimeDisplay` text: `formatTime(t) + ' / ' + formatTime(dur)`
- Was only updating during playback RAF; now updates on any seek including paused scrub

### 4. Timeline track height halved (style.css)
- Desktop: `.player-track { height: 56px }` (was 112px)
- Mobile (≤600px): `.player-track { height: 65px }` (was 130px)
- `.player-band { top: 3px; height: calc(100% - 6px) }` — full single-zone
- Removed `.player-track::after` separator between color/fade zones

### 5. Keyboard shortcuts (player.js — keydown handler)
- `Delete` / `Backspace`: remove selected keyframe(s). Multi-select: removes all in `_selectedKfSet`
- `Ctrl+C`: copies keyframes in selection range to `_clipboard.kfs` with `relOffset` relative to first
- `Ctrl+V`: pastes at current playhead; selects pasted keyframes

### 6. Multi-select state (player.js)
- `_selectedKfSet` (Set) — canonical multi-select; `selectedKfIdx` = last touched
- `_ctrlToggleKf(idx)` — Ctrl+Click toggles without clearing set
- `selectKf(idx)` clears set and re-adds single; deselects if same index and set size ≤ 1

### 7. Fade In / Fade Out as keyframe animations (player.js + app.html)
- `kf.animation` values: `undefined` (Solid), `'flicker'`, `'wave'`, `'fade-out'`, `'fade-in'`
- `mobileKfCycleAnim` cycle order: `[undefined, 'flicker', 'wave', 'fade-out', 'fade-in']`
- Visual: band uses `linear-gradient` (fade-out = color→transparent; fade-in = transparent→color)
- `syncTick`: fade-out/in interpolates brightness over segment duration via `progress = (t - kf.t) / duration`
- ctx-kf-items in app.html has buttons for all 5 states

### 8. Remove playerFades system (app.html + style.css + player.js)
- **app.html**: removed `ctx-fade-items`, fade buttons from `ctx-track-items`, `fadePickerOverlay`, `colorPickerFadeRow`
- **style.css**: removed `.player-fade-band`, `.player-track::after` separator, `.color-picker-fade-row`
- **player.js**: removed all state (`playerFades`, `_pendingFadeType`, `selectedFadeIdx`, `_ctxIsFade`, `_ctxFadeIdx`, `_wasFading`)
- **player.js**: removed functions: `renderFadeTrack`, `addFade`, `removeFade`, `ctxFadeToggleType`, `ctxFadeDelete`, `showFadePicker`, `hideFadePicker`, `confirmFade`, `confirmFadeCustom`, `mobileAddFade`, `getEffectAtTime`, `_snapFadeT`, `_clampFade`
- `_clipboard` is now `{ kfs: [] }` only (no `fades` array)
- `kf.animation === 'fade-out'` / `'fade-in'` logic **untouched** — these are keyframe-level animations

### 9. Fix applyTimeline losing animation/brightness (db.js:98)
- Bug: `applyTimeline` in `db.js` mapped keyframes as `{ t, effectId, duration }` — dropped `animation` and `brightness`
- Fix: changed to `{ ...k, duration: k.duration ?? 2 }` (same as `importKf`)
- `saveCurrentTimeline` in `db.js` still sends `fades: playerFades || []` — harmless (field stays in Firestore for old docs, ignored on load)

---

## 2026-06-11 — "Instrument" Visual Redesign

### What changed
- **Font**: Inter → Space Grotesk (Google Fonts link updated in app.html)
- **BG**: `#06060f` → `#09090e`; Card: `#0d0d1a` → `#111118`; Accent: `#8b5cf6` → `#7c6bf8`
- **Animated orbs removed**: `#bgCanvas` + 3 `.bg-orb` divs → single `#bgTint` static radial gradient
- **Home hero**: Simplified to just `<h1>` + `<p>` subtitle (removed `.hero-cta-group` / `.hero-cta-row`)
- **Home nav**: Feature grid (4 `.feature-card`) → nav-tiles 2×2 grid (`.nav-tiles` / `.nav-tile`)
- **Hero title**: Removed `text-shadow` glow + `filter: drop-shadow`; weight 900→700, letter-spacing -2.5px→-1.5px
- **themes.js default theme**: Updated to new color values
- **CSS `:root`**: All tokens updated to match new palette; shadows simplified (no inset glows)
- **`.btn-primary`**: Removed glow `box-shadow`

### Why
User rejected incremental polish pass ("AI slop"). Wanted fresh ground-up visual identity: darker, cleaner, no decorative noise.

### Verified working (via preview_inspect)
- Font: Space Grotesk ✅
- BG: rgb(9,9,14) ✅
- Nav-tiles at y:202 (immediately below hero) ✅
- 2-column grid ✅
- Hero title: no text-shadow, weight 700 ✅

## 2026-06-11 — "Instrument" Visual Redesign

### What changed
- **Font**: Inter → Space Grotesk (Google Fonts link updated in app.html)
- **BG**: `#06060f` → `#09090e`; Card: `#0d0d1a` → `#111118`; Accent: `#8b5cf6` → `#7c6bf8`
- **Animated orbs removed**: `#bgCanvas` + 3 `.bg-orb` divs → single `#bgTint` static radial gradient
- **Home hero**: Simplified to just `<h1>` + `<p>` subtitle (removed `.hero-cta-group` / `.hero-cta-row`)
- **Home nav**: Feature grid (4 `.feature-card`) → nav-tiles 2×2 grid (`.nav-tiles` / `.nav-tile`)
- **Hero title**: Removed `text-shadow` glow + `filter: drop-shadow`; weight 900→700, letter-spacing -2.5px→-1.5px
- **themes.js default theme**: Updated to new color values
- **CSS `:root`**: All tokens updated to match new palette; shadows simplified (no inset glows)
- **`.btn-primary`**: Removed glow `box-shadow`

### Why
User rejected incremental polish pass ("AI slop"). Wanted fresh ground-up visual identity: darker, cleaner, no decorative noise.

### Verified working (via preview_inspect)
- Font: Space Grotesk ✅
- BG: rgb(9,9,14) ✅
- Nav-tiles at y:202 (immediately below hero) ✅
- 2-column grid ✅
- Hero title: no text-shadow, weight 700 ✅
