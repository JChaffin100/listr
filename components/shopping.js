/**
 * components/shopping.js — Shopping tab (multiple active lists)
 *
 * Two-level view:
 *   Index  — shows all active lists; drag to reorder; tap to open
 *   Detail — the open list, with items, add-bar, back button
 */

const Shopping = (() => {
  let _lists   = [];   // all active weeklyLists, ordered by list.order
  let _list    = null; // currently open weeklyList record (null = index view)
  let _items   = [];   // weeklyItems for _list
  let _searchQ = '';   // current search filter (only used in detail view)
  let _allFrequentItems = []; // for autocomplete

  const container = () => document.getElementById('shopping-content');

  // ── Public API ────────────────────────────────────────────

  async function init() {
    await _load();
    // If _list was already set (tab re-activation), keep detail view open
    // but refresh from the freshly loaded _lists array.
    if (_list) {
      const refreshed = _lists.find((l) => l.id === _list.id);
      _list = refreshed || null;
      if (_list) {
        _items = await DB.getAllByIndex('weeklyItems', 'listId', _list.id);
        _items.sort((a, b) => a.order - b.order);
      }
    }
    _render();
    _bindSearch();
  }

  function setSearch(q) {
    if (!_list) return; // no-op on index view
    _searchQ = q.toLowerCase();
    _renderItems();
  }

  // ── Data loading ──────────────────────────────────────────

  async function _load() {
    const allLists = await DB.getAll('weeklyLists');
    _lists = allLists
      .filter((l) => l.status === 'active')
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    await _loadFrequentItems();
  }

  async function _loadFrequentItems() {
    _allFrequentItems = await DB.getAll('frequentItems');
  }

  // ── Rendering ─────────────────────────────────────────────

  function _render() {
    if (!_list) {
      _renderIndex();
    } else {
      _renderList();
    }
  }

  // ── INDEX VIEW ────────────────────────────────────────────

  function _renderIndex() {
    if (_lists.length === 0) {
      container().innerHTML = `
        <div class="empty-state" style="margin-top:48px;">
          <div class="empty-state-icon">🛒</div>
          <div class="empty-state-title">No active shopping lists</div>
          <div class="empty-state-subtitle">Tap "New List" to start shopping.</div>
          <button class="btn btn-primary" id="new-list-btn-empty">New List</button>
        </div>
      `;
      document.getElementById('new-list-btn-empty').addEventListener('click', _openNewListModal);
      return;
    }

    container().innerHTML = `
      <div class="shopping-index-header">
        <div style="font-size:13px;color:var(--color-text-muted);">
          ${_lists.length} active list${_lists.length !== 1 ? 's' : ''}
        </div>
        <button class="btn btn-primary btn-sm" id="new-list-btn-index">New List</button>
      </div>
      <div id="shopping-index-list">
        ${_lists.map((list) => _renderIndexItemHtml(list)).join('')}
      </div>
    `;

    document.getElementById('new-list-btn-index').addEventListener('click', _openNewListModal);
    _bindIndexEvents();
    _setupIndexDragDrop();
  }

  function _renderIndexItemHtml(list) {
    // We don't have item counts cached here — they'll show as 0 until
    // the user opens the list. For a richer index we'd need counts stored
    // on the list record; for now show a simple card with name + created date.
    const created = _fmtDate(list.createdAt);
    return `
      <div class="shopping-index-item" data-list-id="${list.id}"
           role="button" tabindex="0" aria-label="Open ${escHtml(list.name)}">
        <span class="drag-handle shopping-index-drag" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"/>
            <line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
        </span>
        <div class="shopping-index-item-body">
          <div class="shopping-index-item-name">${escHtml(list.name)}</div>
          <div class="shopping-index-item-meta">Created ${created}</div>
        </div>
        <svg class="shopping-index-chevron" width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
    `;
  }

  function _bindIndexEvents() {
    const indexList = document.getElementById('shopping-index-list');
    if (!indexList) return;

    indexList.querySelectorAll('.shopping-index-item').forEach((el) => {
      el.addEventListener('click', (e) => {
        // Don't open if user clicked the drag handle
        if (e.target.closest('.shopping-index-drag')) return;
        _openList(el.dataset.listId);
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          _openList(el.dataset.listId);
        }
      });
    });
  }

  function _setupIndexDragDrop() {
    const indexList = document.getElementById('shopping-index-list');
    if (!indexList) return;
    DragDrop.enable(indexList, {
      itemSelector: '.shopping-index-item',
      handleSelector: '.shopping-index-drag',
      onReorder: async (from, to) => {
        const moved = _lists.splice(from, 1)[0];
        _lists.splice(to, 0, moved);
        _lists.forEach((list, idx) => { list.order = idx; });
        await DB.putMany('weeklyLists', _lists);
      },
    });
  }

  async function _openList(listId) {
    const list = _lists.find((l) => l.id === listId);
    if (!list) return;
    _list  = list;
    _items = await DB.getAllByIndex('weeklyItems', 'listId', listId);
    _items.sort((a, b) => a.order - b.order);
    _searchQ = '';
    _render();
  }

  // ── DETAIL VIEW ───────────────────────────────────────────

  function _renderList() {
    const total     = _items.length;
    const purchased = _items.filter((i) => i.purchased).length;
    const pct       = total === 0 ? 0 : Math.round((purchased / total) * 100);

    container().innerHTML = `
      <div class="shopping-detail-header">
        <button class="back-btn" id="shopping-back-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Lists
        </button>
        <button class="btn btn-secondary btn-sm" id="new-list-btn-top">New List</button>
      </div>

      <div class="shopping-header">
        <input
          class="list-name-editable"
          id="list-name-input"
          value="${escHtml(_list.name)}"
          aria-label="List name"
          spellcheck="false"
        />
      </div>

      ${total > 0 ? `
        <div>
          <div class="shopping-progress">
            <div class="shopping-progress-bar" style="width:${pct}%"></div>
          </div>
          <div class="shopping-count">${purchased} of ${total} purchased</div>
        </div>
      ` : ''}

      <div class="shopping-actions">
        <button class="btn btn-secondary btn-sm" id="clear-purchased-btn">Clear Purchased</button>
        <button class="btn btn-ghost btn-sm" id="finish-archive-btn">Finish &amp; Archive</button>
      </div>

      <div class="card" id="shopping-list-card">
        <ul class="item-list" id="shopping-items" aria-label="Shopping items">
          ${_renderItemsHtml()}
        </ul>
      </div>

      <div class="add-item-bar" id="shopping-add-bar">
        <div class="add-item-input-wrap">
          <input
            class="add-item-input"
            id="shopping-add-input"
            type="text"
            placeholder="Add item…"
            aria-label="Add item"
            autocomplete="off"
          />
          <div class="autocomplete-dropdown hidden" id="autocomplete-dropdown"></div>
        </div>
        <button class="btn btn-primary" id="shopping-add-btn" aria-label="Add item">Add</button>
      </div>
    `;

    _bindListEvents();
    _setupDragDrop();
    _setupSwipe();
  }

  function _renderItems() {
    const ul = document.getElementById('shopping-items');
    if (!ul) return;
    ul.innerHTML = _renderItemsHtml();
    _bindItemEvents();
    _setupSwipe();
  }

  function _renderItemsHtml() {
    const visible = _searchQ
      ? _items.filter((i) => i.name.toLowerCase().includes(_searchQ))
      : _items;

    if (visible.length === 0) {
      if (_searchQ) {
        return `<li style="padding:20px;text-align:center;color:var(--color-text-muted);font-size:14px;">No items match "${escHtml(_searchQ)}"</li>`;
      }
      return `<li style="padding:24px 16px;text-align:center;color:var(--color-text-muted);font-size:14px;">No items yet — add some below!</li>`;
    }

    return visible.map((item) => `
      <li class="list-item${item.purchased ? ' purchased-item' : ''}"
          data-id="${item.id}"
          aria-label="${escHtml(item.name)}${item.purchased ? ', purchased' : ''}">
        <span class="drag-handle" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"/>
            <line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
        </span>
        <div class="item-checkbox ${item.purchased ? 'checked' : ''}" role="checkbox"
          aria-checked="${item.purchased}" tabindex="0" aria-label="Toggle purchased"></div>
        <span class="item-name ${item.purchased ? 'purchased' : ''}">${escHtml(item.name)}</span>
      </li>
    `).join('');
  }

  // ── Event binding ─────────────────────────────────────────

  function _bindListEvents() {
    document.getElementById('shopping-back-btn').addEventListener('click', () => {
      _list    = null;
      _searchQ = '';
      _render();
    });

    document.getElementById('new-list-btn-top').addEventListener('click', _openNewListModal);
    document.getElementById('clear-purchased-btn').addEventListener('click', _clearPurchased);
    document.getElementById('finish-archive-btn').addEventListener('click', _finishAndArchive);

    // Editable list name
    const nameInput = document.getElementById('list-name-input');
    nameInput.addEventListener('blur', async () => {
      const newName = nameInput.value.trim() || _list.name;
      if (newName !== _list.name) {
        _list.name = newName;
        await DB.put('weeklyLists', _list);
      }
    });
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') nameInput.blur();
    });

    // Add item
    document.getElementById('shopping-add-btn').addEventListener('click', _addItemFromInput);
    document.getElementById('shopping-add-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') _addItemFromInput();
    });
    document.getElementById('shopping-add-input').addEventListener('input', _onAutocompleteInput);
    document.getElementById('shopping-add-input').addEventListener('blur', () => {
      setTimeout(() => {
        const dd = document.getElementById('autocomplete-dropdown');
        if (dd) dd.classList.add('hidden');
      }, 150);
    });

    _bindItemEvents();
  }

  function _bindItemEvents() {
    const ul = document.getElementById('shopping-items');
    if (!ul) return;

    ul.querySelectorAll('.item-checkbox, .item-name').forEach((el) => {
      el.addEventListener('click', async (e) => {
        const li = e.target.closest('.list-item');
        if (!li) return;
        await _toggleItem(li.dataset.id);
      });
      el.addEventListener('keydown', async (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          const li = e.target.closest('.list-item');
          if (!li) return;
          await _toggleItem(li.dataset.id);
        }
      });
    });
  }

  function _setupDragDrop() {
    const ul = document.getElementById('shopping-items');
    if (!ul) return;
    DragDrop.enable(ul, {
      itemSelector: '.list-item',
      handleSelector: '.drag-handle',
      onReorder: async (from, to) => {
        const visible = _searchQ ? _items.filter((i) => i.name.toLowerCase().includes(_searchQ)) : _items;
        const moved   = visible.splice(from, 1)[0];
        visible.splice(to, 0, moved);
        if (!_searchQ) {
          _items = visible;
        }
        _items.forEach((item, idx) => { item.order = idx; });
        await DB.putMany('weeklyItems', _items);
      },
    });
  }

  function _setupSwipe() {
    const ul = document.getElementById('shopping-items');
    if (!ul) return;
    ul.querySelectorAll('.list-item').forEach((li) => {
      SwipeToDelete.attach(li, async (el) => {
        await _deleteItem(el.dataset.id);
      });
    });
  }

  // ── New List modal ────────────────────────────────────────

  function _openNewListModal() {
    const overlay   = document.getElementById('modal-overlay');
    const modalCont = document.getElementById('modal-container');

    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const defaultName = `Shopping ${today}`;

    modalCont.innerHTML = `
      <div class="modal-header">
        <h2 class="modal-title">New Shopping List</h2>
        <button class="icon-btn" id="nl-close-btn" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <input class="new-list-name-input" id="nl-name-input" type="text"
          value="${escHtml(defaultName)}" placeholder="List name" aria-label="List name" />
        <div style="margin-top:16px;">
          <p style="font-size:13px;color:var(--color-text-muted);margin-bottom:8px;">Start with:</p>
          <div class="new-list-options">
            <button class="new-list-option-btn" id="nl-blank-btn">
              <span class="new-list-option-icon">📋</span>
              <div>
                <div>Start blank</div>
                <div style="font-size:13px;font-weight:400;color:var(--color-text-muted)">Empty list, ready to fill</div>
              </div>
            </button>
            <button class="new-list-option-btn" id="nl-import-btn">
              <span class="new-list-option-icon">⭐</span>
              <div>
                <div>Import from frequent lists</div>
                <div style="font-size:13px;font-weight:400;color:var(--color-text-muted)">Pick items from your saved lists</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    `;

    function getName() {
      return document.getElementById('nl-name-input').value.trim() || defaultName;
    }

    function close() {
      overlay.classList.add('hidden');
      document.removeEventListener('keydown', onKey);
      overlay.removeEventListener('click', onOverlay);
    }

    function onKey(e) { if (e.key === 'Escape') close(); }
    function onOverlay(e) { if (e.target === overlay) close(); }

    document.getElementById('nl-close-btn').addEventListener('click', close);
    overlay.addEventListener('click', onOverlay);
    document.addEventListener('keydown', onKey);

    document.getElementById('nl-blank-btn').addEventListener('click', async () => {
      close();
      await _createNewList(getName(), []);
    });

    document.getElementById('nl-import-btn').addEventListener('click', async () => {
      const listName = getName();
      close();
      const [lists, items] = await Promise.all([
        DB.getAll('frequentLists'),
        DB.getAll('frequentItems'),
      ]);
      const selectedNames = await PickerModal.open(lists, items);
      if (selectedNames !== null) {
        await _createNewList(listName, selectedNames);
      }
    });

    overlay.classList.remove('hidden');
    requestAnimationFrame(() => {
      const input = document.getElementById('nl-name-input');
      if (input) { input.focus(); input.select(); }
    });
  }

  async function _createNewList(name, itemNames) {
    // Assign the new list an order after the current last list
    const maxOrder = _lists.reduce((m, l) => Math.max(m, l.order ?? 0), -1);

    const newList = {
      id:         DB.uuid(),
      name:       name,
      status:     'active',
      order:      maxOrder + 1,
      createdAt:  new Date().toISOString(),
      archivedAt: null,
    };
    await DB.put('weeklyLists', newList);

    const newItems = itemNames.map((itemName, idx) => ({
      id:        DB.uuid(),
      listId:    newList.id,
      name:      itemName,
      purchased: false,
      order:     idx,
    }));
    if (newItems.length > 0) await DB.putMany('weeklyItems', newItems);

    // Add to local state and open in detail view
    _lists.push(newList);
    _list  = newList;
    _items = newItems;
    _searchQ = '';
    _render();
    Toast.show('New list created!', 'success');
  }

  // ── Item actions ──────────────────────────────────────────

  async function _toggleItem(id) {
    const item = _items.find((i) => i.id === id);
    if (!item) return;
    item.purchased = !item.purchased;
    await DB.put('weeklyItems', item);
    _renderItems();
    _updateProgress();
  }

  async function _addItemFromInput() {
    const input = document.getElementById('shopping-add-input');
    if (!input || !_list) return;
    const name = input.value.trim();
    if (!name) return;

    const exists = _items.some((i) => i.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      Toast.show(`"${name}" is already on the list.`, 'warn');
      input.value = '';
      return;
    }

    const item = {
      id:        DB.uuid(),
      listId:    _list.id,
      name:      name,
      purchased: false,
      order:     _items.length,
    };
    await DB.put('weeklyItems', item);
    _items.push(item);
    input.value = '';
    document.getElementById('autocomplete-dropdown')?.classList.add('hidden');
    _renderItems();
    _updateProgress();
    Toast.show(`"${name}" added.`);
  }

  async function _deleteItem(id) {
    await DB.remove('weeklyItems', id);
    _items = _items.filter((i) => i.id !== id);
    _renderItems();
    _updateProgress();
  }

  async function _clearPurchased() {
    const purchased = _items.filter((i) => i.purchased);
    if (purchased.length === 0) {
      Toast.show('No purchased items to clear.', 'warn');
      return;
    }
    _openConfirm(
      `Remove ${purchased.length} purchased item${purchased.length !== 1 ? 's' : ''}?`,
      '🧹',
      'Clear',
      async () => {
        await Promise.all(purchased.map((i) => DB.remove('weeklyItems', i.id)));
        _items = _items.filter((i) => !i.purchased);
        _renderItems();
        _updateProgress();
        Toast.show('Purchased items cleared.', 'success');
      }
    );
  }

  async function _finishAndArchive() {
    if (!_list) return;
    _openConfirm(
      'Archive this list?',
      '📦',
      'Archive',
      async () => {
        _list.status     = 'archived';
        _list.archivedAt = new Date().toISOString();
        await DB.put('weeklyLists', _list);
        // Remove from active lists and return to index
        _lists = _lists.filter((l) => l.id !== _list.id);
        _list  = null;
        _items = [];
        _searchQ = '';
        _render();
        Toast.show('List archived.', 'success');
      }
    );
  }

  function _updateProgress() {
    const bar   = document.querySelector('.shopping-progress-bar');
    const count = document.querySelector('.shopping-count');
    const total = _items.length;
    const purch = _items.filter((i) => i.purchased).length;
    const pct   = total === 0 ? 0 : Math.round((purch / total) * 100);
    if (bar)   bar.style.width   = pct + '%';
    if (count) count.textContent = `${purch} of ${total} purchased`;
  }

  // ── Autocomplete ──────────────────────────────────────────

  function _onAutocompleteInput(e) {
    const q  = e.target.value.trim().toLowerCase();
    const dd = document.getElementById('autocomplete-dropdown');
    if (!dd) return;

    if (!q) { dd.classList.add('hidden'); return; }

    const matches = _allFrequentItems
      .filter((fi) => fi.name.toLowerCase().includes(q))
      .filter((fi) => !_items.some((wi) => wi.name.toLowerCase() === fi.name.toLowerCase()))
      .slice(0, 8);

    if (matches.length === 0) { dd.classList.add('hidden'); return; }

    dd.innerHTML = matches.map((fi) => `
      <div class="autocomplete-item" data-name="${escHtml(fi.name)}">${escHtml(fi.name)}</div>
    `).join('');

    dd.querySelectorAll('.autocomplete-item').forEach((el) => {
      el.addEventListener('mousedown', async (ev) => {
        ev.preventDefault();
        const input = document.getElementById('shopping-add-input');
        if (input) input.value = el.dataset.name;
        dd.classList.add('hidden');
        await _addItemFromInput();
      });
    });

    dd.classList.remove('hidden');
  }

  // ── Search ────────────────────────────────────────────────

  function _bindSearch() {
    // Wired up via app.js search events
  }

  // ── Confirm helper ────────────────────────────────────────

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

    function onKey(e) { if (e.key === 'Escape') close(); }
    function onOverlay(e) { if (e.target === overlay) close(); }

    document.getElementById('conf-close-btn').addEventListener('click', close);
    document.getElementById('conf-cancel-btn').addEventListener('click', close);
    document.getElementById('conf-confirm-btn').addEventListener('click', () => { close(); onConfirm(); });
    overlay.addEventListener('click', onOverlay);
    document.addEventListener('keydown', onKey);

    overlay.classList.remove('hidden');
    requestAnimationFrame(() => document.getElementById('conf-confirm-btn')?.focus());
  }

  // ── Helpers ───────────────────────────────────────────────

  function _fmtDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { init, setSearch };
})();
