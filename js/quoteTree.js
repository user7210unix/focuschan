// quoteTree.js — a subtle line-and-branch visualization of reply
// relationships, drawn as an SVG overlay in the left gutter of the
// reply stream. This replaces bare ">>123456" links with a glanceable
// shape instead of forcing the reader to hunt for the quoted post.

const BASE_X = 9; // x position of the main spine
const INDENT = 9; // extra x offset per nesting depth
const MAX_DEPTH = 4; // cap indentation so the tree stays subtle

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Work out, for every reply, which earlier reply (if any) it is most
 * directly responding to, and how deeply nested that makes it.
 */
export function computeRelations(op, replies) {
  const knownNos = new Set(replies.map((r) => r.no));
  const relations = new Map();

  replies.forEach((reply) => {
    const refs = extractRefs(reply.com || '');
    const parentNo = refs.find((no) => no !== op.no && knownNos.has(no) && no < reply.no) ?? null;
    const parentDepth = parentNo ? relations.get(parentNo)?.depth ?? 0 : -1;
    const depth = parentNo ? Math.min(parentDepth + 1, MAX_DEPTH) : 0;
    relations.set(reply.no, { parentNo, depth });
  });

  return relations;
}

function extractRefs(com) {
  // The literal text is HTML-escaped ("&gt;&gt;123456"), so read the
  // quotelink's href (e.g. "#p123456") instead of matching visible text.
  const template = document.createElement('template');
  template.innerHTML = com;
  return [...template.content.querySelectorAll('a.quotelink')]
    .map((a) => (a.getAttribute('href') || '').match(/(\d+)$/)?.[1])
    .filter(Boolean)
    .map(Number);
}

export class QuoteTree {
  constructor({ svg, container, items, relations }) {
    this.svg = svg;
    this.container = container;
    this.items = items;
    this.relations = relations;
  }

  render() {
    const { svg, container, items, relations } = this;
    svg.innerHTML = '';
    if (!items.length) return;

    svg.setAttribute('width', BASE_X + MAX_DEPTH * INDENT + 12);
    svg.setAttribute('height', container.offsetHeight);

    const centerOf = (el) => el.offsetTop + el.offsetHeight / 2;
    const indexByNo = new Map(items.map((item, i) => [item.postNo, i]));

    // The main spine: one soft line running the full height of the thread.
    const firstY = centerOf(items[0].el);
    const lastY = centerOf(items[items.length - 1].el);
    svg.appendChild(line(BASE_X, firstY, BASE_X, lastY, 'tree-line tree-line--spine'));

    // A gentle branch curve for every reply quoting something other than
    // a straight continuation of the main line.
    items.forEach((item) => {
      const rel = relations.get(item.postNo);
      if (!rel?.parentNo || rel.depth === 0) return;

      const parentIndex = indexByNo.get(rel.parentNo);
      if (parentIndex === undefined) return;

      const parentDepth = relations.get(rel.parentNo)?.depth ?? 0;
      const parentY = centerOf(items[parentIndex].el);
      const childY = centerOf(item.el);
      const x1 = BASE_X + parentDepth * INDENT;
      const x2 = BASE_X + rel.depth * INDENT;

      svg.appendChild(curve(x1, parentY, x2, childY));
    });
  }
}

function line(x1, y1, x2, y2, className) {
  const el = document.createElementNS(SVG_NS, 'line');
  el.setAttribute('x1', x1);
  el.setAttribute('y1', y1);
  el.setAttribute('x2', x2);
  el.setAttribute('y2', y2);
  el.setAttribute('class', className);
  return el;
}

function curve(x1, y1, x2, y2) {
  const midY = (y1 + y2) / 2;
  const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', d);
  path.setAttribute('class', 'tree-line tree-line--branch');
  path.setAttribute('fill', 'none');
  return path;
}
