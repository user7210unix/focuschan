// boardView.js — the entry screen. Lets the reader pick a board and see
// its catalog as a quiet, text-first list rather than an image grid.

import { getCatalog, getBoards, getBoardTitle } from './api.js';
import { decodeEntities, stripToText } from './utils.js';
import { navigateToThread, navigateToBoard } from './router.js';
import { hideThreadView } from './threadView.js';
import { createBoardAutocomplete } from './boardAutocomplete.js';
import { setBoardTitle } from './pageMeta.js';
import { revealOnScroll } from './motion.js';

const boardViewEl = document.getElementById('board-view');
const threadViewEl = document.getElementById('thread-view');
const form = document.getElementById('board-form');
const input = document.getElementById('board-input');
const suggestionsPanel = document.getElementById('board-suggestions');
const titleEl = document.getElementById('board-view-title');
const listEl = document.getElementById('thread-list');

let formBound = false;

createBoardAutocomplete({
  input,
  panel: suggestionsPanel,
  onSelect: (board) => navigateToBoard(board),
});

export function showBoardView(board) {
  hideThreadView();
  threadViewEl.hidden = true;
  boardViewEl.hidden = false;
  input.value = board;

  // Warm the board list cache early so autocomplete feels instant once
  // the reader starts typing.
  getBoards().catch(() => {});

  if (!formBound) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = input.value.trim().replace(/\//g, '');
      if (value) navigateToBoard(value);
    });
    formBound = true;
  }

  loadCatalog(board);
}

async function loadCatalog(board) {
  listEl.innerHTML = '<p class="loading">Loading catalog…</p>';
  titleEl.textContent = `/${board}/`;

  try {
    const [pages, title] = await Promise.all([getCatalog(board), getBoardTitle(board)]);
    titleEl.textContent = title ? `/${board}/ — ${title}` : `/${board}/`;
    setBoardTitle(board, title);
    const threads = pages.flatMap((page) => page.threads);
    renderThreadList(board, threads);
  } catch (err) {
    listEl.innerHTML = `<p class="error">Couldn't load /${board}/. Check the board code and try again.</p>`;
    console.error(err);
  }
}

let disconnectReveal = () => {};

function renderThreadList(board, threads) {
  disconnectReveal();
  listEl.innerHTML = '';

  if (!threads.length) {
    listEl.innerHTML = '<p class="empty">No threads found.</p>';
    return;
  }

  threads.forEach((thread) => {
    const plainComment = stripToText(thread.com || '');
    const subject = thread.sub ? decodeEntities(thread.sub) : plainComment.slice(0, 80) || '(no subject)';

    const item = document.createElement('button');
    item.className = 'thread-row';
    item.innerHTML = `
      <span class="thread-row__subject">${escapeHtml(subject)}</span>
      <span class="thread-row__meta">${thread.replies} replies · ${thread.images} images</span>
      <span class="thread-row__snippet">${escapeHtml(plainComment.slice(0, 140))}</span>
    `;
    item.addEventListener('click', () => navigateToThread(board, thread.no));
    listEl.appendChild(item);
  });

  disconnectReveal = revealOnScroll(listEl.querySelectorAll('.thread-row'));
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
