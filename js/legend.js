// legend.js — the sidebar legend. "Scroll" is purely explanatory; "Focus",
// "Tree", "Images", and "Dark mode" are real toggles. State is persisted
// via settings.js so it's still set the way the reader left it after a
// reload, and applied immediately on load (not just after a click).

import { icon } from './icons.js';
import { getSettings, setSetting } from './settings.js';
import { toggleTheme, isDark, onThemeChange } from './theme.js';
import { microPulse } from './motion.js';

const ICONS = { scroll: 'scroll', focus: 'eye', tree: 'tree', images: 'photo', dark: 'moon' };

export function initLegend(root) {
  if (!root) return;

  root.querySelectorAll('[data-icon]').forEach((span) => {
    span.innerHTML = icon(ICONS[span.dataset.icon] || span.dataset.icon, { size: 14 });
  });

  applyBodyClasses();

  root.querySelectorAll('[data-toggle]').forEach((button) => {
    if (button.disabled) return;
    const key = button.dataset.toggle;

    syncButton(button, key);

    button.addEventListener('click', () => {
      microPulse(button);
      if (key === 'dark') {
        toggleTheme();
        return;
      }
      setSetting(key, !getSettings()[key]);
    });
  });

  const onSettingChange = () => {
    root.querySelectorAll('[data-toggle]').forEach((button) => syncButton(button, button.dataset.toggle));
    applyBodyClasses();
  };

  import('./settings.js').then(({ onSettingsChange }) => onSettingsChange(onSettingChange));
  onThemeChange(() => syncButton(root.querySelector('[data-toggle="dark"]'), 'dark'));
}

function syncButton(button, key) {
  if (!button) return;
  const on = key === 'dark' ? isDark() : !!getSettings()[key];
  button.classList.toggle('is-active-off', !on);
}

function applyBodyClasses() {
  const s = getSettings();
  document.body.classList.toggle('hide-tree', !s.tree);
  document.body.classList.toggle('hide-images', !s.images);
  document.body.classList.toggle('hide-focus', !s.focus);
}
