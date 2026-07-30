// embedViewer.js — a smart link preview: clicking a link in a comment
// (other than a YouTube link, which just opens normally — embedding video
// isn't the point here) slides a card in from the right, blurs the reading
// column behind it, and loads the page in a sandboxed iframe so the reader
// never fully leaves the thread. If a site refuses to be framed (many do,
// via X-Frame-Options/CSP — nothing a client-side app can override) the
// card falls back to a plain "open in a new tab" prompt instead of sitting
// there broken.

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com']);
const FRAME_LOAD_TIMEOUT = 4500;

let root = null;
let backdrop = null;
let panel = null;
let iframe = null;
let body = null;
let titleEl = null;
let hostEl = null;
let openTabLink = null;
let closeBtn = null;
let frameTimer = null;

export function initEmbedViewer() {
  root = document.createElement('div');
  root.id = 'embed-viewer';
  root.className = 'embed-viewer';
  root.innerHTML = `
    <div class="embed-viewer__backdrop"></div>
    <aside class="embed-viewer__panel" role="dialog" aria-label="Link preview">
      <header class="embed-viewer__header">
        <div class="embed-viewer__meta">
          <p class="embed-viewer__host"></p>
          <p class="embed-viewer__title">Loading…</p>
        </div>
        <div class="embed-viewer__actions">
          <a class="embed-viewer__open" target="_blank" rel="noopener noreferrer" title="Open in a new tab"></a>
          <button class="embed-viewer__close" title="Close" aria-label="Close preview"></button>
        </div>
      </header>
      <div class="embed-viewer__body"></div>
    </aside>
  `;
  document.body.appendChild(root);

  backdrop = root.querySelector('.embed-viewer__backdrop');
  panel = root.querySelector('.embed-viewer__panel');
  body = root.querySelector('.embed-viewer__body');
  titleEl = root.querySelector('.embed-viewer__title');
  hostEl = root.querySelector('.embed-viewer__host');
  openTabLink = root.querySelector('.embed-viewer__open');
  closeBtn = root.querySelector('.embed-viewer__close');

  import('./icons.js').then(({ icon }) => {
    openTabLink.innerHTML = icon('externalLink', { size: 15 });
    closeBtn.innerHTML = icon('close', { size: 16 });
  });

  backdrop.addEventListener('click', close);
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.classList.contains('is-open')) close();
  });

  // Delegate clicks on any ".ext-link" the app renders, anywhere.
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a.ext-link');
    if (!link) return;
    e.preventDefault();
    open(link.href);
  });
}

function open(href) {
  let url;
  try {
    url = new URL(href);
  } catch {
    return;
  }

  // YouTube: just open normally, no in-app embed.
  if (YOUTUBE_HOSTS.has(url.hostname)) {
    window.open(href, '_blank', 'noopener,noreferrer');
    return;
  }

  hostEl.textContent = url.hostname.replace(/^www\./, '');
  titleEl.textContent = 'Loading…';
  openTabLink.href = href;
  body.innerHTML = '<div class="embed-viewer__loading">Opening page…</div>';

  root.classList.add('is-open');

  clearTimeout(frameTimer);
  const frame = document.createElement('iframe');
  frame.className = 'embed-viewer__frame';
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms');
  frame.referrerPolicy = 'no-referrer';
  frame.title = url.hostname;

  let settled = false;
  frame.addEventListener('load', () => {
    settled = true;
    clearTimeout(frameTimer);
    titleEl.textContent = url.hostname.replace(/^www\./, '');
  });

  // Many sites block framing outright; that fails silently (no load event
  // fires, or it fires for an empty error document), so fall back after a
  // short timeout rather than leaving a blank panel.
  frameTimer = setTimeout(() => {
    if (settled) return;
    showBlockedFallback(href, url);
  }, FRAME_LOAD_TIMEOUT);

  frame.src = href;
  body.innerHTML = '';
  body.appendChild(frame);
  iframe = frame;
}

function showBlockedFallback(href, url) {
  titleEl.textContent = url.hostname.replace(/^www\./, '');
  body.innerHTML = `
    <div class="embed-viewer__blocked">
      <p>${url.hostname.replace(/^www\./, '')} can't be shown inline.</p>
      <a class="embed-viewer__blocked-link" href="${href}" target="_blank" rel="noopener noreferrer">Open the page in a new tab →</a>
    </div>
  `;
}

function close() {
  root.classList.remove('is-open');
  clearTimeout(frameTimer);
  setTimeout(() => {
    if (!root.classList.contains('is-open')) body.innerHTML = '';
  }, 320);
}
