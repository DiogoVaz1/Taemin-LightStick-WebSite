# Cerebrum — Preferences, Learnings, Do-Not-Repeat

## Preferences
- User wants designs that feel **crafted by a human**, not AI-generated. Avoid safe/corporate patterns.
- Incremental polish passes are NOT enough — when user asks for "new visual", do a ground-up rethink.
- Single flat accent color (not gradient), clean geometric type, no decorative noise.
- Space Grotesk is the project font (not Inter).

## Color Palette
- BG: `#000814` (deep navy), Card: `#001229`
- Theme 1 "Wave": accent `#01ffff` cyan, accent2 `#ffd60a`
- Theme 2 "Solar": accent `#ffd60a` gold, accent2 `#01ffff`, card `#0d1000`
- Both accents are bright — buttons use `color: var(--accent-fg, #000814)` (dark text on bright bg)
- `--accent-fg: #000814` is set in every theme

## Do-Not-Repeat
- DO NOT use animated background orbs — replaced with static radial tint
- DO NOT use gradient text (`background-clip: text`) anywhere
- DO NOT add `text-shadow` glow on hero titles
- DO NOT use glassmorphism on regular cards (blur only for modals/overlays)
- DO NOT use uppercase+tracking eyebrow labels on cards
- DO NOT add `box-shadow` glow on buttons
- DO NOT use side-stripe card borders
- DO NOT create identical 4-card grids as primary nav (use nav-tiles instead)

## Project Patterns
- Theme system: `js/themes.js` overrides CSS vars at runtime — always update BOTH `style.css` `:root` AND `themes.js` when changing colors
- `preview_screenshot` times out on localhost (Firebase AppCheck). Use `preview_inspect` for verification.
- SPA routing via `SPA.navigate(view)` — some views require prior context (e.g., controller needs BLE)
- i18n system overrides `data-i18n` element text content — hardcoded text in HTML is just fallback
