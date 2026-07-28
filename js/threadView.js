// threadView.js — orchestrates the thread reader: fetches the thread,
// renders the OP panel and reply stream, then wires up the scroll-focus
// engine, quote tree, keyboard navigation, and position indicator.

import { getThread, getBoardTitle } from './api.js';
import { decodeEntities, renderComment, formatDateTime } from './utils.js';
import { createMediaElement } from './mediaLoader.js';
import { ScrollFocusController } from './scrollFocus.js';
import { computeRelations, QuoteTree } from './quoteTree.js';
import { createNavIndicator } from './navIndicator.js';
import { bindKeyboardNav } from './keyboardNav.js';
import { navigateToBoard } from './router.js';

const boardViewEl = document.getElementById('board-view');
const threadViewEl = document.getElementById('thread-view');
const opPanel = document.getElementById('op-panel');
const viewport = document.getElementById('reply-viewport');
const inner = document.getElementById('reply-inner');
const treeSvg = document.getElementById('quote-tree');
const indicatorRoot = document.getElementById('nav-indicator');

const navIndicator = createNavIndicator(indicatorRoot);

let activeController = null;
let unbindKeys = null;

export async function showThreadView(board, threadNo) {
  boardViewEl.hidden = true;
  threadViewEl.hidden = false;
  teardown();

  opPanel.innerHTML = '<p class="loading">Loading thread…</p>';
  clearReplyStream();

  try {
    const [thread, boardTitle] = await Promise.all([getThread(board, threadNo), getBoardTitle(board)]);
    const [op, ...replies] = thread.posts;

    renderOpPanel(op, board, boardTitle);
    const items = renderReplies(board, op, replies);
    setupInteractions(items);
  } catch (err) {
    opPanel.innerHTML = `
      <p class="error">Couldn't load this thread.</p>
      <button class="link-button" id="retry-thread">Try again</button>
    `;
    document.getElementById('retry-thread')?.addEventListener('click', () => showThreadView(board, threadNo));
    console.error(err);
  }
}

function renderOpPanel(op, board, boardTitle) {
  const { date, time } = formatDateTime(op.time);
  const subject = op.sub ? decodeEntities(op.sub) : '(no subject)';

  opPanel.innerHTML = '';

  const boardTag = document.createElement('button');
  boardTag.className = 'board-tag';
  boardTag.innerHTML = `<span>/${board}/</span><span class="board-tag__title"></span>`;
  boardTag.querySelector('.board-tag__title').textContent = boardTitle;
  boardTag.addEventListener('click', () => navigateToBoard(board));

  const opLabel = document.createElement('p');
  opLabel.className = 'op-label';
  opLabel.textContent = 'OP';

  const opSubject = document.createElement('h1');
  opSubject.className = 'op-subject';
  opSubject.textContent = subject;

  const opMeta = document.createElement('div');
  opMeta.className = 'op-meta';
  opMeta.innerHTML = `<span class="op-meta__date"></span><span class="op-meta__time"></span>`;
  opMeta.querySelector('.op-meta__date').textContent = date;
  opMeta.querySelector('.op-meta__time').textContent = time;

  const opComment = document.createElement('div');
  opComment.className = 'op-comment';
  opComment.appendChild(renderComment(op.com || ''));

  opPanel.append(boardTag, opLabel, opSubject, opMeta, opComment);
}

function clearReplyStream() {
  inner.querySelectorAll('.reply').forEach((el) => el.remove());
  treeSvg.innerHTML = '';
}

/** Renders every reply into the DOM and returns the items array for the scroll engine. */
function renderReplies(board, op, replies) {
  clearReplyStream();
  const relations = computeRelations(op, replies);
  const items = [];

  replies.forEach((reply) => {
    const article = document.createElement('article');
    article.className = 'reply';
    article.dataset.postNo = String(reply.no);

    const no = document.createElement('p');
    no.className = 'reply__no';
    no.textContent = String(reply.no);

    const body = document.createElement('div');
    body.className = 'reply__body';
    body.appendChild(renderComment(reply.com || ''));

    article.append(no, body);

    if (reply.tim) {
      article.appendChild(createMediaElement(board, reply));
    }

    inner.appendChild(article);
    items.push({ el: article, postNo: reply.no });
  });

  const tree = new QuoteTree({ svg: treeSvg, container: inner, items, relations });
  tree.render();

  return items;
}

function setupInteractions(items) {
  if (!items.length) {
    navIndicator.update(0, []);
    return;
  }

  activeController = new ScrollFocusController({
    viewport,
    inner,
    items,
    onFocusChange: (index) => navIndicator.update(index, items),
  });
  navIndicator.update(0, items);

  unbindKeys = bindKeyboardNav(activeController);
  inner.addEventListener('click', onInnerClick);
}

function onInnerClick(e) {
  const ref = e.target.closest('.post-ref');
  if (ref?.dataset.ref) {
    activeController?.focusPostNo(Number(ref.dataset.ref));
    return;
  }

  const spoiler = e.target.closest('s');
  if (spoiler) spoiler.classList.toggle('revealed');
}

function teardown() {
  activeController?.destroy();
  activeController = null;
  unbindKeys?.();
  unbindKeys = null;
  inner.removeEventListener('click', onInnerClick);
}

/** Called when navigating away to the board view, so nothing keeps running (or
 *  hijacking arrow/j/k keys) behind a hidden section. */
export function hideThreadView() {
  teardown();
}
