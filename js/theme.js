// theme.js — applies light/dark theme to <html data-theme="...">.
// Light is the default appearance regardless of OS preference; once the
// reader explicitly toggles dark mode, that choice is saved and wins from
// then on (including across reloads).

import { getSettings, setSetting, onSettingsChange } from './settings.js';

const media = window.matchMedia('(prefers-color-scheme: dark)');
const themeListeners = new Set();

function notify() {
  themeListeners.forEach((fn) => fn(isDark()));
}

export function onThemeChange(fn) {
  themeListeners.add(fn);
  return () => themeListeners.delete(fn);
}

function apply() {
  const { darkMode, darkModeSet } = getSettings();
  const dark = darkModeSet ? darkMode : media.matches;
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  notify();
}

export function initTheme() {
  apply();
  media.addEventListener('change', () => {
    if (!getSettings().darkModeSet) apply();
  });
  onSettingsChange((_, key) => {
    if (key === 'darkMode') apply();
  });
}

export function toggleTheme() {
  const current = getSettings().darkModeSet ? getSettings().darkMode : media.matches;
  setSetting('darkModeSet', true);
  setSetting('darkMode', !current);
}

export function isDark() {
  const { darkMode, darkModeSet } = getSettings();
  return darkModeSet ? darkMode : media.matches;
}
