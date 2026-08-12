# LightStickWaves — Developer Context & Decisions Log

> Usar este ficheiro como contexto em chats futuros com Claude.
> Cobre decisões de design, alterações técnicas e o raciocínio por trás de cada escolha.

---

## 📌 Visão Geral do Projeto

**URL:** https://lightstickwaves.com  
**Repositório:** https://github.com/DiogoVaz1/Taemin-LightStick-WebSite  
**Deploy:** Vercel (auto-deploy a partir do branch `main`)  
**Stack:** HTML/CSS/JS vanilla (SPA sem framework), Firebase (Auth + Firestore), Web Bluetooth API

### O que é o site
Aplicação web que permite controlar o lightstick do Taemin via Web Bluetooth diretamente no browser, sem app. Funcionalidades:
- **Controller** — controlo de cores, efeitos, brilho em tempo real
- **LightShow Studio** — criar lightshows sincronizados com vídeos YouTube
- **My Lightshows** — guardar e gerir lightshows por conta
- **Community** — partilhar e ver lightshows de outros fãs

### Compatibilidade de browsers
| Browser | Suporte |
|---|---|
| Chrome / Edge (desktop) | ✅ Completo |
| Chrome (Android) | ⚠️ Funciona, pairing pode variar |
| iOS — Bluefy (App Store) | ⚠️ Funciona via app Bluefy gratuita |
| Firefox / Safari | ❌ Web Bluetooth não suportado |

---

## 🏗️ Arquitetura do Código

```
app.html          — SPA principal, todas as views em divs (#view-home, #view-controller, etc.)
css/style.css     — Estilos globais + glassmorphism + responsive
js/
  i18n.js         — Sistema de internacionalização (EN/PT/KO)
  beat.js         — Beat detection via microfone (Web Audio API)
  ble.js          — Comunicação Bluetooth Low Energy
  app.js          — Lógica do controller (cores, efeitos, brilho)
  db.js           — CRUD Firestore (lightshows)
  player.js       — LightShow Studio (editor de timeline)
  app-router.js   — Router SPA
```

### Sistema i18n
- Atributos HTML: `data-i18n` (texto), `data-i18n-html` (HTML com tags), `data-i18n-ph` (placeholder)
- Função `t(key)` retorna tradução; fallback para EN se chave não existir
- `setLang(lang)` muda idioma sem reload — atualiza DOM in-place
- Idioma guardado em `localStorage('lsw-lang')`
- 3 línguas: `en`, `pt`, `ko`

### Z-index stacking
```
#bgTint (position:fixed, z-index:0)    — radial gradient estático de fundo
#mainWrapper (z-index:1)               — conteúdo principal
.sidebar (z-index:300)                 — sidebar
modals (z-index:1000)                  — modais
```

> ⚠️ **Histórico:** existiu um `#bgCanvas` com 3 blobs animados (`.bg-orb`). Foram
> removidos — o fundo agora é apenas `#bgTint` (gradiente radial estático).

---

## 🎨 Design — Sistema atual (tokens)

> ⚠️ **Nota histórica:** este projeto começou com um tema glassmorphism roxo/índigo
> (Inter + blobs animados + cards semi-transparentes). Esse design foi **substituído**.
> O design atual é o descrito abaixo (fonte da verdade: `CLAUDE.md` + `css/style.css`).

**Filosofia atual:** tema escuro navy, superfícies sólidas, temas trocáveis (`wave`/`solar`).
Sem glassmorphism em cards, sem blobs animados, sem gradient text, sem glow em botões.

### Variáveis CSS principais (`:root` em `css/style.css`)
```css
--bg:      #000814   /* navy escuro */
--card:    #001229   /* superfície sólida (não semi-transparente) */
--surface: #001229
--border:    rgba(255,255,255,0.07)
--border-hi: rgba(255,255,255,0.15)
--accent:  #01ffff   /* cyan — tema default (wave) */
--accent2: #ffd60a   /* gold — secundário */
--text:  #e2f0ff
--muted: #4a7a99
```
> Ao mudar cores, atualizar **sempre** `:root` em `style.css` E `js/themes.js`.

### Temas (`js/themes.js`)
- `wave` (default): paleta SHINee — cyan + gold
- `solar`: paleta Taemin — gold + cyan

### Blur (backdrop-filter)
Reservado a **modais/overlays** apenas — não em cards. (`--glass-blur` mantém-se como
token legacy no `:root`.)

### Tipografia
**Space Grotesk** (Google Fonts) — weights 400, 500, 600, 700

---

## 📱 Layout Desktop da Homepage

**Problema:** Container demasiado estreito (600px) — não aproveitava o espaço em PC.

**Solução implementada** (`@media (min-width: 1000px)`):
- Container alargado para `max-width: 1240px`
- 4 botões CTA do hero em linha horizontal usando `display: contents` nos `.hero-cta-row` (colapsa os wrappers, tornando os 4 botões filhos diretos do flex container)
- Preview sections (My Lightshows + Community) limitadas a `max-width: 760px; align-self: flex-start` (encostadas à esquerda, não demasiado largas)
- Feature grid (4 cards) usa a largura toda
- Mobile inalterado — todos os overrides dentro do media query

**HTML adicionado:**
```html
<div class="hero-text">  <!-- wrapper para separar título/subtítulo dos CTAs -->
  <h1 class="hero-title">...</h1>
  <p class="hero-subtitle">...</p>
</div>
```

---

## 🎤 Beat Detection

**Ficheiro:** `js/beat.js`  
**Tecnologia:** Web Audio API — `AnalyserNode`, `BiquadFilter` lowpass 180Hz

### Como funciona
1. Pede acesso ao microfone
2. Passa o sinal por um filtro lowpass (captura só bass, <180Hz)
3. A cada frame (`requestAnimationFrame`), calcula a energia do bass
4. Mantém histórico de 60 amostras para calcular média adaptativa
5. Deteta beat quando `energia > média × sensibilidade` e passou tempo mínimo desde o último beat

### Parâmetros atuais (`js/beat.js`)
```javascript
const _bdSensitivity = 1.9;   // limiar: beat quando flux > avgFlux × 1.9
const BD_MIN_GAP = 300;       // ms mínimos entre beats (~200 BPM máx)
```

**Histórico de calibração:**
- `1.5` → original, pouco sensível
- `1.15` / `1.22` → demasiado sensível, disparava com ruído
- `1.9` → **valor atual**, threshold adaptativo estável

### 2 modos
- **Flash** — envia brilho máximo (CMD 0x13, valor 10) → restaura brilho anterior após 120ms
- **Colors** — escolhe efeito aleatório evitando repetir o anterior (CMD 0x15)

### Canvas Spectrum Visualizer
Adicionado em `bdActiveSection` — canvas com 48 barras:
- Gradiente HSL: roxo (260°) → verde-amarelo (80°) da esquerda para a direita
- Usa os primeiros 45% dos bins de frequência (bass + low-mid)
- Sincroniza resolução do canvas com CSS (`getBoundingClientRect()`)
- Barras arredondadas em cima com `roundRect()`
- Mais brilhante quando a barra é mais alta (`lit = 55 + (val/255) * 15`)

### Card flash no beat
```javascript
// Em _bdOnBeat():
card.classList.remove('bd-card-beat');
void card.offsetWidth; // reflow para reiniciar animação
card.classList.add('bd-card-beat');
```
```css
@keyframes bdCardFlash {
  25% { box-shadow: 0 0 0 2px rgba(139,92,246,0.6), 0 0 30px rgba(139,92,246,0.5); }
}
```

---

## 🔵 BLE — Bluetooth

**Ficheiro:** `js/ble.js`

### Protocolo (TAEMIN LIGHTSTICK)
- CMD 0x13: brilho direto (valor 0-10)
- CMD 0x14: parâmetro de animação
- CMD 0x15: modo + submodo (cores/efeitos)
- CMD C6/C8/CA: estado dos LEDs

### Decisão: Remover banner de reconnect
O banner de reconexão automática foi **completamente removido** do código (não apenas desativado). Funções eliminadas: `_showReconnectBanner()`, `_hideBanner()`. A reconexão automática acontece silenciosamente em background.

---

## 🌍 Internacionalização (i18n)

### Páginas traduzidas (EN + PT + KO)
- ✅ Nav, sidebar, botões comuns
- ✅ Homepage (hero, preview, feature cards)
- ✅ Controller (todos os controlos, beat detection)
- ✅ My Lightshows, Community, Viewer, Studio
- ✅ Sign In / Auth, Profile
- ✅ **About page** (adicionado nesta sessão)
- ✅ **Help & FAQ page** (adicionado nesta sessão)
- ❌ Terms of Service (ainda em EN apenas)

### Como adicionar novas traduções
1. Adicionar chave no objeto `en` do `I18N` em `i18n.js`
2. Adicionar a mesma chave em `pt` e `ko`
3. No HTML: `data-i18n="chave"` (texto simples) ou `data-i18n-html="chave"` (com HTML tags)
4. Para strings em JS: usar `t('chave')` com fallback `'texto EN'`

---

## 📊 Analytics

**Vercel Analytics** já configurado — script em `app.html`:
```html
<script defer src="/_vercel/insights/script.js"></script>
```
Requer ativação no dashboard Vercel → Analytics → Enable.

---

## 🚀 Deploy & Git

**Workflow:**
1. Editar ficheiros localmente
2. User testa sempre antes de commit
3. `git add [ficheiros específicos]` — nunca `git add .`
4. `git commit -m "mensagem descritiva"`
5. `git push` → Vercel faz deploy automático

**REGRA IMPORTANTE:** Nunca fazer commit/push sem o user pedir explicitamente.

---

## 📣 Marketing / Reddit

**Subreddits target:**
- r/taemin — melhor audiência (fãs diretos com lightstick)
- r/kpoppers — permite self-promo 1x/semana (regra 3)
- r/kpop — **NÃO** — proibe fan-made content / self-promo

**Timing ideal:** Sábado, 14h-16h hora de Portugal (9h-12h EST)

**Draft do post (EN):**
```
Title: I built a web app to control Taemin lightsticks from the browser — no app needed!

Body:
Hey everyone! 👋

I'm a Taemin fan and developer, and I built LightStickWaves — a free web app that lets 
you control your Taemin lightstick directly from the browser via Web Bluetooth, no app 
download required.

What it can do:
🎨 Change colors and effects in real time
🎬 Create synced lightshows with YouTube videos
🎤 Beat detection — the lightstick flashes automatically to the music
💾 Save and share your lightshows with the community

It works on Chrome/Edge on desktop, Chrome on Android, and iOS via the Bluefy browser 
(free on the App Store).

🔗 lightstickwaves.com

Would love feedback from the community!
```

---

## 🗂️ Estado atual do projeto (Junho 2026)

| Feature | Estado |
|---|---|
| BLE Controller | ✅ Completo |
| LightShow Studio | ✅ Completo |
| My Lightshows | ✅ Completo |
| Community Feed | ✅ Completo |
| Beat Detection + Visualizer | ✅ Completo |
| Auth (email/password) | ✅ Completo |
| Design system (tokens, temas wave/solar) | ✅ Completo |
| i18n EN/PT/KO | ✅ Completo (exceto Terms) |
| Vercel Analytics | ✅ Ativo |
| SHINee lightstick support | ❌ Não implementado |
| Terms page i18n | ❌ Pendente |
