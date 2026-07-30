// router.js — tiny hash router. No history API needed for a static site.
//
// URL shapes:
//   #/<board>              -> catalog view for that board
//   #/<board>/<threadNo>   -> thread reader view

import { showBoardView } from './boardView.js';
import { showThreadView } from './threadView.js';

const DEFAULT_BOARD = 'wg';

export function initRouter() {
  window.addEventListener('hashchange', route);
  route();
}

export function navigateToThread(board, threadNo) {
  window.location.hash = `/${board}/${threadNo}`;
}

export function navigateToBoard(board) {
  window.location.hash = `/${board}`;
}

function parseHash() {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const [board, threadNo] = hash.split('/').filter(Boolean);
  return { board: board || DEFAULT_BOARD, threadNo: threadNo || null };
}

function route() {
  const { board, threadNo } = parseHash();
  if (threadNo) {
    showThreadView(board, threadNo);
  } else {
    showBoardView(board);
  }
}
