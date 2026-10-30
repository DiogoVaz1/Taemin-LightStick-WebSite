# Product

## Register

brand

## Users

Fans of TAEMIN (and K-pop fans in general) who own a TAEMIN lightstick (V1 or V2). They arrive mostly on a phone, often at home watching an MV or at a concert, with one hand free. They want to control the lightstick colours and effects without the official app, sync a lightshow to a YouTube video, and share or discover lightshows made by other fans. A few use a desktop to build longer lightshows in the Studio.

## Product Purpose

LightStickWaves lets fans control a TAEMIN lightstick from the browser over Web Bluetooth, build YouTube-synced lightshows, and share them in a community feed. It is a fan-made showcase: the experience around the lightstick matters as much as the controls. Success is a fan opening the site, feeling the concert atmosphere, and getting their lightstick lit within seconds.

## Brand Personality

Concert, stage, light. Warm, fan-made, a little bold. The lightstick is the star of every screen, and the interface takes its colour from the colour the lightstick is showing instead of a fixed brand colour. Reference feel: light apps such as Philips Hue, Nanoleaf and WLED, where colour is the hero and controls feel like handling light.

## Anti-references

- Corporate dashboard: rows of identical grey cards, panel-of-a-company feel.
- Childish or overdone: too much colour at once, emoji as decoration everywhere, busy animation.
- Generic neon/cyberpunk template look.
- Heavy or slow effects that drain a phone battery.

## Design Principles

1. **The lightstick is the star.** Colour on screen should come from the lightstick's current colour, not from decoration.
2. **Light, not chrome.** Use darkness as a stage and let colour and glow-in-context (not on buttons) carry energy; keep surfaces quiet.
3. **Thumb first.** Every primary action works one-handed on a phone; touch targets are 44px or larger; no right-click-only flows.
4. **Alive but cheap.** Motion should react to real state (connected, colour change, playing) and cost almost nothing on a phone; never idle decoration.
5. **Fan-made warmth.** Copy and detail should feel personal and human, not product-marketing.

## Accessibility & Inclusion

Target WCAG AA: body text contrast of at least 4.5:1 (the current muted text is slightly below this). Touch targets of at least 44px. Every animation has a `prefers-reduced-motion` alternative. Colour is never the only carrier of information (colours also have names and numbers). Strobing or rapid flicker effects in the UI must be avoidable, since lightstick effects can flicker.
