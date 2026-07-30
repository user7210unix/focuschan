// boardAutocomplete.js — a small combobox behavior for the board-code
// input. Matches by board code or title, groups results by category, and
// supports arrow-key navigation. The dropdown's open/close animation is
// pure CSS (see board-view.css); this module only toggles a class.

import { getBoards } from './api.js';
import { categoryFor, CATEGORY_ORDER } from './boardCategories.js';

const MAX_RESULTS = 8;

export function createBoardAutocomplete({ input, panel, onSelect }) {
  const boardsPromise = getBoards();

  let renderedBoards = [];
  let activeIndex = -1;
  let open = false;

  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-autocomplete', 'list');
  panel.setAttribute('role', 'listbox');

  input.addEventListener('input', handleInput);
  input.addEventListener('focus', handleInput);
  input.addEventListener('keydown', handleKeydown);
  document.addEventListener('click', (e) => {
    if (e.target !== input && !panel.contains(e.target)) close();
  });

  async function handleInput() {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      close();
      return;
    }

    const boards = await boardsPromise.catch(() => []);
    // The reader may have kept typing while boards.json was loading —
    // bail out if this response is no longer for the current input value.
    if (input.value.trim().toLowerCase() !== query) return;

    const matches = filterBoards(boards, query).slice(0, MAX_RESULTS);
    activeIndex = -1;
    render(matches);
    matches.length ? openPanel() : close();
  }

  function handleKeydown(e) {
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, renderedBoards.length - 1);
      highlight();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      highlight();
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && renderedBoards[activeIndex]) {
        e.preventDefault();
        select(renderedBoards[activeIndex].board);
      } else {
        close(); // let the form submit normally with whatever was typed
      }
    } else if (e.key === 'Escape') {
      close();
    }
  }

  function render(matches) {
    panel.innerHTML = '';
    renderedBoards = [];

    const buckets = new Map();
    matches.forEach((board) => {
      const cat = categoryFor(board.board);
      if (!buckets.has(cat)) buckets.set(cat, []);
      buckets.get(cat).push(board);
    });

    CATEGORY_ORDER.forEach((category) => {
      const items = buckets.get(category);
      if (!items || !items.length) return;

      const heading = document.createElement('div');
      heading.className = 'board-suggestions__category';
      heading.textContent = category;
      panel.appendChild(heading);

      items.forEach((board) => {
        renderedBoards.push(board);
        const index = renderedBoards.length - 1;

        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'board-suggestions__item';
        row.dataset.index = String(index);
        row.setAttribute('role', 'option');
        row.innerHTML = `
          <span class="board-suggestions__code">/${board.board}/</span>
          <span class="board-suggestions__title"></span>
        `;
        row.querySelector('.board-suggestions__title').textContent = board.title;

        // mousedown (not click) fires before the input blurs, so we can
        // preventDefault and keep focus in the field for a snappier feel.
        row.addEventListener('mousedown', (e) => {
          e.preventDefault();
          select(board.board);
        });

        panel.appendChild(row);
      });
    });
  }

  function highlight() {
    panel.querySelectorAll('.board-suggestions__item').forEach((row) => {
      const isActive = Number(row.dataset.index) === activeIndex;
      row.classList.toggle('is-active', isActive);
      row.setAttribute('aria-selected', String(isActive));
    });
  }

  function select(boardCode) {
    input.value = boardCode;
    close();
    onSelect(boardCode);
  }

  function openPanel() {
    open = true;
    panel.classList.add('is-open');
    input.setAttribute('aria-expanded', 'true');
  }

  function close() {
    open = false;
    activeIndex = -1;
    panel.classList.remove('is-open');
    input.setAttribute('aria-expanded', 'false');
  }
}

function filterBoards(boards, query) {
  return boards
    .map((board) => ({ board, score: scoreMatch(board, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.board.board.localeCompare(b.board.board))
    .map((entry) => entry.board);
}

function scoreMatch(board, query) {
  const code = board.board.toLowerCase();
  const title = (board.title || '').toLowerCase();

  if (code === query) return 100;
  if (code.startsWith(query)) return 80;
  if (title.startsWith(query)) return 60;
  if (title.includes(query)) return 40;
  if (code.includes(query)) return 20;
  return 0;
}
