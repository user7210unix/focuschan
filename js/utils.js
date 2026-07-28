// utils.js — small, dependency-free helpers used across the app.

const ALLOWED_TAGS = new Set(['BR', 'SPAN', 'S', 'EM', 'STRONG', 'B', 'I', 'WBR']);

/** Decode HTML entities in a plain-text field (subject, name, etc). */
export function decodeEntities(str = '') {
  const el = document.createElement('textarea');
  el.innerHTML = str;
  return el.value;
}

/** Strip all markup from a raw 4chan comment, returning plain readable text. */
export function stripToText(html = '') {
  const div = document.createElement('div');
  div.innerHTML = html.replace(/<br\s*\/?>/gi, ' ');
  return (div.textContent || '').trim();
}

/**
 * Turn a raw 4chan comment (HTML) into a sanitized DOM fragment.
 * Only a small whitelist of formatting tags survives. Quote links
 * (">>123456") become inert `<span class="post-ref">` markers so the
 * thread view can wire up click-to-focus navigation without exposing
 * any live links or scripts from the source markup.
 */
export function renderComment(html = '') {
  const template = document.createElement('template');
  template.innerHTML = html;
  sanitize(template.content);
  return template.content;
}

function sanitize(root) {
  [...root.childNodes].forEach((node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName;

    // Quote links (>>123456) become plain, inert reference markers.
    if (tag === 'A' && node.classList.contains('quotelink')) {
      const ref = (node.getAttribute('href') || '').match(/(\d+)$/)?.[1] || '';
      const span = document.createElement('span');
      span.className = 'post-ref';
      span.dataset.ref = ref;
      span.textContent = node.textContent;
      node.replaceWith(span);
      return;
    }

    // Anything not on the whitelist is unwrapped to plain text.
    if (!ALLOWED_TAGS.has(tag)) {
      node.replaceWith(document.createTextNode(node.textContent || ''));
      return;
    }

    // Keep greentext styling, but strip every other attribute for safety.
    const isGreentext = tag === 'SPAN' && node.classList.contains('quote');
    [...node.attributes].forEach((attr) => node.removeAttribute(attr.name));
    if (isGreentext) node.classList.add('greentext');

    sanitize(node);
  });
}

/** Format a 4chan unix timestamp into separate date / time strings. */
export function formatDateTime(unixSeconds) {
  const d = new Date(unixSeconds * 1000);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return { date, time };
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
