import { lsGet, lsSet } from './utils.js';

const MODES = ['system', 'light', 'dark'];

let systemMql = null;
let systemListenerAttached = false;

export function initThemeToggle() {
  const btn = document.getElementById('themeToggle');
  const saved = lsGet('themeMode', window.AYED_CONFIG?.ui?.defaultTheme || 'system');
  applyThemeMode(saved);

  if (!btn) return;
  btn.addEventListener('click', () => {
    const current = lsGet('themeMode', 'system');
    const idx = MODES.indexOf(current);
    const next = MODES[(idx + 1) % MODES.length];
    applyThemeMode(next);
    lsSet('themeMode', next);
  });
}

export function applyThemeMode(mode) {
  const icon = document.getElementById('themeIcon');

  // Prepare mql for system mode
  if (!systemMql && window.matchMedia) {
    systemMql = window.matchMedia('(prefers-color-scheme: dark)');
  }

  const applyResolved = (resolved) => {
    document.documentElement.setAttribute('data-bs-theme', resolved === 'dark' ? 'dark' : 'light');
  };

  if (mode === 'system') {
    const resolved = systemMql?.matches ? 'dark' : 'light';
    applyResolved(resolved);
    if (icon) icon.textContent = '🖥️';

    // Listen for changes while in system mode
    if (systemMql && !systemListenerAttached) {
      systemMql.addEventListener('change', () => {
        const current = lsGet('themeMode', 'system');
        if (current !== 'system') return;
        applyResolved(systemMql.matches ? 'dark' : 'light');
      });
      systemListenerAttached = true;
    }
    return;
  }

  applyResolved(mode === 'dark' ? 'dark' : 'light');
  if (icon) icon.textContent = (mode === 'dark' ? '🌙' : '☀️');
}
