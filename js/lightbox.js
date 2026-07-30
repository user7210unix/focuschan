// lightbox.js — full, uncropped media on click. Reply attachments are
// framed at a fixed ratio (object-fit: cover) so the stream reads as a
// consistent column, which necessarily crops non-matching aspect ratios;
// this is how the reader gets back the full image — and the cinematic
// "unfolding" expand transition (see motion.js) is what makes that feel
// like a deliberate reveal instead of a jarring cut.

import { icon } from './icons.js';
import { animateExpand, animateCollapse } from './motion.js';

let root = null;
let backdrop = null;
let body = null;
let flight = null;
let currentSourceEl = null;
let closing = false;

export function initLightbox() {
  root = document.createElement('div');
  root.id = 'lightbox';
  root.className = 'lightbox';
  root.innerHTML = `
    <div class="lightbox__backdrop"></div>
    <div class="lightbox__flight" aria-hidden="true"></div>
    <button class="lightbox__close" aria-label="Close">${icon('close', { size: 20 })}</button>
    <div class="lightbox__body"></div>
  `;
  document.body.appendChild(root);

  backdrop = root.querySelector('.lightbox__backdrop');
  body = root.querySelector('.lightbox__body');
  flight = root.querySelector('.lightbox__flight');

  root.addEventListener('click', (e) => {
    if (e.target === backdrop || e.target.closest('.lightbox__close')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.classList.contains('is-open')) close();
  });
}

/** Fit `naturalW`x`naturalH` inside the viewport (minus margin), centered. */
function computeTargetRect(naturalW, naturalH) {
  const maxW = window.innerWidth * 0.92;
  const maxH = window.innerHeight * 0.92;
  const ratio = naturalW && naturalH ? naturalW / naturalH : 4 / 3;

  let width = maxW;
  let height = width / ratio;
  if (height > maxH) {
    height = maxH;
    width = height * ratio;
  }

  return {
    width,
    height,
    left: (window.innerWidth - width) / 2,
    top: (window.innerHeight - height) / 2,
  };
}

/** Open the lightbox for an image or video source. `sourceEl` (the clicked
 *  thumbnail figure) is optional — when present, the cinematic expand
 *  transition runs from its exact on-screen position. */
export function openLightbox({ src, isVideo = false, alt = '', sourceEl = null, thumbSrc = '', naturalWidth = 0, naturalHeight = 0 }) {
  body.innerHTML = '';
  closing = false;

  if (isVideo) {
    const video = document.createElement('video');
    video.src = src;
    video.controls = true;
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    body.appendChild(video);
  } else {
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    body.appendChild(img);
  }

  root.classList.add('is-open');
  currentSourceEl = sourceEl;

  const targetRect = computeTargetRect(naturalWidth, naturalHeight);
  body.style.width = `${targetRect.width}px`;
  body.style.height = `${targetRect.height}px`;
  body.style.left = `${targetRect.left}px`;
  body.style.top = `${targetRect.top}px`;

  if (sourceEl) {
    const sourceRect = sourceEl.getBoundingClientRect();
    flight.style.width = `${targetRect.width}px`;
    flight.style.height = `${targetRect.height}px`;
    flight.style.left = `${targetRect.left}px`;
    flight.style.top = `${targetRect.top}px`;
    flight.style.backgroundImage = thumbSrc ? `url("${thumbSrc}")` : '';
    flight.style.borderRadius = getComputedStyle(sourceEl).borderRadius;
    animateExpand({ flight, backdrop, revealTarget: body, sourceRect, targetRect });
  } else {
    flight.style.opacity = '0';
    backdrop.style.opacity = '1';
    body.style.opacity = '1';
  }
}

function close() {
  if (closing) return;
  closing = true;

  const targetRect = body.getBoundingClientRect();
  const sourceRect = currentSourceEl?.isConnected ? currentSourceEl.getBoundingClientRect() : null;

  const finish = () => {
    root.classList.remove('is-open');
    body.querySelector('video')?.pause();
    body.innerHTML = '';
    currentSourceEl = null;
    closing = false;
  };

  if (sourceRect) {
    flight.style.width = `${targetRect.width}px`;
    flight.style.height = `${targetRect.height}px`;
    flight.style.left = `${targetRect.left}px`;
    flight.style.top = `${targetRect.top}px`;
    flight.style.backgroundImage = getComputedStyle(currentSourceEl).backgroundImage;
    flight.style.borderRadius = getComputedStyle(currentSourceEl).borderRadius;
    animateCollapse({ flight, backdrop, revealTarget: body, sourceRect, targetRect }).then(finish);
  } else {
    backdrop.style.opacity = '0';
    body.style.opacity = '0';
    setTimeout(finish, 250);
  }
}
