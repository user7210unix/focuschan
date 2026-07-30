// threadView.js — orchestrates the thread reader: fetches the thread,
// renders the OP panel and reply stream, then wires up the scroll-focus
// engine, quote tree, keyboard navigation, and position indicator.

import { getThread, getBoardTitle } from './api.js';
import { decodeEntities, renderComment, formatDateTime } from './utils.js';
import { createMediaElement, createOpMediaElement, ensureMediaLoaded } from './mediaLoader.js';
import { ScrollFocusController } from './scrollFocus.js';
import { computeRelations, QuoteTree } from './quoteTree.js';
import { createNavIndicator } from './navIndicator.js';
import { bindKeyboardNav } from './keyboardNav.js';
import { navigateToBoard } from './router.js';
import { setThreadTitle } from './pageMeta.js';
import { resolveFlag } from './flags.js';
import { getSettings } from './settings.js';
import { revealPanel } from './motion.js';

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

    setThreadTitle(board, op);
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
  const subject = op.sub ? decodeEntities(op.sub) : '';

  opPanel.innerHTML = '';

  const boardTag = document.createElement('button');
  boardTag.className = 'board-tag';
  boardTag.innerHTML = `<span>/${board}/</span><span class="board-tag__title"></span>`;
  boardTag.querySelector('.board-tag__title').textContent = boardTitle;
  boardTag.addEventListener('click', () => navigateToBoard(board));

  const opScroll = document.createElement('div');
  opScroll.className = 'op-panel__scroll';

  const opLabel = document.createElement('p');
  opLabel.className = 'op-label';
  opLabel.appendChild(document.createTextNode('OP · No.' + op.no));
  appendFlag(opLabel, op, board);

  // Many threads (fast boards especially) never set a subject — rather than
  // showing a literal "(no subject)" placeholder, skip the heading entirely
  // and let the comment carry the panel on its own.
  const opSubject = subject ? document.createElement('h1') : null;
  if (opSubject) {
    opSubject.className = 'op-subject';
    opSubject.textContent = subject;
  }

  const opMeta = document.createElement('div');
  opMeta.className = 'op-meta';
  opMeta.innerHTML = `<span class="op-meta__date"></span><span class="op-meta__time"></span>`;
  opMeta.querySelector('.op-meta__date').textContent = date;
  opMeta.querySelector('.op-meta__time').textContent = time;

  const opComment = document.createElement('div');
  opComment.className = 'op-comment';
  if (!subject) opComment.classList.add('op-comment--standalone');
  opComment.appendChild(renderComment(op.com || ''));

  opScroll.append(opLabel, ...(opSubject ? [opSubject] : []), opMeta, opComment);

  if (op.tim && getSettings().opImages) {
    opScroll.appendChild(createOpMediaElement(board, op));
  }

  opPanel.append(boardTag, opScroll);
  revealPanel([boardTag, opLabel, opSubject, opMeta, opComment]);
}

/** Appends a small flag image after a label, when the post/board has one. */
function appendFlag(container, post, board) {
  const flag = resolveFlag(post, board);
  if (!flag) return;
  const img = document.createElement('img');
  img.className = 'post-flag';
  img.src = flag.url;
  img.alt = flag.alt;
  img.title = flag.alt;
  img.loading = 'lazy';
  container.appendChild(img);
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
    appendFlag(no, reply, board);

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
    onFocusChange: (index) => {
      navIndicator.update(index, items);
      ensureMediaLoaded(items, index);
    },
  });
  navIndicator.update(0, items);
  ensureMediaLoaded(items, 0);

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
