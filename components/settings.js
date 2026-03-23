/**
 * components/settings.js — Settings tab
 */

const Settings = (() => {
  const APP_VERSION = '1.0.1';

  const container = () => document.getElementById('settings-content');

  // ── Public API ────────────────────────────────────────────

  function init() {
    _render();
    document.addEventListener('themechange', () => _updateThemeButtons());
  }

  // ── Rendering ─────────────────────────────────────────────

  function _render() {
    container().innerHTML = `

      <!-- Theme -->
      <div class="settings-section">
        <div class="settings-section-title">Appearance</div>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Theme</div>
            <div class="settings-row-sub">Choose your preferred color scheme</div>
          </div>
          <div class="theme-toggle" role="group" aria-label="Theme selection">
            <button class="theme-option" data-theme-val="light" aria-label="Light theme">Light</button>
            <button class="theme-option" data-theme-val="dark" aria-label="Dark theme">Dark</button>
            <button class="theme-option" data-theme-val="system" aria-label="System theme">System</button>
          </div>
        </div>
      </div>

      <!-- Data -->
      <div class="settings-section">
        <div class="settings-section-title">Data</div>

        <div class="settings-row">
          <div>
            <div class="settings-row-label">Export All Data</div>
            <div class="settings-row-sub">Download a CSV backup of all lists</div>
          </div>
          <button class="btn btn-secondary btn-sm" id="export-btn">Export CSV</button>
        </div>

        <div class="settings-row">
          <div>
            <div class="settings-row-label">Import from CSV</div>
            <div class="settings-row-sub">Restore or merge data from a backup</div>
          </div>
          <button class="btn btn-secondary btn-sm" id="import-btn">Import CSV</button>
          <input type="file" id="csv-file-input" accept=".csv,text/csv" class="hidden" aria-label="Select CSV file" />
        </div>
      </div>

      <!-- About -->
      <div class="settings-section">
        <div class="settings-section-title">About</div>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">ListR</div>
            <div class="settings-row-sub">Version ${APP_VERSION}</div>
          </div>
          <button class="btn btn-secondary btn-sm" id="update-btn">Check for updates</button>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">About &amp; Instructions</div>
            <div class="settings-row-sub">How to use ListR</div>
          </div>
          <button class="btn btn-ghost btn-sm" id="about-btn">View</button>
        </div>
      </div>

    `;

    _updateThemeButtons();
    _bindEvents();
  }

  function _updateThemeButtons() {
    const current = Theme.get();
    container().querySelectorAll('.theme-option').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.themeVal === current);
      btn.setAttribute('aria-pressed', String(btn.dataset.themeVal === current));
    });
  }

  // ── Events ────────────────────────────────────────────────

  function _bindEvents() {
    // Theme buttons
    container().querySelectorAll('.theme-option').forEach((btn) => {
      btn.addEventListener('click', () => Theme.set(btn.dataset.themeVal));
    });

    // Export
    document.getElementById('export-btn').addEventListener('click', async () => {
      try {
        const filename = await CSV.exportAll();
        Toast.show(`Exported: ${filename}`, 'success');
      } catch (e) {
        Toast.show('Export failed: ' + e.message, 'error');
      }
    });

    // Import
    document.getElementById('import-btn').addEventListener('click', () => {
      document.getElementById('csv-file-input').click();
    });

    document.getElementById('csv-file-input').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      e.target.value = ''; // reset so same file can be re-selected

      try {
        const text   = await file.text();
        const parsed = CSV.parseImport(text);
        _openImportModal(parsed);
      } catch (err) {
        Toast.show('Could not read CSV: ' + err.message, 'error');
      }
    });

    // About
    document.getElementById('about-btn').addEventListener('click', _openAboutModal);

    // Updates
    document.getElementById('update-btn').addEventListener('click', async () => {
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            Toast.show('Checking for updates...', 'success');
            await reg.update();
            setTimeout(() => window.location.reload(), 1500);
          } else {
            Toast.show('App is not installed properly yet.', 'warn');
          }
        } catch (err) {
          Toast.show('Update check failed.', 'error');
        }
      } else {
        Toast.show('Offline mode not supported.', 'warn');
      }
    });
  }

  // ── Import Modal ──────────────────────────────────────────

  function _openImportModal(parsed) {
    const overlay   = document.getElementById('modal-overlay');
    const modalCont = document.getElementById('modal-container');
    const { summary } = parsed;
    let mode = 'merge'; // 'merge' | 'replace'

    function render() {
      modalCont.innerHTML = `
        <div class="modal-header">
          <h2 class="modal-title">Import CSV</h2>
          <button class="icon-btn" id="imp-close-btn" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <p style="margin-bottom:12px;color:var(--color-text-muted);font-size:14px;">
            Found <strong style="color:var(--color-text)">${summary.frequentListCount} frequent-buy list${summary.frequentListCount !== 1 ? 's' : ''}</strong>
            and <strong style="color:var(--color-text)">${summary.weeklyListCount} weekly list${summary.weeklyListCount !== 1 ? 's' : ''}</strong>.
          </p>

          <p style="font-size:13px;font-weight:600;margin-bottom:8px;">Import mode:</p>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;">
              <input type="radio" name="import-mode" value="merge" ${mode === 'merge' ? 'checked' : ''}
                style="margin-top:3px;accent-color:var(--color-primary);" />
              <div>
                <div style="font-weight:600;">Merge</div>
                <div style="font-size:13px;color:var(--color-text-muted);">Import and add to existing data, skipping duplicates.</div>
              </div>
            </label>
            <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;">
              <input type="radio" name="import-mode" value="replace" ${mode === 'replace' ? 'checked' : ''}
                style="margin-top:3px;accent-color:var(--color-primary);" />
              <div>
                <div style="font-weight:600;color:var(--color-danger);">Replace</div>
                <div style="font-size:13px;color:var(--color-text-muted);">⚠️ Erase all existing data and replace with CSV contents.</div>
              </div>
            </label>
          </div>

          ${mode === 'replace' ? `
            <div style="margin-top:12px;padding:10px 14px;background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;font-size:13px;color:#b91c1c;">
              ⚠️ All existing lists and items will be permanently deleted.
            </div>
          ` : ''}
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="imp-cancel-btn">Cancel</button>
          <button class="btn ${mode === 'replace' ? 'btn-danger' : 'btn-primary'}" id="imp-confirm-btn">
            ${mode === 'replace' ? 'Replace All Data' : 'Import'}
          </button>
        </div>
      `;

      modalCont.querySelectorAll('input[name="import-mode"]').forEach((radio) => {
        radio.addEventListener('change', () => { mode = radio.value; render(); });
      });

      function close() {
        overlay.classList.add('hidden');
        document.removeEventListener('keydown', onKey);
        overlay.removeEventListener('click', onOverlay);
      }
      function onKey(e)     { if (e.key === 'Escape') close(); }
      function onOverlay(e) { if (e.target === overlay) close(); }

      document.getElementById('imp-close-btn').addEventListener('click', close);
      document.getElementById('imp-cancel-btn').addEventListener('click', close);
      document.getElementById('imp-confirm-btn').addEventListener('click', async () => {
        close();
        try {
          if (mode === 'replace') {
            await CSV.replaceImport(parsed);
            Toast.show('Data replaced from CSV.', 'success');
          } else {
            await CSV.mergeImport(parsed);
            Toast.show('Data merged from CSV.', 'success');
          }
          // Signal app to reload all tabs
          document.dispatchEvent(new CustomEvent('dataimported'));
        } catch (err) {
          Toast.show('Import failed: ' + err.message, 'error');
        }
      });

      overlay.addEventListener('click', onOverlay);
      document.addEventListener('keydown', onKey);
    }

    overlay.classList.remove('hidden');
    render();
  }

  // ── About Modal ───────────────────────────────────────────

  function _openAboutModal() {
    const overlay   = document.getElementById('modal-overlay');
    const modalCont = document.getElementById('modal-container');

    modalCont.innerHTML = `
      <div class="modal-header">
        <h2 class="modal-title">About ListR</h2>
        <button class="icon-btn" id="about-close-btn" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="modal-body" style="line-height:1.7;">
        <div style="text-align:center;margin-bottom:20px;">
          <img src="icons/icon-192.png" width="72" height="72" alt="ListR icon"
            style="border-radius:18px;box-shadow:var(--shadow-md);display:inline-block;" />
          <h3 style="margin-top:12px;font-size:22px;font-weight:700;">ListR</h3>
          <p style="font-size:13px;color:var(--color-text-muted);">v${APP_VERSION} · Offline-first grocery PWA</p>
        </div>

        <p style="margin-bottom:14px;color:var(--color-text-muted);font-size:14px;">
          ListR is a lightweight, offline-first grocery shopping app. All data is stored
          on your device — no account, no cloud, no tracking.
        </p>

        <h4 style="font-weight:700;margin-bottom:6px;">How to use</h4>
        <ul style="list-style:disc;padding-left:20px;font-size:14px;color:var(--color-text-muted);display:flex;flex-direction:column;gap:6px;">
          <li><strong>Shopping</strong> — Create and manage your active weekly shopping list.</li>
          <li><strong>Frequent</strong> — Build reusable lists of items you buy regularly.</li>
          <li><strong>History</strong> — Browse archived lists and duplicate them.</li>
          <li><strong>Settings</strong> — Change theme, export/import your data.</li>
        </ul>

        <h4 style="font-weight:700;margin-top:16px;margin-bottom:6px;">Gestures</h4>
        <ul style="list-style:disc;padding-left:20px;font-size:14px;color:var(--color-text-muted);display:flex;flex-direction:column;gap:6px;">
          <li>Tap an item to toggle purchased.</li>
          <li>Swipe left on an item to delete it.</li>
          <li>Long-press an item to reveal the delete button.</li>
          <li>Drag the ≡ handle to reorder items.</li>
        </ul>
      </div>
    `;

    function close() {
      overlay.classList.add('hidden');
      document.removeEventListener('keydown', onKey);
      overlay.removeEventListener('click', onOverlay);
    }
    function onKey(e)     { if (e.key === 'Escape') close(); }
    function onOverlay(e) { if (e.target === overlay) close(); }

    document.getElementById('about-close-btn').addEventListener('click', close);
    overlay.addEventListener('click', onOverlay);
    document.addEventListener('keydown', onKey);
    overlay.classList.remove('hidden');
    requestAnimationFrame(() => document.getElementById('about-close-btn')?.focus());
  }

  return { init };
})();
