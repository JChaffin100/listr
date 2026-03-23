/**
 * utils/drag-drop.js — Drag-and-drop with touch polyfill
 *
 * Usage:
 *   DragDrop.enable(containerEl, options)
 *     options.itemSelector  — CSS selector for draggable items (default '.list-item')
 *     options.handleSelector — CSS selector for drag handle (default '.drag-handle')
 *     options.onReorder(fromIndex, toIndex) — called after a successful drop
 *
 *   DragDrop.disable(containerEl)
 */

const DragDrop = (() => {
  const _state = new WeakMap();

  function enable(container, options = {}) {
    if (_state.has(container)) disable(container);

    const {
      itemSelector   = '.list-item',
      handleSelector = '.drag-handle',
      onReorder      = () => {},
    } = options;

    let dragEl   = null;   // the element being dragged
    let ghostEl  = null;   // visual ghost clone
    let placeholder = null; // position marker
    let startY   = 0;
    let startScrollY = 0;
    let offsetY  = 0;

    // ── Touch drag ───────────────────────────────────────────

    function getItem(el) {
      return el.closest(itemSelector);
    }

    function getItems() {
      return Array.from(container.querySelectorAll(itemSelector));
    }

    function indexOfEl(el) {
      return getItems().indexOf(el);
    }

    function onHandleTouchStart(e) {
      const handle = e.target.closest(handleSelector);
      if (!handle) return;
      dragEl = getItem(handle);
      if (!dragEl) return;

      e.preventDefault();

      const touch = e.touches[0];
      const rect  = dragEl.getBoundingClientRect();
      startY       = touch.clientY;
      startScrollY = container.scrollTop;
      offsetY      = touch.clientY - rect.top;

      // Create placeholder
      placeholder = document.createElement('div');
      placeholder.style.cssText = `
        height: ${rect.height}px;
        background: var(--color-surface-2);
        border: 2px dashed var(--color-primary);
        border-radius: 8px;
        margin: 0;
        box-sizing: border-box;
        transition: height 150ms ease;
      `;
      dragEl.parentNode.insertBefore(placeholder, dragEl.nextSibling);

      // Create ghost
      ghostEl = dragEl.cloneNode(true);
      ghostEl.style.cssText = `
        position: fixed;
        left: ${rect.left}px;
        top: ${rect.top}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        opacity: 0.85;
        pointer-events: none;
        z-index: 1000;
        box-shadow: 0 8px 24px rgba(0,0,0,0.18);
        border-radius: 8px;
        background: var(--color-surface);
        transition: box-shadow 150ms ease;
      `;
      document.body.appendChild(ghostEl);

      dragEl.classList.add('dragging');
      dragEl.style.opacity = '0';
    }

    function onTouchMove(e) {
      if (!dragEl) return;
      e.preventDefault();

      const touch = e.touches[0];
      const dy    = touch.clientY - startY;
      const containerRect = container.getBoundingClientRect();

      // Move ghost
      const origRect = dragEl.getBoundingClientRect();
      ghostEl.style.top = `${origRect.top + dy + (container.scrollTop - startScrollY)}px`;

      // Find where placeholder should go
      const ghostCenterY = touch.clientY;
      const items = getItems().filter((el) => el !== dragEl);

      let targetBefore = null;
      for (const item of items) {
        const r = item.getBoundingClientRect();
        if (ghostCenterY < r.top + r.height / 2) {
          targetBefore = item;
          break;
        }
      }

      if (targetBefore) {
        container.insertBefore(placeholder, targetBefore);
      } else {
        container.appendChild(placeholder);
      }

      // Auto-scroll
      const SCROLL_ZONE = 80;
      const scrollSpeed = 6;
      if (touch.clientY < containerRect.top + SCROLL_ZONE) {
        container.scrollTop -= scrollSpeed;
      } else if (touch.clientY > containerRect.bottom - SCROLL_ZONE) {
        container.scrollTop += scrollSpeed;
      }
    }

    function onTouchEnd() {
      if (!dragEl) return;

      // Determine new index
      const items = getItems();
      const placeholderIndex = Array.from(container.children).indexOf(placeholder);
      const fromIndex = indexOfEl(dragEl);

      // Reinsert dragEl at placeholder position
      container.insertBefore(dragEl, placeholder);
      placeholder.remove();
      ghostEl.remove();

      dragEl.classList.remove('dragging');
      dragEl.style.opacity = '';

      const toIndex = indexOfEl(dragEl);
      if (fromIndex !== toIndex) {
        onReorder(fromIndex, toIndex);
      }

      dragEl   = null;
      ghostEl  = null;
      placeholder = null;
    }

    // ── Mouse drag (desktop) ─────────────────────────────────

    function onMouseDown(e) {
      const handle = e.target.closest(handleSelector);
      if (!handle) return;
      dragEl = getItem(handle);
      if (!dragEl) return;

      e.preventDefault();
      dragEl.setAttribute('draggable', 'true');
    }

    function onDragStart(e) {
      if (!dragEl) return;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', '');
      setTimeout(() => { dragEl.classList.add('dragging'); }, 0);
    }

    function onDragOver(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      const target = e.target.closest(itemSelector);
      if (!target || target === dragEl) return;

      const items = getItems();
      const dragIndex   = items.indexOf(dragEl);
      const targetIndex = items.indexOf(target);

      items.forEach((el) => el.classList.remove('drag-over'));
      target.classList.add('drag-over');

      if (dragIndex < targetIndex) {
        container.insertBefore(dragEl, target.nextSibling);
      } else {
        container.insertBefore(dragEl, target);
      }
    }

    function onDragEnd() {
      if (!dragEl) return;
      dragEl.classList.remove('dragging');
      dragEl.removeAttribute('draggable');
      container.querySelectorAll(itemSelector).forEach((el) => el.classList.remove('drag-over'));

      const items = getItems();
      // We need original vs new — use data attribute set on dragStart
      const fromIndex = parseInt(dragEl.dataset.dragOriginIndex || '0', 10);
      const toIndex   = items.indexOf(dragEl);
      if (fromIndex !== toIndex) onReorder(fromIndex, toIndex);
      dragEl = null;
    }

    function onMouseDownRecord(e) {
      const handle = e.target.closest(handleSelector);
      if (!handle) return;
      const item = getItem(handle);
      if (item) {
        const items = getItems();
        item.dataset.dragOriginIndex = String(items.indexOf(item));
      }
    }

    // Attach listeners
    container.addEventListener('touchstart',  onHandleTouchStart, { passive: false });
    container.addEventListener('touchmove',   onTouchMove,        { passive: false });
    container.addEventListener('touchend',    onTouchEnd,         { passive: true });
    container.addEventListener('mousedown',   onMouseDownRecord,  { passive: true });
    container.addEventListener('mousedown',   onMouseDown,        { passive: false });
    container.addEventListener('dragstart',   onDragStart);
    container.addEventListener('dragover',    onDragOver);
    container.addEventListener('dragend',     onDragEnd);

    _state.set(container, {
      onHandleTouchStart, onTouchMove, onTouchEnd,
      onMouseDownRecord, onMouseDown, onDragStart, onDragOver, onDragEnd,
    });
  }

  function disable(container) {
    const s = _state.get(container);
    if (!s) return;
    container.removeEventListener('touchstart', s.onHandleTouchStart);
    container.removeEventListener('touchmove',  s.onTouchMove);
    container.removeEventListener('touchend',   s.onTouchEnd);
    container.removeEventListener('mousedown',  s.onMouseDownRecord);
    container.removeEventListener('mousedown',  s.onMouseDown);
    container.removeEventListener('dragstart',  s.onDragStart);
    container.removeEventListener('dragover',   s.onDragOver);
    container.removeEventListener('dragend',    s.onDragEnd);
    _state.delete(container);
  }

  return { enable, disable };
})();
