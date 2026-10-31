// ============================================================
// Theme system
// ============================================================
// Per-theme overlay colour: white on dark themes, black on the white theme.
// CSS uses rgba(var(--ink), a) for hover/border/fill overlays, so every theme must set it.
const DARK_BASE = {
  '--ink': '255,255,255',
  '--kofi': '#ff5e5b',
  '--shadow-card': '0 1px 12px rgba(0,0,0,0.6)',
  '--shadow-lift': '0 4px 28px rgba(0,0,0,0.7)',
  '--shadow-modal': '0 24px 80px rgba(0,0,0,0.8)',
};

const THEMES = {
  black: {
    name: 'Black',
    accent: '#01ffff', accent2: '#ffd60a',
    vars: {
      ...DARK_BASE,
      '--bg': '#000000', '--card': '#0b0b0d', '--border': 'rgba(255,255,255,0.1)',
      '--accent': '#01ffff', '--accent2': '#ffd60a', '--accent-hi': '#80ffff',
      '--accent-fg': '#000000',
      '--text': '#f2f2f2', '--muted': '#8a8f98',
      '--tint-a': 'transparent', '--tint-b': 'transparent',
    }
  },
  white: {
    name: 'White',
    accent: '#00707a', accent2: '#8a6500',
    vars: {
      '--bg': '#ffffff', '--card': '#f4f4f5', '--border': 'rgba(0,0,0,0.12)',
      '--accent': '#00707a', '--accent2': '#8a6500', '--accent-hi': '#00616a',
      '--accent-fg': '#ffffff',
      '--text': '#0a0a0a', '--muted': '#5a5f69',
      '--tint-a': 'transparent', '--tint-b': 'transparent',
      '--ink': '0,0,0',
      '--kofi': '#c62d2a',
      '--shadow-card': '0 1px 6px rgba(0,0,0,0.08)',
      '--shadow-lift': '0 4px 20px rgba(0,0,0,0.14)',
      '--shadow-modal': '0 24px 80px rgba(0,0,0,0.25)',
    }
  },
  wave: {
    name: 'SHINee',
    accent: '#01ffff', accent2: '#ffd60a',
    vars: {
      ...DARK_BASE,
      '--bg': '#000814', '--card': '#001229', '--border': 'rgba(255,255,255,0.07)',
      '--accent': '#01ffff', '--accent2': '#ffd60a', '--accent-hi': '#80ffff',
      '--accent-fg': '#000814',
      '--text': '#e2f0ff', '--muted': '#4a7a99',
      '--tint-a': 'rgba(0,53,102,0.55)', '--tint-b': 'rgba(1,255,255,0.04)',
    }
  },
  solar: {
    name: 'Taemin',
    accent: '#ffd60a', accent2: '#01ffff',
    vars: {
      ...DARK_BASE,
      '--bg': '#000814', '--card': '#0d1000', '--border': 'rgba(255,255,255,0.07)',
      '--accent': '#ffd60a', '--accent2': '#01ffff', '--accent-hi': '#ffd60a',
      '--accent-fg': '#000814',
      '--text': '#f5f0df', '--muted': '#6b6040',
      '--tint-a': 'rgba(90,70,0,0.4)', '--tint-b': 'rgba(255,214,10,0.04)',
    }
  },
  liminal: {
    name: 'LiMiNaL',
    accent: '#ff3541', accent2: '#f5ece6',
    vars: {
      ...DARK_BASE,
      '--bg': '#0a0405', '--card': '#170a0c', '--border': 'rgba(255,255,255,0.08)',
      '--accent': '#ff3541', '--accent2': '#f5ece6', '--accent-hi': '#ff8f96',
      '--accent-fg': '#16060a',
      '--text': '#f6e9e8', '--muted': '#9c7d80',
      '--tint-a': 'rgba(110,14,26,0.5)', '--tint-b': 'rgba(255,53,65,0.04)',
    }
  },
};

let currentTheme = localStorage.getItem('lightstick-theme') || 'black';

// Migrate old theme keys
if (!THEMES[currentTheme]) currentTheme = 'black';

function applyTheme(key) {
  currentTheme = key;
  const theme = THEMES[key];
  if (!theme) return;
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  // Components that use --surface / --card-solid follow the theme's card colour
  root.style.setProperty('--surface', theme.vars['--card']);
  root.style.setProperty('--card-solid', theme.vars['--card']);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme.vars['--bg']);
  localStorage.setItem('lightstick-theme', key);
  renderThemePanel();
}

function renderThemePanel() {
  const panel = document.getElementById('themePanel');
  if (!panel) return;
  panel.innerHTML = Object.entries(THEMES).map(([key, t]) => `
    <div class="theme-option ${key === currentTheme ? 'active' : ''}" onclick="applyTheme('${key}');document.getElementById('themePanel').classList.add('hidden')">
      <div class="theme-swatch" style="background:${t.vars['--bg']}"><i style="background:${t.vars['--accent']}"></i></div>
      <div style="font-weight:600">${t.name}</div>
      ${key === currentTheme ? '<span style="margin-left:auto;color:var(--accent)">✓</span>' : ''}
    </div>
  `).join('');
}

function toggleThemePanel() {
  const panel = document.getElementById('themePanel');
  panel.classList.toggle('hidden');
}

document.addEventListener('click', e => {
  const panel = document.getElementById('themePanel');
  if (panel && !panel.classList.contains('hidden') &&
      !panel.contains(e.target) &&
      !e.target.closest('.theme-toggle-btn')) {
    panel.classList.add('hidden');
  }
});

// Apply saved theme on load
applyTheme(currentTheme);
