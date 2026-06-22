# LightStickWaves — Technical Reference

## Overview

LightStickWaves is a static single-page web app (SPA) for Taemin/SHINee fans. It controls a physical TAEMIN LIGHTSTICK over Web Bluetooth and syncs colors/effects to YouTube music videos. Users can create, save, share, and play lightshows (sequences of color cues).

**Stack:** Vanilla JS + Firebase (Auth, Firestore, AppCheck) + YouTube IFrame API + Web Bluetooth. No framework, no bundler. Deployed on Vercel.

---

## Architecture

### SPA Routing

`app.html` is the sole HTML file. All views exist in the DOM simultaneously, shown/hidden by `display` style. Navigation never reloads the page — this preserves the active BLE connection.

**Router:** `js/app-router.js` → `SPA.navigate(view, params)`

**Views:**
| ID | Purpose |
|---|---|
| `#view-home` | Landing page: hero + preview cards |
| `#view-studio` | LightShow editor (timeline + YouTube) |
| `#view-viewer` | Read-only lightshow player |
| `#view-controller` | Live lightstick control panel |
| `#view-lightshows` | My Lightshows grid |
| `#view-community` | Community feed |
| `#view-profile` | User settings |
| `#view-admin` | Admin feedback inbox |
| `#view-tickets` | Public feedback status |

### Script Load Order

All scripts are global (no modules). Order matters:

```
firebase-config.js → effects.js → themes.js → i18n.js →
app-router.js → ble.js → timeline.js → app.js → beat.js →
player.js → auth.js → db.js → feedback.js → community.js →
index-preview.js → my-lightshows.js → viewer.js →
create-show-modal.js → profile.js → admin.js → tickets.js
```

### Layout Structure

```
<body>
  #sidebar          — fixed left nav (220px / 56px collapsed)
  #mainWrapper
    #mainContent
      #view-*       — one active at a time
    .site-footer
  [global modals]   — overlays portaled to body
```

---

## File Reference

### `js/firebase-config.js`
Initialises Firebase SDK and App Check (reCAPTCHA v3). No logic — pure config.

**Globals:** `FIREBASE_CONFIG`, `RECAPTCHA_SITE_KEY`, `initFirebase()`, `isFirebaseConfigured()`

---

### `js/app-router.js`
SPA controller. Manages view switching, URL params, sidebar highlights, and auth dispatch.

**Key globals:**
| Name | Type | Purpose |
|---|---|---|
| `SPA.navigate(view, params)` | fn | Switch view, update URL |
| `SPA.params()` | fn | Read current URL params (`{tl, post}`) |
| `SPA.setParam(key, val)` | fn | Update param without changing view |
| `SPA.current()` | fn | Active view name |
| `onAuthReady(user)` | fn | Called by auth.js when Firebase resolves |
| `setStatus(state, text)` | fn | Update BLE indicator across all views |
| `log(msg, type)` | fn | Append to log panel (`info`, `err`, `send`, `recv`) |
| `delay(ms)` | fn | `Promise`-based setTimeout |
| `getTimelinesRef(uid)` | fn | `users/{uid}/timelines` Firestore ref |
| `extractVideoId(url)` | fn | YouTube URL → video ID (canonical, do not re-implement) |
| `escapeHtml(s)` | fn | XSS-safe HTML entity encoding (canonical, do not re-implement) |
| `formatTimeAgo(date)` | fn | Relative time string ("2h ago") |

**View enter/auth hooks** (called internally by router):
- `_homeEnter()` / `_homeOnAuthReady(user)`
- `_studioEnter(tlId)` / `_dbOnAuthReady(user)` — studio uses db.js for auth
- `_viewerEnter()` / `_viewerOnAuthReady(user)`
- `_mlsEnter()` / `_mlsOnAuthReady(user)`
- `_communityEnter()`
- `_profileEnter()` / `_profileOnAuthReady(user)`
- `initAdmin(user)` / `destroyAdmin()`
- `initTickets()` / `destroyTickets()`

---

### `js/auth.js`
Email/password auth. Owns the Firebase auth state and user Firestore document.

**Global state:**
- `currentUser` — Firebase user object or `null`
- `window._userPhoto` — cached profile photo (HTTP URL or base64)
- `window._userName` — cached username from Firestore

**Key globals:**
| Name | Purpose |
|---|---|
| `openSignInModal()` / `closeSignInModal()` | Auth modal |
| `siEmailSignIn()` | Sign in |
| `siEmailRegister()` | Create account (writes `users/{uid}`) |
| `signOutUser()` | Sign out |
| `ensureUserDoc(user)` | Create/sync Firestore profile doc |
| `renderNavAuth(user)` | Update sidebar with user info |

**Firestore:** reads/writes `users/{uid}` (`uid`, `username`, `email`, `photoURL`, `photoBase64`, `createdAt`, `updatedAt`)

---

### `js/db.js`
CRUD for lightshows. Owns studio session state.

**Global state:**
- `window._activeTimelineId` — Firestore doc ID of the open lightshow
- `window._activeTimelineTitle` — title of the open lightshow
- `window._activeCommunityPostId` — community post ID if the show is public (null otherwise)

**Key globals:**
| Name | Purpose |
|---|---|
| `saveCurrentTimeline(title)` | Write `playerKeyframes` + metadata to Firestore. If `_activeCommunityPostId` is set, also syncs the community post |
| `applyTimeline(tl)` | Load lightshow into studio. Maps keyframes as `{ ...k, duration: k.duration ?? 2 }` — must preserve `animation` and `brightness` |
| `loadTimelineById(id)` | Fetch by ID, then call `applyTimeline` |
| `fetchUserTimelines()` | Get user's lightshows (50, sorted by `updatedAt` desc) |
| `deleteTimelineById(id)` | Delete timeline + community post if published |
| `setShowVisibility(tlId, makePublic)` | Toggle public/private. Creating a community post copies keyframes as a snapshot and sets `_activeCommunityPostId`. Deleting clears it |
| `onSaveClick()` | Save button handler |
| `openTimelinesModal()` / `closeTimelinesModal()` | Load/switch dialog in studio |
| `_dbOnAuthReady(user)` | Auth callback (called by router after studio loads) |

**Firestore:**
- `users/{uid}/timelines/{docId}` — read/write
- `community/{postId}` — write when publishing/syncing

---

### `js/effects.js`
Static list of the 28 lightstick color/effect presets.

**Globals:** `EFFECTS[]`, `EFFECT_COUNT` (28)

**Effect object:** `{ id: 0x00–0x1B, name: string, color: 'rgb(...)' }`

---

### `js/player.js`
LightShow Studio editor. Owns the timeline being edited.

**Global state:**
| Variable | Purpose |
|---|---|
| `playerKeyframes[]` | Array of keyframe objects being edited |
| `selectedKfIdx` | Index of last-selected keyframe (−1 = none) |
| `_selectedKfSet` | Set of selected indices (multi-select) |
| `_clipboard` | `{ kfs: [] }` — copy/paste buffer |
| `viewStart` | First visible second in timeline |
| `viewWindow` | Seconds visible at once (zoom level) |
| `_ctxKfIdx` / `_ctxIsKf` | Context menu target |
| `_animPhase` | Tick counter for flicker/wave animation |
| `ytPlayer` | YouTube IFrame Player instance |
| `_standalonePlaying` / `_standaloneTime` | Timer-based playback (no video) |

**Keyframe structure:**
```js
{
  t: number,           // start time in seconds
  effectId: number,    // 0x00–0x1B (index into EFFECTS)
  duration: number,    // hold time in seconds
  brightness?: number, // 0–10 (overrides global; undefined = use global)
  animation?: string   // undefined=Solid | 'flicker' | 'wave' | 'fade-out' | 'fade-in'
}
```

**Key globals:**
| Name | Purpose |
|---|---|
| `loadVideo()` | Load YouTube video into studio player |
| `toggleVideoPlay()` | Play/pause (YouTube or standalone timer) |
| `getPlayerCurrentTime()` | Current playback position (seconds) |
| `addKeyframeAtCurrentTime()` | Insert keyframe at cursor |
| `addPlayerKf(t, effectId, dur)` | Programmatic keyframe add |
| `removePlayerKf(idx)` | Delete keyframe + fix selection set |
| `selectKf(idx)` | Select single keyframe (deselects if same) |
| `snapKf(kf)` | Snap to neighbors, prevent overlap (gap < 0.15s) |
| `recalcKfDurations()` | Clip all durations to gaps |
| `renderPlayerTimeline()` | Redraw timeline track (bands + handles) |
| `updateSelectionHint()` | Sync hint text + `#mobileKfBar` visibility |
| `startSyncTick()` / `stopSyncTick()` | 100ms BLE sync loop |
| `startCursorRaf()` / `stopCursorRaf()` | RAF cursor animation |
| `onRulerMouseDown(e)` | Ruler: drag=pan, click=seek |
| `onTrackMouseDown(e)` | Track: seek or pan |
| `onTrackContextMenu(e)` | Right-click menu (desktop) |
| `exportKf()` | Download timeline as JSON |
| `importKf()` | Load timeline from JSON file |
| `formatTime(s, decimal=false)` | Format seconds: `"M:SS"` or `"M:SS.S"` (pass `true` for decimal — used only in time display) |
| `clearPlayerTimeline()` | Reset to empty |

**Mobile interaction:**
- `.mobile-add-bar` — always visible ≤600px, adds color at cursor
- `#mobileKfBar` — shown when a keyframe is selected; has color, animation cycle, delete buttons
- **Short tap** on band → select keyframe → shows `mobileKfBar`
- **Long-press 500ms** on band → opens full context menu (color, effects, brightness, delete)

**`syncTick()` — BLE sync loop (100ms):**
1. Finds active keyframe at current time
2. On keyframe change: sends `0x15 [effectId, 0x01]` + initial brightness for fade-in/fade-out
3. Each tick:
   - `flicker`: alternates brightness 0/max every 2 ticks (2.5Hz, `% 4 < 2`)
   - `wave`: sine curve over 10 ticks = 1s cycle (`sin(_animPhase * π / 5)`)
   - `fade-out`: brightness decreases linearly from max to 0 over `duration`
   - `fade-in`: brightness increases linearly from 0 to max over `duration`
   - No animation + `brightness` set: sends brightness once on entry

---

### `js/db.js` + `js/player.js` — Community Sync Rule

`saveCurrentTimeline()` checks `window._activeCommunityPostId`. If set, it also updates `community/{postId}` with current `keyframes`, `title`, `videoUrl`, `bpm`, `duration`. This keeps the public community post in sync with the private timeline after edits.

---

### `js/viewer.js`
Read-only lightshow player. Mirrors player.js sync logic but without editing.

**Global state:**
| Variable | Purpose |
|---|---|
| `viewerKeyframes[]` | Loaded keyframes |
| `viewerFades[]` | Fade animations (from Firestore `fades` field, legacy) |
| `viewerDuration` | Total length in seconds |
| `vpViewStart` / `vpViewWindow` | Timeline zoom |
| `viewerYTPlayer` | YouTube IFrame Player instance |
| `viewerPlaying` | Playback active |
| `viewerLastKfIdx` | Last synced keyframe index |
| `viewerLastFadeBright` | Last sent brightness during animation |

**Key globals:**
| Name | Purpose |
|---|---|
| `loadViewerShow(user, id)` | Load lightshow from `users/{uid}/timelines/{id}` |
| `loadCommunityViewerPost(postId)` | Load from `community/{postId}` |
| `vpTogglePlay()` | Play/pause |
| `vpStop()` | Stop and reset |
| `startViewerSync()` / `stopViewerSync()` | BLE sync loop |
| `viewerSyncTick()` | Apply current keyframe to lightstick |
| `renderViewerTrack()` | Draw read-only timeline |
| `viewerToggleLike()` | Like/unlike community post |
| `viewerToggleVisibility()` | Toggle public/private (owner only) |
| `onVpRulerMouseDown(e)` | Ruler: drag=pan, click=seek |
| `_initVpRulerTouch()` | Touch handler for ruler (init-once guard) |
| `openViewerLightshowsModal()` | Switch between user's lightshows |

**Firestore:**
- Reads: `users/{uid}/timelines/{id}`, `community/{postId}`
- Writes: `users/{uid}/communityLikes/{postId}` (like), `community/{postId}.likesCount`

---

### `js/ble.js`
Web Bluetooth layer for TAEMIN LIGHTSTICK.

**Protocol — Nordic UART Service:**
- Service: `6e400001-b5a3-f393-e0a9-e50e24dcca9e`
- RX (write): `6e400002-b5a3-f393-e0a9-e50e24dcca9e`
- TX (notify): `6e400003-b5a3-f393-e0a9-e50e24dcca9e`

**Packet format:** `FF [CMD] [LEN] [payload...] FF`

**Commands:**
| CMD | Purpose | Payload |
|---|---|---|
| `0x12` | Light off | — |
| `0x13` | Set brightness | `[level]` (0–10) |
| `0x14` | Auto mode | `[type, 0x0F]` |
| `0x15` | Set color/effect | `[effectId, 0x01]` |
| `0x16` | Query battery | — |
| `0x18` | Init | Special format |
| `0x21` | Device info (UID) | — |
| `0xAD` | Register device | `[0x02, ID_H, ID_L]` |
| `0xC6/C8/CA` | Query LED state | — |

**Global state:**
- `device`, `gatt`, `rxChar`, `txChar` — primary connection
- `deviceId` — `[ID_H, ID_L]` unique device pair
- `_extraDevices[]` — additional paired lightsticks
- `notifyQueue[]` / `notifyResolvers[]` — async RX packet queue

**Key globals:**
| Name | Purpose |
|---|---|
| `sendPacket(cmd, payload)` | Core send function (used everywhere) |
| `doConnect()` | Open device picker + connect |
| `doDisconnect()` | Disconnect all |
| `toggleConnect()` | Auto connect/disconnect |
| `doHandshake()` | Init sequence post-connect |
| `openManager()` / `closeManager()` | Pairing modal |
| `doPair()` | Add additional lightstick |
| `tryAutoReconnect(fallback)` | Auto-reconnect on page load |

---

### `js/app.js`
Live controller panel. Handles manual color, brightness, auto-modes, and beat scan.

**Global state:**
- `currentEffect` — active color index (0–27) — also used by player.js
- `currentBrightness` — brightness level (0–10)
- `scanRunning`, `scanIdx`, `scanTimer` — auto-scan state

**Key globals:**
| Name | Purpose |
|---|---|
| `setEffect(id)` | Select color → send `0x15` → update UI |
| `updateEffectHighlight(id)` | Visual highlight on color bar |
| `onBrightnessChange(val)` | Slider change → send `0x13` |
| `sendAutoMode(type)` | Send `0x14 [type, 0x0F]` |
| `sendLightOff()` | Send `0x12` |
| `buildColorSegments()` | Render color picker strip |
| `toggleScan()` | Cycle through all 28 colors automatically |

---

### `js/beat.js`
Microphone-based beat detection via Web Audio API.

**Algorithm:**
1. Capture mic → lowpass filter at 180Hz (isolates bass kicks)
2. FFT analysis every RAF frame
3. Spectral flux: compare energy to previous frame
4. Beat threshold: `avgFlux × 1.9` (adaptive)
5. 300ms debounce (`BD_MIN_GAP`) between beats

**Modes:**
- `flash` — max brightness flash on beat (`0x13 [10]`)
- `color` — random color change on beat (`0x15 [randomId, 0x01]`)

**Global state:** `_bdActive`, `_bdMode`, `_bdHistory[]`, `_bdFluxHistory[]`, `_bdAudioCtx`, `_bdAnalyser`

**Key globals:** `bdToggle()`, `bdSetMode(mode)`

---

### `js/community.js`
Community feed: browse, search, sort, like shared lightshows.

**Global state:** `_commPosts[]`, `_commLikes` (Set), `_commQuery`, `_commSort` (`'latest'` | `'likes'`)

**Key globals:**
| Name | Purpose |
|---|---|
| `loadCommunityFeed()` | Fetch from `community` collection |
| `commSearch(q)` | Filter by query |
| `commSetSort(by)` | Sort by `'latest'` or `'likes'` |
| `toggleCommLike(postId, btn)` | Optimistic like/unlike |
| `buildCommCard(post)` | Create card DOM element |

**Firestore:**
- Reads: `community` (all posts), `users/{uid}/communityLikes`
- Writes: `community/{postId}.likesCount`, `users/{uid}/communityLikes/{postId}`

---

### `js/my-lightshows.js`
My Lightshows grid. Reads from db.js, renders cards.

**Key globals:** `loadShows()`, `renderShows(list)`, `buildCard(tl)`, `deleteShow(id, el, communityPostId)`, `_mlsOnAuthReady(user)`

**Note:** `colorStrip()` was removed (unused). Card thumbnail is a YouTube thumbnail fetched by video ID.

---

### `js/index-preview.js`
Home page: renders 4 latest user lightshows + 4 community posts as preview cards.

**Key globals:** `_homeOnAuthReady(user)`, `loadHomeMyShows(user)`, `renderCommunityPreview()`

**Firestore:** Reads `users/{uid}/timelines` (limit 4), `community` (limit 4)

---

### `js/create-show-modal.js`
"New LightShow" modal. Creates blank Firestore doc, then navigates to studio.

**Flow:** form (name + optional YouTube URL) → `users/{uid}/timelines.add({...})` → `SPA.navigate('studio', {tl: id})`

---

### `js/profile.js`
User profile: display name, photo (URL or base64 resized to 256×256 JPEG), password change with reauthentication.

**Note:** Firebase Auth `updateProfile` only accepts HTTP URLs for `photoURL`. Base64 is stored separately in Firestore under `photoBase64`.

**Firestore:** writes `users/{uid}` (`username`, `photoURL`, `photoBase64`, `updatedAt`)

---

### `js/feedback.js`
Bug report / feedback form → Firestore.

**Firestore (writes):** `feedback/{id}` (`type`, `name`, `email`, `message`, `status: 'open'`, `createdAt`, `userUid`)

---

### `js/admin.js`
Admin-only feedback inbox with realtime listener. Only visible to `diogovazz@protonmail.com`.

**Global state:** `_adminTickets[]`, `_adminFilter`, `_adminSelected`, `_adminUnsub`

**Key globals:** `initAdmin(user)`, `destroyAdmin()`, `isAdmin(user)`, `adminResolve(id)`, `adminDelete(id)`

**Firestore:** reads/writes `feedback` collection (status, order by `createdAt`)

---

### `js/tickets.js`
Public ticket view: users see their own submissions and their status.

**Global state:** `_ticketsData[]`, `_ticketsFilter`, `_ticketsExpanded` (Set), `_ticketsUnsub`

**Firestore:** reads `feedback` (all open), deletes own ticket only if `userUid === currentUser.uid`

---

### `js/i18n.js`
Internationalization. Three languages: `en`, `pt`, `ko`.

**Globals:** `I18N` (full object), `t(key)` (translate), `setLang(code)`, `applyTranslations()`

**DOM usage:** `<element data-i18n="key">`, `<input data-i18n-ph="key">`

**Key i18n keys:**
- `card_segments` — label after keyframe count (used in all card types)
- `viewer_meta_cues` — viewer metadata header ("SEGMENTS")
- `comm_*` — community strings
- `player_*` — studio strings
- `vis_*` — visibility toggle tooltips

**Storage:** `localStorage['lsw-lang']`

---

### `js/themes.js`
Theme switcher (2 themes).

**Themes:**
- `wave` (default): SHINee palette, cyan accent + gold secondary
- `solar`: Taemin palette, gold accent + cyan secondary

**Globals:** `THEMES`, `currentTheme`, `applyTheme(key)`, `toggleThemePanel()`

**Storage:** `localStorage['lightstick-theme']`

---

### `js/timeline.js`
Legacy simple sequencer. Predates player.js. Still wired to controller view as a fallback. Owns `keyframes[]`, `tlPlaying`, `tlTimer`.

---

### `css/style.css`
~3300 lines. Token-based with CSS custom properties.

**Root tokens:**
```
--bg, --card, --card-solid, --surface
--border, --border-hi
--accent, --accent2, --accent3, --accent-hi, --accent-fg
--text, --muted
--success, --danger, --warn
--sp-{1..16}  (spacing scale)
--r-{sm,md,lg,xl}  (border radius)
--shadow-{card,lift,modal}
--dur-fast, --dur-base, --ease-out
```

**Major sections:**
1. Reset + base
2. Sidebar (`.sidebar`, `.sb-nav`, `.sb-footer`)
3. Buttons (`.btn`, `.btn-primary`, `.btn-ghost`, `.btn-danger`)
4. Cards (`.card`, `.ls-card`, `.comm-card`)
5. Modals (`.modal-overlay`, `.modal-box`)
6. Studio timeline (`.player-*`, `.player-band`, `.player-ruler`, `.player-track`)
7. Viewer (`.viewer-*`, `.vp-*`)
8. Controller (`.ctrl-*`, `.ctrl-orb`, `.ctrl-brightness-bar`, `.bd-*`)
9. Community (`.comm-*`, `.comm-card`, `.comm-like-btn`)
10. Feedback modal (`.feedback-modal-*`)
11. Admin + tickets (`.admin-*`, `.ticket-*`)
12. Animations (`@keyframes kfFlicker`, `kfWave`, `orb-flash`, etc.)

**Mobile breakpoints:**
- `≤768px` — sidebar collapses to icons
- `≤600px` — studio toolbars switch to `.mobile-add-bar` + `#mobileKfBar`, track height 65px
- Desktop studio track height: 56px

---

## Firestore Data Model

### `users/{uid}`
```js
{ uid, username, email, photoURL, photoBase64, createdAt, updatedAt }
```

### `users/{uid}/timelines/{docId}`
```js
{
  title, videoUrl,
  keyframes: [{ t, effectId, duration, brightness?, animation? }],
  bpm, beatOffset, duration,
  isPublic, communityPostId?,
  createdAt, updatedAt
}
```

### `users/{uid}/communityLikes/{postId}`
```js
{ likedAt }
```

### `community/{postId}`
```js
{
  uid, authorName, title, videoUrl,
  keyframes: [...], duration, bpm,
  publishedAt, updatedAt, likesCount,
  tlId  // reference to source timeline
}
```

### `feedback/{id}`
```js
{ type, name, email, message, status, createdAt, userUid }
```

---

## Key Flows

### Sign In → Load Shows
1. `setupAuth()` → `firebase.auth().onAuthStateChanged()`
2. `ensureUserDoc(user)` → create/update `users/{uid}`
3. `onAuthReady(user)` → router dispatches to view auth hook
4. If view = `lightshows` → `loadShows()` → render grid

### Create + Edit Lightshow
1. "New" → `openCreateShowModal()` → create `users/{uid}/timelines` doc
2. Router navigates to studio with `?tl={id}`
3. `loadTimelineById(id)` → `applyTimeline(tl)` → loads into `playerKeyframes`
4. User marks keyframes: `addKeyframeAtCurrentTime()` → push + sort `playerKeyframes`
5. Save: `saveCurrentTimeline(title)` → update Firestore + sync community post if public

### Play Lightshow with Lightstick
1. `loadViewerShow(user, id)` → fetch Firestore doc → set `viewerKeyframes`
2. `vpTogglePlay()` → start YouTube + `startViewerSync()`
3. Every 100ms: `viewerSyncTick()` → find active keyframe by time → `sendPacket(0x15, [effectId, 0x01])`
4. Fade/flicker/wave: send brightness adjustments each tick

### Publish to Community
1. `studioToggleVisibility()` → `setShowVisibility(tlId, true)`
2. Copy current keyframes → create `community/{postId}`
3. Store `postId` in `window._activeCommunityPostId` + in `users/{uid}/timelines/{id}.communityPostId`
4. Future saves: `saveCurrentTimeline()` automatically updates `community/{postId}`

### Beat Detection → Lightstick Flash
1. `bdToggle()` → `getUserMedia({audio: true})` → Web Audio graph
2. RAF loop: FFT → spectral flux → beat threshold
3. Beat detected → `_bdOnBeat()` → `sendPacket(0x13, [10])` or `sendPacket(0x15, [randomId, 0x01])`

---

## Global Naming Rules (enforced — do not break)

| Thing | Canonical location | Rule |
|---|---|---|
| `extractVideoId(url)` | `app-router.js` | Do not re-implement in other files |
| `escapeHtml(s)` | `app-router.js` | Do not re-implement as `_esc`, `_escHtml`, etc. |
| `formatTime(s, decimal)` | `player.js` | Default `decimal=false` ("M:SS"). Pass `true` only for studio time display ("M:SS.S") |
| `EFFECTS[]` | `effects.js` | Read-only. Indexed by effectId 0x00–0x1B |
| `sendPacket(cmd, payload)` | `ble.js` | Only way to send BLE commands |
| `currentUser` | `auth.js` | Check before any Firestore write |
| `playerKeyframes[]` | `player.js` | Source of truth for studio. `db.js` reads it for save |
| `card_segments` | `i18n.js` | Use for keyframe count label. Never use "cues" in UI |
