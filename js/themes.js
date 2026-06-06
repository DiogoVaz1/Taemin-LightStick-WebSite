// ============================================================
// Theme system
// ============================================================
const THEMES = {
  default: {
    name: 'Default',
    desc: 'Roxo & Rosa',
    accent: '#8b5cf6', accent2: '#ec4899',
    vars: {
      '--bg': '#12101e', '--card': '#1c1a2e', '--border': '#2e2a45',
      '--accent': '#8b5cf6', '--accent2': '#ec4899',
      '--text': '#e2e8f0', '--muted': '#7068a0',
    }
  },
  shinee: {
    name: 'SHINee',
    desc: 'Pearl Aqua',
    accent: '#4ecdc4', accent2: '#26c6bc',
    vars: {
      '--bg': '#0d1f1e', '--card': '#152a28', '--border': '#1e3e3a',
      '--accent': '#4ecdc4', '--accent2': '#26c6bc',
      '--text': '#e0f2f0', '--muted': '#5a9e98',
    }
  },
  taemin: {
    name: 'Taemin',
    desc: 'MOVE · Roxo & Ouro',
    accent: '#9d4edd', accent2: '#d4af37',
    vars: {
      '--bg': '#170e22', '--card': '#211430', '--border': '#341e50',
      '--accent': '#9d4edd', '--accent2': '#d4af37',
      '--text': '#ede8f5', '--muted': '#806898',
    }
  },
  mix: {
    name: 'SHINee × Taemin',
    desc: 'Pearl Aqua & Roxo',
    accent: '#4ecdc4', accent2: '#9d4edd',
    vars: {
      '--bg': '#0f1428', '--card': '#171e38', '--border': '#242e52',
      '--accent': '#4ecdc4', '--accent2': '#9d4edd',
      '--text': '#e4e8f5', '--muted': '#6878a8',
    }
  },
};

let currentTheme = localStorage.getItem('lightstick-theme') || 'default';

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
      <div class="theme-swatch" style="background:linear-gradient(135deg,${t.accent},${t.accent2})"></div>
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
