// api.js — the only module that makes network requests.

import { API_BASE, IMG_BASE, proxied } from './config.js';

let boardsCache = null;

async function fetchJSON(url) {
  const res = await fetch(proxied(url));
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}): ${url}`);
  }
  return res.json();
}

/** Catalog for a board: an array of pages, each containing a `threads` list. */
export function getCatalog(board) {
  return fetchJSON(`${API_BASE}/${board}/catalog.json`);
}

/** Full thread data: `{ posts: [op, ...replies] }`. */
export function getThread(board, threadNo) {
  return fetchJSON(`${API_BASE}/${board}/thread/${threadNo}.json`);
}

/** The full board list, cached for the session. Used only for display labels. */
export async function getBoards() {
  if (!boardsCache) {
    const data = await fetchJSON(`${API_BASE}/boards.json`);
    boardsCache = data.boards;
  }
  return boardsCache;
}

/** Friendly title for a board code (e.g. "wg" -> "Wallpapers/General"), or '' if unknown. */
export async function getBoardTitle(board) {
  try {
    const boards = await getBoards();
    return boards.find((b) => b.board === board)?.title || '';
  } catch {
    return '';
  }
}

export function getThumbUrl(board, tim) {
  return proxied(`${IMG_BASE}/${board}/${tim}s.jpg`);
}

export function getFullMediaUrl(board, tim, ext) {
  return proxied(`${IMG_BASE}/${board}/${tim}${ext}`);
}
