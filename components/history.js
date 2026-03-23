/**
 * components/history.js — History tab (archived weekly lists)
 */

const History = (() => {
  let _lists = [];   // archived weeklyLists, newest first
  let _view  = null; // { list, items } for detail view

  const container = () => document.getElementById('history-content');

  // ── Public API ────────────────────────────────────────────

  async function init() {
    await _load();
    _render();
  }

  // ── Data ──────────────────────────────────────────────────

  async function _load() {
    const all = await DB.getAll('weeklyLists');
    _lists = all
      .filter((l) => l.status === 'archived')
      .sort((a, b) => new Date(b.archivedAt || b.createdAt) - new Date(a.archivedAt || a.createdAt));
  }

  // ── Rendering ─────────────────────────────────────────────

  function _render() {
    if (_view) {
      _renderDetail();
    } else {
      _renderList();
    }
  }

  function _renderList() {
    if (_lists.length === 0) {
      container().innerHTML = `
        <div class="empty-state" style="margin-top:48px;">
          <div class="empty-state-icon">🕐</div>
          <div class="empty-state-title">No history yet</div>
          <div class="empty-state-subtitle">Finished shopping lists will appear here once you archive them.</div>
        </div>
      `;
      return;
    }

    container().innerHTML = `
      <div style="padding:0 4px 4px;font-size:13px;color:var(--color-text-muted)">
        ${_lists.length} archived list${_lists.length !== 1 ? 's' : ''}
      </div>
      ${_lists.map((list) => _renderHistoryItem(list)).join('')}
    `;

    _bindListEvents();
  }

  function _renderHistoryItem(list) {
    const created  = _fmtDate(list.createdAt);
    const archived = _fmtDate(list.archivedAt);
    return `
      <div class="history-item" data-list-id="${list.id}" role="button" tabindex="0"
        aria-label="View ${escHtml(list.name)}">
        <div class="history-item-name">${escHtml(list.name)}</div>
        <div class="history-item-meta">
          <span>Created ${created}</span>
          ${archived ? `<span>Archived ${archived}</span>` : ''}
        </div>
      </div>
    `;
  }

  async function _renderDetail() {
    const { list, items } = _view;
    const purchased = items.filter((i) => i.purchased).length;

    container().innerHTML = `
      <div class="history-detail">
        <div class="history-detail-header">
          <button class="back-btn" id="history-back-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>
        </div>
        <div>
          <h2 style="font-size:20px;font-weight:700;color:var(--color-text)">${escHtml(list.name)}</h2>
          <div style="font-size:13px;color:var(--color-text-muted);margin-top:4px;">
            Created ${_fmtDate(list.createdAt)}
            ${list.archivedAt ? ` · Archived ${_fmtDate(list.archivedAt)}` : ''}
            · ${items.length} item${items.length !== 1 ? 's' : ''}
            · ${purchased} purchased
          </div>
        </div>

        <button class="btn btn-primary btn-full" id="history-duplicate-btn">
          Duplicate to New List
        </button>

        <div class="card">
          <ul class="item-list" aria-label="Items in ${escHtml(list.name)}">
            ${items.length === 0
              ? `<li style="padding:20px;text-align:center;color:var(--color-text-muted);font-size:14px;">This list has no items.</li>`
              : items.sort((a,b) => a.order - b.order).map((item) => `
                <li class="list-item" style="cursor:default;">
                  <div class="item-checkbox ${item.purchased ? 'checked' : ''}"
                    style="pointer-events:none;" aria-hidden="true"></div>
                  <span class="item-name ${item.purchased ? 'purchased' : ''}">${escHtml(item.name)}</span>
                </li>
              `).join('')
            }
          </ul>
        </div>

        <button class="btn btn-danger btn-full" id="history-delete-btn">
          Delete This List
        </button>
      </div>
    `;

    document.getElementById('history-back-btn').addEventListener('click', () => {
      _view = null;
      _render();
    });

    document.getElementById('history-duplicate-btn').addEventListener('click', async () => {
      await _duplicateToNew(list, items);
    });

    document.getElementById('history-delete-btn').addEventListener('click', () => {
      _openConfirm(
        `Permanently delete "${list.name}"?`,
        '🗑️',
        'Delete',
        async () => {
          await DB.remove('weeklyLists', list.id);
          await DB.removeAllByIndex('weeklyItems', 'listId', list.id);
          _lists = _lists.filter((l) => l.id !== list.id);
          _view  = null;
          _render();
          Toast.show('List deleted.', 'success');
        }
      );
    });
  }

  // ── Events ────────────────────────────────────────────────

  function _bindListEvents() {
    container().querySelectorAll('.history-item').forEach((el) => {
      const listId = el.dataset.listId;

      el.addEventListener('click', () => _openDetail(listId));
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); _openDetail(listId); }
      });

      // Swipe to delete
      SwipeToDelete.attach(el, (elem) => {
        const id   = elem.dataset.listId;
        const list = _lists.find((l) => l.id === id);
        _openConfirm(
          `Permanently delete "${list?.name || 'this list'}"?`,
          '🗑️',
          'Delete',
          async () => {
            await DB.remove('weeklyLists', id);
            await DB.removeAllByIndex('weeklyItems', 'listId', id);
            _lists = _lists.filter((l) => l.id !== id);
            _render();
            Toast.show('List deleted.', 'success');
          }
        );
      });
    });
  }

  async function _openDetail(listId) {
    const list  = _lists.find((l) => l.id === listId);
    if (!list) return;
    const items = await DB.getAllByIndex('weeklyItems', 'listId', listId);
    _view = { list, items };
    _render();
  }

  async function _duplicateToNew(sourceList, sourceItems) {
    // Archive current active list if any
    const allLists  = await DB.getAll('weeklyLists');
    const activeList = allLists.find((l) => l.status === 'active');
    if (activeList) {
      activeList.status     = 'archived';
      activeList.archivedAt = new Date().toISOString();
      await DB.put('weeklyLists', activeList);
    }

    const newList = {
      id:         DB.uuid(),
      name:       sourceList.name,
      status:     'active',
      order:      0,
      createdAt:  new Date().toISOString(),
      archivedAt: null,
    };
    await DB.put('weeklyLists', newList);

    const newItems = sourceItems.map((item, idx) => ({
      id:        DB.uuid(),
      listId:    newList.id,
      name:      item.name,
      purchased: false,
      order:     item.order ?? idx,
    }));
    if (newItems.length > 0) await DB.putMany('weeklyItems', newItems);

    Toast.show('Duplicated to new shopping list!', 'success');

    // Navigate to Shopping tab
    _view = null;
    document.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'shopping' } }));
  }

  // ── Helpers ───────────────────────────────────────────────

  function _fmtDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function _openConfirm(message, icon, confirmLabel, onConfirm) {
    const overlay   = document.getElementById('modal-overlay');
    const modalCont = document.getElementById('modal-container');

    modalCont.innerHTML = `
      <div class="modal-header">
        <h2 class="modal-title">Confirm</h2>
        <button class="icon-btn" id="conf-close-btn" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="confirm-dialog">
          <div class="confirm-dialog-icon">${icon}</div>
          <p class="confirm-dialog-message">${escHtml(message)}</p>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="conf-cancel-btn">Cancel</button>
        <button class="btn btn-danger" id="conf-confirm-btn">${escHtml(confirmLabel)}</button>
      </div>
    `;

    function close() {
      overlay.classList.add('hidden');
      document.removeEventListener('keydown', onKey);
      overlay.removeEventListener('click', onOverlay);
    }
    function onKey(e)     { if (e.key === 'Escape') close(); }
    function onOverlay(e) { if (e.target === overlay) close(); }

    document.getElementById('conf-close-btn').addEventListener('click', close);
    document.getElementById('conf-cancel-btn').addEventListener('click', close);
    document.getElementById('conf-confirm-btn').addEventListener('click', () => { close(); onConfirm(); });
    overlay.addEventListener('click', onOverlay);
    document.addEventListener('keydown', onKey);
    overlay.classList.remove('hidden');
    requestAnimationFrame(() => document.getElementById('conf-confirm-btn')?.focus());
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { init };
})();
