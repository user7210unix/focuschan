// pageMeta.js — keeps the tab title and favicon meaningful instead of a
// static "A Quiet Reader" the reader stops reading after day one: the board
// on the catalog view, the thread's actual subject/comment once inside one.

import { proxied } from './config.js';
import { decodeEntities, stripToText } from './utils.js';

const FAVICON_URL = proxied('https://s.4cdn.org/image/favicon.ico');

export function initFavicon() {
  let link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = FAVICON_URL;
}

export function setBoardTitle(board, boardTitle) {
  document.title = boardTitle ? `/${board}/ — ${boardTitle}` : `/${board}/`;
}

/** Prefer the OP's subject; fall back to a trimmed comment snippet, since
 *  many threads (especially on fast boards like /b/) never set one. */
export function setThreadTitle(board, op) {
  const subject = op.sub ? decodeEntities(op.sub).trim() : '';
  const snippet = subject || stripToText(op.com || '').slice(0, 70) || `Thread #${op.no}`;
  document.title = `/${board}/ — ${snippet}`;
}
