// quoteTree.js — reply-threading. Each reply is indented under the reply
// it's most directly quoting (vichan-style), with a thin SVG spine/branch
// drawn behind the column so the relationship reads at a glance.
//
// A literal one-to-one port of vichan's tree view doesn't work here: our
// reading column is a single centered strip (not a full-width page), so
// on a big board like /v/ a thread with a mass-reply hub (one post quoted
// by 50+ replies) would either indent every one of those replies to
// oblivion or blow the spine out sideways past the column. Instead:
//   - indentation per depth level shrinks the deeper it goes, and is
//     capped outright past MAX_DEPTH, so nesting never runs away
//   - any post quoted by more than FAN_OUT_THRESHOLD later replies is
//     treated as a "hub": its children are kept at a shallow, fixed depth
//     instead of each nesting relative to it, which is what actually
//     breaks a literal tree layout on high-traffic threads

const BASE_X = 9; // x position of the main spine
const INDENT_STEP = 15; // px indent per depth level, before damping
const MAX_DEPTH = 5;
const FAN_OUT_THRESHOLD = 8; // replies quoting one post before it's treated as a hub
const HUB_CHILD_DEPTH = 1; // depth hub children are pinned to, regardless of real depth

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Work out, for every reply, which earlier reply (if any) it is most
 * directly responding to, and how deeply nested that makes it.
 */
export function computeRelations(op, replies) {
  const knownNos = new Set(replies.map((r) => r.no));
  const relations = new Map();
  const childCount = new Map(); // parentNo -> number of replies quoting it

  replies.forEach((reply) => {
    const refs = extractRefs(reply.com || '');
    const parentNo = refs.find((no) => no !== op.no && knownNos.has(no) && no < reply.no) ?? null;
    if (parentNo) childCount.set(parentNo, (childCount.get(parentNo) || 0) + 1);

    const parentDepth = parentNo ? relations.get(parentNo)?.depth ?? 0 : -1;
    let depth = parentNo ? Math.min(parentDepth + 1, MAX_DEPTH) : 0;

    relations.set(reply.no, { parentNo, depth, rawDepth: depth });
  });

  // Second pass: pin children of high fan-out "hub" posts to a shallow
  // fixed depth, so one heavily-quoted post can't nest dozens of replies.
  replies.forEach((reply) => {
    const rel = relations.get(reply.no);
    if (rel.parentNo && (childCount.get(rel.parentNo) || 0) > FAN_OUT_THRESHOLD) {
      const parentDepth = relations.get(rel.parentNo)?.depth ?? 0;
      relations.set(reply.no, { ...rel, depth: Math.min(parentDepth + HUB_CHILD_DEPTH, MAX_DEPTH), isHubChild: true });
    }
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

/** Indent px for a given depth, with damping past depth 3 so deep chains
 *  on wide boards stay readable inside a centered column. */
function indentForDepth(depth) {
  if (depth <= 0) return 0;
  const steep = Math.min(depth, 3);
  const damped = Math.max(0, depth - 3);
  return steep * INDENT_STEP + damped * (INDENT_STEP * 0.4);
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

    // Apply indentation to each reply regardless of SVG visibility — the
    // "Tree" legend toggle hides only the connector overlay via CSS
    // (body.hide-tree), while the indentation itself is controlled by the
    // same class so turning tree mode off returns to a flat column.
    items.forEach((item) => {
      const rel = relations.get(item.postNo);
      const depth = rel?.depth ?? 0;
      item.el.style.setProperty('--tree-indent', `${indentForDepth(depth)}px`);
      item.el.classList.toggle('reply--hub-child', !!rel?.isHubChild);
      item.el.dataset.depth = String(depth);
    });

    if (!items.length) return;

    svg.setAttribute('width', BASE_X + indentForDepth(MAX_DEPTH) + 16);
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
      const x1 = BASE_X + indentForDepth(parentDepth);
      const x2 = BASE_X + indentForDepth(rel.depth);

      const branch = curve(x1, parentY, x2, childY);
      if (rel.isHubChild) branch.classList.add('tree-line--hub');
      svg.appendChild(branch);
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
