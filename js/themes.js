// ============================================================
// Theme system - 2 themes
// ============================================================
const THEMES = {
  wave: {
    name: 'SHINee',
    desc: '#01FFFF - Pearl Aqua',
    accent: '#01ffff', accent2: '#ffd60a',
    vars: {
      '--bg': '#000814', '--card': '#001229', '--border': 'rgba(255,255,255,0.07)',
      '--accent': '#01ffff', '--accent2': '#ffd60a', '--accent-hi': '#80ffff',
      '--accent-fg': '#000814',
      '--text': '#e2f0ff', '--muted': '#4a7a99',
    }
  },
  solar: {
    name: 'Taemin',
    desc: '#FFD60A - Gold',
    accent: '#ffd60a', accent2: '#01ffff',
    vars: {
      '--bg': '#000814', '--card': '#0d1000', '--border': 'rgba(255,255,255,0.07)',
      '--accent': '#ffd60a', '--accent2': '#01ffff', '--accent-hi': '#ffd60a',
      '--accent-fg': '#000814',
      '--text': '#f5f0df', '--muted': '#6b6040',
    }
  },
  liminal: {
    name: 'LiMiNaL',
    desc: '#FF3541 - World Tour',
    accent: '#ff3541', accent2: '#f5ece6',
    vars: {
      '--bg': '#0a0405', '--card': '#170a0c', '--border': 'rgba(255,255,255,0.08)',
      '--accent': '#ff3541', '--accent2': '#f5ece6', '--accent-hi': '#ff8f96',
      '--accent-fg': '#16060a',
      '--text': '#f6e9e8', '--muted': '#9c7d80',
    }
  },
};

let currentTheme = localStorage.getItem('lightstick-theme') || 'wave';

// Migrate old theme keys
if (!THEMES[currentTheme]) currentTheme = 'wave';

function applyTheme(key) {
  currentTheme = key;
  const theme = THEMES[key];
  if (!theme) return;
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  localStorage.setItem('lightstick-theme', key);
  renderThemePanel();
}

function renderThemePanel() {
  const panel = document.getElementById('themePanel');
  if (!panel) return;
  panel.innerHTML = Object.entries(THEMES).map(([key, t]) => `
    <div class="theme-option ${key === currentTheme ? 'active' : ''}" onclick="applyTheme('${key}');document.getElementById('themePanel').classList.add('hidden')">
      <div class="theme-swatch" style="background:${t.accent}"></div>
      <div>
        <div style="font-weight:600">${t.name}</div>
        <div style="font-size:0.72rem;color:var(--muted)">${t.desc}</div>
      </div>
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
