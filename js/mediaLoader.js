// mediaLoader.js — builds the media element (image, gif, or video) that
// appears below a reply which posted an attachment. Every attachment is
// shown at full resolution, inside a fixed-ratio frame so images of wildly
// different source dimensions still read as a consistent, editorial-feeling
// grid rather than a jumble of sizes. Click any attachment to expand it
// uncropped in the lightbox.
//
// Loading is windowed rather than relying on the browser's native
// `loading="lazy"`: the reply stream doesn't use real document scrolling
// (scrollFocus.js drives a single CSS transform instead), which the
// browser's native lazy-load heuristics don't track reliably — replies
// could sit "in view" after a camera move without their images ever
// loading. Instead, `ensureMediaLoaded` is called on every focus change and
// swaps in real `src` only for attachments within a small radius of the
// focused reply; everything else stays an unloaded placeholder until it's
// scrolled near.

import { getThumbUrl, getFullMediaUrl } from './api.js';
import { openLightbox } from './lightbox.js';

const VIDEO_EXTS = new Set(['.webm', '.mp4']);
const LOAD_RADIUS = 6; // replies on either side of focus that stay loaded

export function createMediaElement(board, post) {
  const isVideo = VIDEO_EXTS.has(post.ext);
  const fullUrl = getFullMediaUrl(board, post.tim, post.ext);
  const thumbUrl = getThumbUrl(board, post.tim);

  const figure = document.createElement('figure');
  figure.className = 'reply__media';
  figure.dataset.full = fullUrl;
  figure.dataset.video = isVideo ? '1' : '';
  figure.dataset.loaded = '';
  figure.style.backgroundImage = `url("${thumbUrl}")`;
  figure.title = 'Click to expand';

  const alt = post.filename ? `${post.filename}${post.ext}` : 'attachment';
  figure.dataset.alt = alt;

  figure.addEventListener('click', () => {
    openLightbox({
      src: figure.dataset.full,
      isVideo,
      alt,
      sourceEl: figure,
      thumbSrc: thumbUrl,
      naturalWidth: post.w,
      naturalHeight: post.h,
    });
  });

  return figure;
}

/** Build the OP's attachment, same treatment, sized for the sidebar. */
export function createOpMediaElement(board, post) {
  const el = createMediaElement(board, post);
  el.classList.add('op-panel__media');
  loadMediaElement(el);
  return el;
}

function loadMediaElement(figure) {
  if (figure.dataset.loaded === '1') return;
  figure.dataset.loaded = '1';

  if (figure.dataset.video) {
    const video = document.createElement('video');
    video.className = 'reply__media-video';
    video.src = figure.dataset.full;
    video.controls = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    figure.appendChild(video);
    return;
  }

  const img = document.createElement('img');
  img.className = 'reply__media-img';
  img.alt = figure.dataset.alt;
  img.src = figure.dataset.full;
  img.addEventListener('load', () => figure.classList.add('is-loaded'));
  figure.appendChild(img);
}

/** Load full media for every reply within LOAD_RADIUS of the focused index. */
export function ensureMediaLoaded(items, focusIndex) {
  const start = Math.max(0, focusIndex - LOAD_RADIUS);
  const end = Math.min(items.length - 1, focusIndex + LOAD_RADIUS);
  for (let i = start; i <= end; i++) {
    const figure = items[i].el.querySelector('.reply__media');
    if (figure) loadMediaElement(figure);
  }
}
