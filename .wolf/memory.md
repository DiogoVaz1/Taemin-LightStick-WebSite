# Session Memory

## 2026-06-19 — Remove playerFades system from player.js

### What changed
- Deleted all `playerFades` state, `_pendingFadeType`, `selectedFadeIdx`, `_ctxIsFade`, `_ctxFadeIdx`, `_wasFading`, `activeFade`
- Removed functions: `renderFadeTrack`, `addFade`, `removeFade`, `ctxFadeToggleType`, `ctxFadeDelete`, `showFadePicker`, `hideFadePicker`, `confirmFade`, `confirmFadeCustom`, `mobileAddFade`, `getEffectAtTime`, `_snapFadeT`, `_clampFade`
- `syncTick`: removed fades loop + `// ── Fades ──` block; fixed `else if (activeIdx !== -1 && !activeFade)` → `else if (activeIdx !== -1)`
- `_updateContextMenuItems`: removed `ctx-fade-items` branch
- `showColorPicker`: removed `colorPickerFadeRow` show/hide
- `_clipboard`: changed to `{ kfs: [] }`, removed all `_clipboard.fades` refs
- `exportKf`: removed `fades: playerFades` from payload
- `importKf`: removed fades restore block
- All remaining `renderFadeTrack()` + `renderFadeTrack` calls + scrubber fade loop removed
- `kf.animation === 'fade-out'` / `'fade-in'` logic untouched (keyframe-level animations stay)

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
