// keyboardNav.js — arrow keys and j/k step the focused reply, matching
// the muscle memory of vim-style readers and terminal pagers.

const NEXT_KEYS = new Set(['ArrowDown', 'j', 'J']);
const PREV_KEYS = new Set(['ArrowUp', 'k', 'K']);

/** Bind keyboard navigation to a ScrollFocusController. Returns an unbind function. */
export function bindKeyboardNav(controller) {
  function onKeyDown(e) {
    if (NEXT_KEYS.has(e.key)) {
      e.preventDefault();
      controller.next();
    } else if (PREV_KEYS.has(e.key)) {
      e.preventDefault();
      controller.prev();
    }
  }

  document.addEventListener('keydown', onKeyDown);
  return () => document.removeEventListener('keydown', onKeyDown);
}
