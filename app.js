/**
 * app.js — ListR app bootstrap & router
 */

(async function () {
  'use strict';

  // ── Service Worker registration ───────────────────────────

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch((err) => {
      console.warn('SW registration failed:', err);
    });
  }

  // ── Theme ─────────────────────────────────────────────────

  Theme.init();

  // ── DB init ───────────────────────────────────────────────

  await DB.open();

  // ── Init all tab components ───────────────────────────────

  await Promise.all([
    Shopping.init(),
    Frequent.init(),
    History.init(),
  ]);
  Settings.init();

  // ── Navigation ────────────────────────────────────────────

  const navBtns   = document.querySelectorAll('.nav-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');
  let   activeTab = 'shopping';

  function activateTab(tabName) {
    if (tabName === activeTab && document.getElementById(`tab-${tabName}`)?.classList.contains('active')) {
      return;
    }
    activeTab = tabName;

    navBtns.forEach((btn) => {
      const isActive = btn.dataset.tab === tabName;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
    });

    tabPanels.forEach((panel) => {
      panel.classList.toggle('active', panel.id === `tab-${tabName}`);
    });

    // Hide search bar when switching tabs (only relevant on shopping)
    const searchBar = document.getElementById('search-bar');
    if (tabName !== 'shopping' && !searchBar.classList.contains('hidden')) {
      searchBar.classList.add('hidden');
      document.getElementById('search-input').value = '';
      Shopping.setSearch('');
    }
  }

  navBtns.forEach((btn) => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
  });

  // Allow components to trigger navigation
  document.addEventListener('navigate', (e) => {
    const { tab } = e.detail;
    activateTab(tab);
    // Reload shopping tab after duplicate-to-new
    if (tab === 'shopping') Shopping.init();
  });

  // Reload all tabs after CSV import
  document.addEventListener('dataimported', async () => {
    await Promise.all([Shopping.init(), Frequent.init(), History.init()]);
    Toast.show('Data imported successfully!', 'success');
  });

  // ── Search ────────────────────────────────────────────────

  const searchToggle = document.getElementById('search-toggle-btn');
  const searchBar    = document.getElementById('search-bar');
  const searchInput  = document.getElementById('search-input');
  const searchClose  = document.getElementById('search-close-btn');

  searchToggle.addEventListener('click', () => {
    if (activeTab !== 'shopping') {
      activateTab('shopping');
    }
    searchBar.classList.remove('hidden');
    requestAnimationFrame(() => searchInput.focus());
  });

  searchClose.addEventListener('click', () => {
    searchBar.classList.add('hidden');
    searchInput.value = '';
    Shopping.setSearch('');
  });

  searchInput.addEventListener('input', () => {
    Shopping.setSearch(searchInput.value);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchBar.classList.add('hidden');
      searchInput.value = '';
      Shopping.setSearch('');
    }
  });

  // ── Online / Offline status pill ──────────────────────────

  const pill = document.getElementById('status-pill');
  let onlineTimer = null;

  function showPill(type) {
    clearTimeout(onlineTimer);
    pill.className = type;
    pill.textContent = type === 'online' ? '✅ Online' : '📴 Offline';
    pill.classList.remove('hidden');

    if (type === 'online') {
      onlineTimer = setTimeout(() => pill.classList.add('hidden'), 3000);
    }
  }

  window.addEventListener('online',  () => showPill('online'));
  window.addEventListener('offline', () => showPill('offline'));

  // Initialise pill state
  if (!navigator.onLine) showPill('offline');

  // ── Install prompt ────────────────────────────────────────

  const DISMISS_KEY   = 'listr-install-dismissed';
  const DISMISS_DAYS  = 7;

  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    _maybeShowInstallBanner();
  });

  function _maybeShowInstallBanner() {
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      const daysSince   = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
      if (daysSince < DISMISS_DAYS) return;
    }
    document.getElementById('install-banner').classList.remove('hidden');
  }

  document.getElementById('install-btn').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    document.getElementById('install-banner').classList.add('hidden');
    if (outcome === 'accepted') Toast.show('ListR installed!', 'success');
  });

  document.getElementById('install-dismiss-btn').addEventListener('click', () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    document.getElementById('install-banner').classList.add('hidden');
  });

  // iOS install instruction
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isInStandaloneMode = window.navigator.standalone === true;
  const IOS_DISMISS_KEY = 'listr-ios-install-dismissed';

  if (isIos && !isInStandaloneMode) {
    const dismissed = localStorage.getItem(IOS_DISMISS_KEY);
    const daysSince = dismissed ? (Date.now() - parseInt(dismissed, 10)) / (1000 * 60 * 60 * 24) : DISMISS_DAYS + 1;
    if (daysSince >= DISMISS_DAYS) {
      setTimeout(() => {
        document.getElementById('ios-install-banner').classList.remove('hidden');
      }, 2000);
    }
  }

  document.getElementById('ios-install-dismiss-btn').addEventListener('click', () => {
    localStorage.setItem(IOS_DISMISS_KEY, String(Date.now()));
    document.getElementById('ios-install-banner').classList.add('hidden');
  });

})();
