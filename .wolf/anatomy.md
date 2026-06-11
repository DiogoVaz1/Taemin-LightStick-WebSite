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

## Known Gotchas
- Firebase AppCheck blocks `preview_screenshot` on localhost (CPU-blocking CAPTCHA loop). Use `preview_inspect` instead.
- `SPA.navigate('controller')` fails without BLE context — use hash nav or DOM manipulation for testing.
- i18n system (`data-i18n` attrs) overrides text content on render — new HTML text is just a fallback.
