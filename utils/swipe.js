/**
 * utils/swipe.js — Swipe-to-delete utility
 *
 * Usage:
 *   SwipeToDelete.attach(element, onDelete, options?)
 *   SwipeToDelete.detach(element)
 *
 * - Swipe left ≥ 80px reveals a red delete action behind the item.
 * - Swipe right or release < threshold cancels.
 * - Long-press (500ms) also triggers a trash-icon overlay (accessibility).
 */

const SwipeToDelete = (() => {
  const THRESHOLD = 80;       // px to reveal delete
  const LONG_PRESS_MS = 500;  // ms for long-press

  const _attached = new WeakMap();

  function attach(el, onDelete, options = {}) {
    if (_attached.has(el)) detach(el);

    // Create delete action element
    const action = document.createElement('div');
    action.className = 'item-delete-action';
    action.setAttribute('aria-label', 'Delete');
    action.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>`;
    el.appendChild(action);

    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let swiping = false;
    let revealed = false;
    let longPressTimer = null;

    function onTouchStart(e) {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      currentX = 0;
      swiping = false;
      revealed = false;

      // Long-press detection
      longPressTimer = setTimeout(() => {
        showLongPressTrash(el, onDelete);
      }, LONG_PRESS_MS);
    }

    function onTouchMove(e) {
      clearTimeout(longPressTimer);
      const touch = e.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      // Only activate if horizontal swipe dominates
      if (!swiping && Math.abs(dy) > Math.abs(dx)) return;

      if (dx < 0) {
        swiping = true;
        e.preventDefault();
        currentX = Math.max(dx, -140);
        el.style.transform = `translateX(${currentX}px)`;
        const revealAmount = Math.min(Math.abs(currentX), 80);
        action.style.transform = `translateX(${100 - (revealAmount / 80) * 100}%)`;
      } else if (swiping) {
        // Swiping back right — close
        currentX = Math.min(dx - THRESHOLD, 0);
        el.style.transform = `translateX(${currentX}px)`;
        const revealAmount = Math.max(0, Math.abs(currentX) - (THRESHOLD - 80));
        action.style.transform = `translateX(${100 - (revealAmount / 80) * 100}%)`;
      }
    }

    function onTouchEnd() {
      clearTimeout(longPressTimer);
      if (!swiping) return;

      if (Math.abs(currentX) >= THRESHOLD) {
        // Reveal delete button
        el.style.transform = `translateX(-80px)`;
        action.style.transform = `translateX(0%)`;
        revealed = true;
      } else {
        // Snap back
        reset();
      }
    }

    function onActionClick(e) {
      e.stopPropagation();
      if (revealed) {
        onDelete(el);
      }
    }

    function reset() {
      el.style.transition = `transform 200ms ease`;
      el.style.transform = `translateX(0)`;
      action.style.transform = `translateX(100%)`;
      revealed = false;
      setTimeout(() => { el.style.transition = ''; }, 200);
    }

    // Close on outside tap
    function onDocumentTap(e) {
      if (revealed && !el.contains(e.target)) {
        reset();
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove',  onTouchMove,  { passive: false });
    el.addEventListener('touchend',   onTouchEnd,   { passive: true });
    action.addEventListener('click',  onActionClick);
    document.addEventListener('touchstart', onDocumentTap, { passive: true });

    _attached.set(el, { action, onTouchStart, onTouchMove, onTouchEnd, onActionClick, onDocumentTap, reset });
  }

  function detach(el) {
    const state = _attached.get(el);
    if (!state) return;
    const { action, onTouchStart, onTouchMove, onTouchEnd, onActionClick, onDocumentTap } = state;
    el.removeEventListener('touchstart', onTouchStart);
    el.removeEventListener('touchmove',  onTouchMove);
    el.removeEventListener('touchend',   onTouchEnd);
    action.removeEventListener('click',  onActionClick);
    document.removeEventListener('touchstart', onDocumentTap);
    if (action.parentNode === el) el.removeChild(action);
    _attached.delete(el);
  }

  function resetAll(container) {
    if (!container) return;
    container.querySelectorAll('.list-item, .history-item').forEach((el) => {
      const state = _attached.get(el);
      if (state && state.reset) state.reset();
    });
  }

  /** Long-press: show a floating trash icon button */
  function showLongPressTrash(el, onDelete) {
    // Remove any existing
    const existing = el.querySelector('.long-press-trash');
    if (existing) existing.remove();

    const btn = document.createElement('button');
    btn.className = 'long-press-trash icon-btn';
    btn.setAttribute('aria-label', 'Delete item');
    btn.style.cssText = `
      position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
      color: var(--color-danger); background: var(--color-surface-2);
      border-radius: 8px; z-index: 10;
    `;
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>`;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      btn.remove();
      onDelete(el);
    });

    // Auto-hide after 3s
    setTimeout(() => { if (btn.parentNode) btn.remove(); }, 3000);

    el.appendChild(btn);
  }

  return { attach, detach, resetAll };
})();
