// settings.js — small persisted-preferences store. Everything the reader
// toggles (dark mode, focus blur, tree, images, OP image quality) is saved
// to localStorage under one key so it survives a reload.

const STORAGE_KEY = 'chan-reader:settings';

const DEFAULTS = {
  darkMode: false,
  darkModeSet: true, // light is the default appearance, regardless of OS theme
  focus: true, // "focus" camera blur — on by default, it's the whole point of the reader
  tree: true,
  images: true,
  opImages: true, // OP image loaded full-resolution via proxy, not the pixelated thumb
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

let state = load();
const listeners = new Set();

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable (private mode, quota, etc) — settings just
    // won't persist across reloads, nothing else breaks.
  }
}

export function getSettings() {
  return state;
}

export function getSetting(key) {
  return state[key];
}

export function setSetting(key, value) {
  state = { ...state, [key]: value };
  save();
  listeners.forEach((fn) => fn(state, key));
}

export function onSettingsChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
