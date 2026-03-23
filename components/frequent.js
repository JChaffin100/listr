/**
 * components/frequent.js — Frequent-buy lists tab
 */

const Frequent = (() => {
  let _lists = [];   // frequentLists
  let _items = {};   // { listId: frequentItems[] }

  const container = () => document.getElementById('frequent-content');

  // ── Public API ────────────────────────────────────────────

  async function init() {
    await _load();
    _render();
  }

  // ── Data ──────────────────────────────────────────────────

  async function _load() {
    _lists = await DB.getAll('frequentLists');
    _lists.sort((a, b) => a.order - b.order);
    const allItems = await DB.getAll('frequentItems');
    _items = {};
    for (const list of _lists) _items[list.id] = [];
    for (const item of allItems) {
      if (_items[item.listId]) _items[item.listId].push(item);
    }
    for (const id in _items) _items[id].sort((a, b) => a.order - b.order);
  }

  // ── Rendering ─────────────────────────────────────────────

  function _render() {
    if (_lists.length === 0) {
      container().innerHTML = `
        <div class="empty-state" style="margin-top:48px;">
          <div class="empty-state-icon">⭐</div>
          <div class="empty-state-title">No frequent lists yet</div>
          <div class="empty-state-subtitle">Create lists of items you buy regularly, then import them into a new shopping list.</div>
          <button class="btn btn-primary" id="create-first-list-btn">Create a list</button>
        </div>
        <button class="btn btn-primary" id="create-list-fab" style="
          position:fixed;bottom:calc(var(--nav-height) + 16px);right:16px;
          border-radius:50%;width:56px;height:56px;font-size:28px;
          box-shadow:var(--shadow-lg);z-index:30;padding:0;
        " aria-label="Create new frequent list">+</button>
      `;
      document.getElementById('create-first-list-btn').addEventListener('click', _openCreateList);
      document.getElementById('create-list-fab').addEventListener('click', _openCreateList);
      return;
    }

    container().innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0 4px 4px;">
        <span style="font-size:13px;color:var(--color-text-muted)">${_lists.length} list${_lists.length !== 1 ? 's' : ''}</span>
      </div>
      <div id="frequent-lists-wrap">
        ${_lists.map((list) => _renderListCard(list)).join('')}
      </div>
      <button class="btn btn-primary" id="create-list-fab" style="
        position:fixed;bottom:calc(var(--nav-height) + 16px);right:16px;
        border-radius:50%;width:56px;height:56px;font-size:28px;
        box-shadow:var(--shadow-lg);z-index:30;padding:0;
      " aria-label="Create new frequent list">+</button>
    `;

    document.getElementById('create-list-fab').addEventListener('click', _openCreateList);
    _bindListEvents();
    _setupListDragDrop();
  }

  function _renderListCard(list) {
    const items    = _items[list.id] || [];
    const isOpen   = list._open;
    return `
      <div class="frequent-list-card" data-list-id="${list.id}">
        <div class="frequent-list-header">
          <span class="drag-handle" aria-hidden="true" style="cursor:grab;color:var(--color-text-disabled);display:flex;align-items:center;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
          </span>
          <input
            class="frequent-list-name"
            value="${escHtml(list.name)}"
            aria-label="List name"
            spellcheck="false"
            data-list-id="${list.id}"
          />
          <span class="frequent-list-count">${items.length} item${items.length !== 1 ? 's' : ''}</span>
          <button class="icon-btn frequent-delete-btn" data-list-id="${list.id}" aria-label="Delete list">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
          <span class="frequent-list-toggle ${isOpen ? 'open' : ''}" aria-hidden="true">▼</span>
        </div>
        <div class="frequent-list-body ${isOpen ? 'open' : ''}" data-list-id="${list.id}">
          <ul class="item-list" id="freq-items-${list.id}">
            ${_renderFreqItemsHtml(list.id)}
          </ul>
          <div class="add-item-bar" style="position:static;box-shadow:none;border-top:1px solid var(--color-border);">
            <div class="add-item-input-wrap" style="flex:1;">
              <input class="add-item-input freq-add-input" data-list-id="${list.id}"
                type="text" placeholder="Add item…" aria-label="Add item" autocomplete="off" />
            </div>
            <button class="btn btn-primary btn-sm freq-add-btn" data-list-id="${list.id}">Add</button>
          </div>
        </div>
      </div>
    `;
  }

  function _renderFreqItemsHtml(listId) {
    const items = _items[listId] || [];
    if (items.length === 0) {
      return `<li style="padding:12px 16px;font-size:13px;color:var(--color-text-muted)">No items yet.</li>`;
    }
    return items.map((item) => `
      <li class="list-item" data-id="${item.id}" data-list-id="${listId}" aria-label="${escHtml(item.name)}">
        <span class="drag-handle" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
        </span>
        <span class="item-name">${escHtml(item.name)}</span>
      </li>
    `).join('');
  }

  // ── Events ────────────────────────────────────────────────

  function _bindListEvents() {
    const wrap = document.getElementById('frequent-lists-wrap');
    if (!wrap) return;

    // Toggle expand/collapse on header click (but not on inputs or buttons)
    wrap.querySelectorAll('.frequent-list-header').forEach((header) => {
      header.addEventListener('click', (e) => {
        if (e.target.closest('input, button')) return;
        const listId = header.closest('.frequent-list-card').dataset.listId;
        const list   = _lists.find((l) => l.id === listId);
        if (list) { list._open = !list._open; _render(); }
      });
    });

    // Rename
    wrap.querySelectorAll('.frequent-list-name').forEach((input) => {
      input.addEventListener('click', (e) => e.stopPropagation());
      input.addEventListener('blur', async () => {
        const listId = input.dataset.listId;
        const list   = _lists.find((l) => l.id === listId);
        if (!list) return;
        const newName = input.value.trim() || list.name;
        if (newName !== list.name) {
          list.name = newName;
          await DB.put('frequentLists', list);
        }
      });
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
    });

    // Delete list
    wrap.querySelectorAll('.frequent-delete-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const listId = btn.dataset.listId;
        const list   = _lists.find((l) => l.id === listId);
        if (!list) return;
        _openConfirm(
          `Delete "${list.name}" and all its items?`,
          '🗑️',
          'Delete',
          async () => {
            await DB.remove('frequentLists', listId);
            await DB.removeAllByIndex('frequentItems', 'listId', listId);
            _lists = _lists.filter((l) => l.id !== listId);
            delete _items[listId];
            _render();
            Toast.show('List deleted.', 'success');
          }
        );
      });
    });

    // Add item buttons & inputs
    wrap.querySelectorAll('.freq-add-btn').forEach((btn) => {
      btn.addEventListener('click', () => _addFreqItem(btn.dataset.listId));
    });
    wrap.querySelectorAll('.freq-add-input').forEach((input) => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') _addFreqItem(input.dataset.listId);
      });
    });

    // Per-list drag-drop & swipe
    _lists.forEach((list) => {
      if (!list._open) return;
      const ul = document.getElementById(`freq-items-${list.id}`);
      if (!ul) return;
      _setupItemDragDrop(ul, list.id);
      _setupItemSwipe(ul, list.id);
    });
  }

  function _setupListDragDrop() {
    const wrap = document.getElementById('frequent-lists-wrap');
    if (!wrap) return;
    DragDrop.enable(wrap, {
      itemSelector:   '.frequent-list-card',
      handleSelector: '.drag-handle',
      onReorder: async (from, to) => {
        const moved = _lists.splice(from, 1)[0];
        _lists.splice(to, 0, moved);
        _lists.forEach((l, idx) => { l.order = idx; });
        await DB.putMany('frequentLists', _lists);
      },
    });
  }

  function _setupItemDragDrop(ul, listId) {
    DragDrop.enable(ul, {
      itemSelector:   '.list-item',
      handleSelector: '.drag-handle',
      onReorder: async (from, to) => {
        const items = _items[listId];
        const moved = items.splice(from, 1)[0];
        items.splice(to, 0, moved);
        items.forEach((item, idx) => { item.order = idx; });
        await DB.putMany('frequentItems', items);
      },
    });
  }

  function _setupItemSwipe(ul, listId) {
    ul.querySelectorAll('.list-item').forEach((li) => {
      SwipeToDelete.attach(li, async (el) => {
        const itemId = el.dataset.id;
        await DB.remove('frequentItems', itemId);
        _items[listId] = (_items[listId] || []).filter((i) => i.id !== itemId);
        const newUl = document.getElementById(`freq-items-${listId}`);
        if (newUl) newUl.innerHTML = _renderFreqItemsHtml(listId);
        const list = _lists.find((l) => l.id === listId);
        if (list) {
          const countEl = document.querySelector(`.frequent-list-card[data-list-id="${listId}"] .frequent-list-count`);
          if (countEl) {
            const n = (_items[listId] || []).length;
            countEl.textContent = `${n} item${n !== 1 ? 's' : ''}`;
          }
        }
        _setupItemDragDrop(newUl, listId);
        _setupItemSwipe(newUl, listId);
        Toast.show('Item deleted.', 'success');
      });
    });
  }

  // ── Actions ───────────────────────────────────────────────

  async function _addFreqItem(listId) {
    const input = document.querySelector(`.freq-add-input[data-list-id="${listId}"]`);
    if (!input) return;
    const name = input.value.trim();
    if (!name) return;

    // Duplicate check within list
    if ((_items[listId] || []).some((i) => i.name.toLowerCase() === name.toLowerCase())) {
      Toast.show(`"${name}" already in this list.`, 'warn');
      input.value = '';
      return;
    }

    const item = {
      id:     DB.uuid(),
      listId: listId,
      name:   name,
      order:  (_items[listId] || []).length,
    };
    await DB.put('frequentItems', item);
    if (!_items[listId]) _items[listId] = [];
    _items[listId].push(item);
    input.value = '';

    const ul = document.getElementById(`freq-items-${listId}`);
    if (ul) {
      ul.innerHTML = _renderFreqItemsHtml(listId);
      _setupItemDragDrop(ul, listId);
      _setupItemSwipe(ul, listId);
    }
    const countEl = document.querySelector(`.frequent-list-card[data-list-id="${listId}"] .frequent-list-count`);
    if (countEl) {
      const n = _items[listId].length;
      countEl.textContent = `${n} item${n !== 1 ? 's' : ''}`;
    }
  }

  // ── Create list modal ─────────────────────────────────────

  function _openCreateList() {
    const overlay   = document.getElementById('modal-overlay');
    const modalCont = document.getElementById('modal-container');

    modalCont.innerHTML = `
      <div class="modal-header">
        <h2 class="modal-title">New Frequent List</h2>
        <button class="icon-btn" id="fl-close-btn" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <input class="new-list-name-input" id="fl-name-input" type="text"
          placeholder="e.g. Weekly Staples" aria-label="List name" />
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="fl-cancel-btn">Cancel</button>
        <button class="btn btn-primary" id="fl-create-btn">Create</button>
      </div>
    `;

    function close() {
      overlay.classList.add('hidden');
      document.removeEventListener('keydown', onKey);
      overlay.removeEventListener('click', onOverlay);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    function onOverlay(e) { if (e.target === overlay) close(); }

    document.getElementById('fl-close-btn').addEventListener('click', close);
    document.getElementById('fl-cancel-btn').addEventListener('click', close);
    document.getElementById('fl-create-btn').addEventListener('click', async () => {
      const name = document.getElementById('fl-name-input').value.trim();
      if (!name) { document.getElementById('fl-name-input').focus(); return; }
      close();
      const list = {
        id:        DB.uuid(),
        name:      name,
        order:     _lists.length,
        createdAt: new Date().toISOString(),
        _open:     true,
      };
      await DB.put('frequentLists', list);
      _lists.push(list);
      _items[list.id] = [];
      _render();
      Toast.show(`"${name}" created.`, 'success');
    });

    document.getElementById('fl-name-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('fl-create-btn').click();
    });

    overlay.addEventListener('click', onOverlay);
    document.addEventListener('keydown', onKey);
    overlay.classList.remove('hidden');
    requestAnimationFrame(() => document.getElementById('fl-name-input')?.focus());
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

  function escHtml(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { init };
})();
