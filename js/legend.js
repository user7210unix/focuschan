// legend.js — the small legend in the sidebar. "Scroll" and "Focus" are
// purely explanatory; "Tree" and "Images" are real toggles that hide the
// quote-tree overlay or attached media, for readers who want less on screen.

export function initLegend(root) {
  root.querySelectorAll('[data-toggle]').forEach((button) => {
    if (button.disabled) return;

    button.addEventListener('click', () => {
      const key = button.dataset.toggle;
      const isOff = button.classList.toggle('is-active-off');
      document.body.classList.toggle(`hide-${key}`, isOff);
    });
  });
}
