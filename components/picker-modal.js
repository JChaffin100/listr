/**
 * components/picker-modal.js — Frequent-buy import picker modal
 *
 * Opens a bottom-sheet modal showing all frequent-buy lists with checkboxes.
 * Returns a Promise that resolves with an array of selected item names,
 * or null if cancelled.
 */

const PickerModal = (() => {
  /**
   * @param {Array} lists  — frequentLists records
   * @param {Array} items  — all frequentItems records
   * @returns {Promise<string[]|null>}
   */
  function open(lists, items) {
    return new Promise((resolve) => {
      const overlay   = document.getElementById('modal-overlay');
      const container = document.getElementById('modal-container');

      // Build items map: listId → items[]
      const byList = {};
      for (const list of lists) byList[list.id] = [];
      for (const item of items) {
        if (byList[item.listId]) byList[item.listId].push(item);
      }
      for (const id in byList) byList[id].sort((a, b) => a.order - b.order);

      // Track selected item ids
      const selected = new Set();

      function countSelected() {
        return selected.size;
      }

      function updateAddBtn() {
        const btn = container.querySelector('#picker-add-btn');
        if (!btn) return;
        const n = countSelected();
        btn.textContent = n === 0 ? 'Add Selected Items' : `Add ${n} Item${n !== 1 ? 's' : ''}`;
        btn.disabled = n === 0;
      }

      function isListAllSelected(listId) {
        return byList[listId].length > 0 && byList[listId].every((i) => selected.has(i.id));
      }

      function render() {
        const totalItems = items.length;
        const allSelected = totalItems > 0 && items.every((i) => selected.has(i.id));

        container.innerHTML = `
          <div class="modal-header">
            <h2 class="modal-title">Import from Frequent Lists</h2>
            <button class="icon-btn" id="picker-close-btn" aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="picker-global-controls">
              <button class="btn btn-secondary btn-sm" id="picker-select-all">
                ${allSelected ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            ${lists.length === 0 ? `
              <div class="empty-state">
                <div class="empty-state-icon">⭐</div>
                <div class="empty-state-title">No frequent lists yet</div>
                <div class="empty-state-subtitle">Add items to your frequent-buy lists first.</div>
              </div>
            ` : lists.sort((a, b) => a.order - b.order).map((list) => {
              const listItems = byList[list.id] || [];
              const allSel   = isListAllSelected(list.id);
              return `
                <div class="picker-section" data-list-id="${list.id}">
                  <div class="picker-section-header">
                    <span class="picker-section-name">${escHtml(list.name)}</span>
                    <div class="picker-section-toggle">
                      <span style="font-size:12px;color:var(--color-text-muted)">${listItems.length} item${listItems.length !== 1 ? 's' : ''}</span>
                      <button class="btn btn-ghost btn-sm picker-list-toggle" data-list-id="${list.id}">
                        ${allSel ? 'Deselect' : 'Select'} All
                      </button>
                    </div>
                  </div>
                  ${listItems.length === 0 ? `
                    <div style="padding:12px 16px;font-size:13px;color:var(--color-text-muted)">No items in this list.</div>
                  ` : listItems.map((item) => `
                    <div class="picker-item" data-item-id="${item.id}">
                      <div class="picker-checkbox ${selected.has(item.id) ? 'checked' : ''}" aria-hidden="true"></div>
                      <span>${escHtml(item.name)}</span>
                    </div>
                  `).join('')}
                </div>
              `;
            }).join('')}
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="picker-cancel-btn">Cancel</button>
            <button class="btn btn-primary" id="picker-add-btn" ${countSelected() === 0 ? 'disabled' : ''}>
              ${countSelected() === 0 ? 'Add Selected Items' : `Add ${countSelected()} Item${countSelected() !== 1 ? 's' : ''}`}
            </button>
          </div>
        `;

        bindEvents();
      }

      function bindEvents() {
        container.querySelector('#picker-close-btn').addEventListener('click', cancel);
        container.querySelector('#picker-cancel-btn').addEventListener('click', cancel);
        container.querySelector('#picker-add-btn').addEventListener('click', confirm);

        // Global select/deselect all
        container.querySelector('#picker-select-all').addEventListener('click', () => {
          const allSelected = items.length > 0 && items.every((i) => selected.has(i.id));
          if (allSelected) {
            items.forEach((i) => selected.delete(i.id));
          } else {
            items.forEach((i) => selected.add(i.id));
          }
          render();
        });

        // Per-list select/deselect
        container.querySelectorAll('.picker-list-toggle').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const listId    = btn.dataset.listId;
            const listItems = byList[listId] || [];
            const allSel    = isListAllSelected(listId);
            if (allSel) {
              listItems.forEach((i) => selected.delete(i.id));
            } else {
              listItems.forEach((i) => selected.add(i.id));
            }
            render();
          });
        });

        // Individual item checkboxes
        container.querySelectorAll('.picker-item').forEach((row) => {
          row.addEventListener('click', () => {
            const id = row.dataset.itemId;
            if (selected.has(id)) {
              selected.delete(id);
            } else {
              selected.add(id);
            }
            const checkbox = row.querySelector('.picker-checkbox');
            checkbox.classList.toggle('checked', selected.has(id));
            updateAddBtn();
            // Refresh global button text
            const total = items.length;
            const allSel = total > 0 && items.every((i) => selected.has(i.id));
            const globalBtn = container.querySelector('#picker-select-all');
            if (globalBtn) globalBtn.textContent = allSel ? 'Deselect All' : 'Select All';
            // Refresh per-list toggle text
            const parentSection = row.closest('.picker-section');
            if (parentSection) {
              const listId  = parentSection.dataset.listId;
              const listToggle = parentSection.querySelector('.picker-list-toggle');
              if (listToggle) {
                listToggle.textContent = isListAllSelected(listId) ? 'Deselect All' : 'Select All';
              }
            }
          });
        });
      }

      function cancel() {
        close();
        resolve(null);
      }

      function confirm() {
        const names = items.filter((i) => selected.has(i.id)).map((i) => i.name);
        close();
        resolve(names);
      }

      function close() {
        overlay.classList.add('hidden');
        overlay.removeEventListener('click', onOverlayClick);
        document.removeEventListener('keydown', onKeyDown);
      }

      function onOverlayClick(e) {
        if (e.target === overlay) cancel();
      }

      function onKeyDown(e) {
        if (e.key === 'Escape') cancel();
      }

      overlay.classList.remove('hidden');
      overlay.addEventListener('click', onOverlayClick);
      document.addEventListener('keydown', onKeyDown);

      render();

      // Focus first interactive element
      requestAnimationFrame(() => {
        const first = container.querySelector('button');
        if (first) first.focus();
      });
    });
  }

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { open };
})();
