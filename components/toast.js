/**
 * components/toast.js — Toast notification utility
 *
 * Usage:
 *   Toast.show('Message')
 *   Toast.show('Message', 'success' | 'error' | 'warn')
 */

const Toast = (() => {
  const container = document.getElementById('toast-container');

  function show(message, type = '', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast' + (type ? ` toast-${type}` : '');
    toast.textContent = message;
    toast.setAttribute('role', 'status');

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-out');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
      // Fallback removal
      setTimeout(() => { if (toast.parentNode) toast.remove(); }, 400);
    }, duration);
  }

  return { show };
})();
