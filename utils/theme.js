/**
 * utils/theme.js — Theme management (Light / Dark / System)
 * Persists preference in localStorage and applies it to <html data-theme>.
 */

const Theme = (() => {
  const STORAGE_KEY = 'listr-theme';
  const VALID = ['light', 'dark', 'system'];

  function get() {
    return localStorage.getItem(STORAGE_KEY) || 'system';
  }

  function apply(theme) {
    const root = document.documentElement;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }

  function set(theme) {
    if (!VALID.includes(theme)) return;
    localStorage.setItem(STORAGE_KEY, theme);
    apply(theme);
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  }

  function init() {
    apply(get());
    // React to OS-level changes when preference is "system"
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (get() === 'system') apply('system');
    });
  }

  return { get, set, init };
})();
