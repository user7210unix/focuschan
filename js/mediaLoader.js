// mediaLoader.js — builds the media element (image, gif, or video) that
// appears below a reply which posted an attachment. Every attachment is
// shown at full resolution immediately, inside a fixed-ratio frame so
// images of wildly different source dimensions still read as a
// consistent, editorial-feeling grid rather than a jumble of sizes.

import { getThumbUrl, getFullMediaUrl } from './api.js';

const VIDEO_EXTS = new Set(['.webm', '.mp4']);

export function createMediaElement(board, post) {
  const figure = document.createElement('figure');
  figure.className = 'reply__media';

  if (VIDEO_EXTS.has(post.ext)) {
    const video = document.createElement('video');
    video.className = 'reply__media-video';
    video.src = getFullMediaUrl(board, post.tim, post.ext);
    video.poster = getThumbUrl(board, post.tim);
    video.controls = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    figure.appendChild(video);
    return figure;
  }

  // Images and GIFs: load full resolution straight away, framed at a
  // consistent ratio via object-fit so every attachment reads the same size.
  const img = document.createElement('img');
  img.className = 'reply__media-img';
  img.loading = 'lazy';
  img.alt = post.filename ? `${post.filename}${post.ext}` : 'attachment';
  img.src = getFullMediaUrl(board, post.tim, post.ext);

  figure.appendChild(img);
  return figure;
}

