// config.js — every endpoint the app talks to, in one place.
//
// IMPORTANT: this app never contacts 4chan's domains directly. Every request
// (JSON, thumbnails, full images, video) is routed through the required proxy.

export const PROXY_BASE = 'https://chan-proxy.anonnousmes.workers.dev/?url=';
export const API_BASE = 'https://a.4cdn.org';
export const IMG_BASE = 'https://i.4cdn.org';

/** Wrap any 4chan URL so requests go through the proxy. */
export function proxied(url) {
  return `${PROXY_BASE}${encodeURIComponent(url)}`;
}
