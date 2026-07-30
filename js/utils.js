// utils.js — small, dependency-free helpers used across the app.

const ALLOWED_TAGS = new Set(['BR', 'SPAN', 'S', 'EM', 'STRONG', 'B', 'I', 'WBR', 'A']);

// Matches bare "http(s)://..." runs so they can be turned into real links —
// 4chan doesn't linkify plain-text URLs itself outside of quotelinks.
const URL_PATTERN = /\bhttps?:\/\/[^\s<>"']+[^\s<>"'.,!?)\]]/g;

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
  linkify(template.content);
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

    // A real (non-quotelink) anchor: 4chan occasionally wraps links itself.
    // Keep only a sanitized href, drop everything else, and mark it so the
    // embed viewer can intercept clicks.
    if (tag === 'A') {
      const href = safeHref(node.getAttribute('href'));
      if (!href) {
        node.replaceWith(document.createTextNode(node.textContent || ''));
        return;
      }
      const text = node.textContent || href;
      [...node.attributes].forEach((attr) => node.removeAttribute(attr.name));
      node.setAttribute('href', href);
      node.setAttribute('rel', 'noopener noreferrer');
      node.className = 'ext-link';
      node.textContent = text;
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

/** Only allow http(s) links through — blocks javascript:, data:, etc. */
function safeHref(href) {
  if (!href) return null;
  try {
    const url = new URL(href, window.location.href);
    return /^https?:$/.test(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

/** Turn bare "http(s)://..." text runs into clickable, sanitized <a> tags. */
function linkify(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (node.parentElement?.closest('a')) return NodeFilter.FILTER_REJECT;
      return URL_PATTERN.test(node.textContent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });

  const targets = [];
  let node;
  while ((node = walker.nextNode())) targets.push(node);

  targets.forEach((textNode) => {
    const text = textNode.textContent;
    URL_PATTERN.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let lastIndex = 0;
    let match;

    while ((match = URL_PATTERN.exec(text))) {
      if (match.index > lastIndex) frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      const href = safeHref(match[0]);
      if (href) {
        const a = document.createElement('a');
        a.href = href;
        a.rel = 'noopener noreferrer';
        a.className = 'ext-link';
        a.textContent = match[0];
        frag.appendChild(a);
      } else {
        frag.appendChild(document.createTextNode(match[0]));
      }
      lastIndex = match.index + match[0].length;
    }
    frag.appendChild(document.createTextNode(text.slice(lastIndex)));
    textNode.replaceWith(frag);
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
