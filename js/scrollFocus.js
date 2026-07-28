// scrollFocus.js — the "camera focus" scrolling engine.
//
// Instead of native scrolling, this reads real DOM layout (offsetTop /
// offsetHeight, so it naturally handles replies of very different heights
// — a one-line reply vs. one with an attached image) and drives a single
// transform on the reply column. A target scroll position is nudged by
// wheel input; the current position eases toward it every frame, which is
// what produces the soft, camera-like deceleration. When input goes idle,
// the target snaps to whichever reply is nearest the viewport's center.

import { clamp, lerp, debounce } from './utils.js';

const SMOOTHING = 0.16; // how quickly "current" chases "target" each frame (0–1)
const SETTLE_DELAY = 140; // ms of wheel inactivity before snapping to a reply
const SHARP_DISTANCE = 1; // index-distance that stays fully in focus (gives exactly 3 sharp replies)
const FADE_RANGE = 2.2; // index-distance over which blur/opacity ramps in
const MAX_BLUR = 6; // px

export class ScrollFocusController {
  constructor({ viewport, inner, items, onFocusChange }) {
    this.viewport = viewport;
    this.inner = inner;
    this.items = items;
    this.onFocusChange = onFocusChange;

    this.current = 0;
    this.target = 0;
    this.focusIndex = 0;
    this.idleTimer = null;
    this.rafId = null;
    this.destroyed = false;

    this._onWheel = this._onWheel.bind(this);
    this._tick = this._tick.bind(this);
    this._remeasure = debounce(() => {
      this._measure();
      this._alignToIndex(this.focusIndex, false);
    }, 120);

    this.viewport.addEventListener('wheel', this._onWheel, { passive: false });

    // Re-measure whenever layout changes: window resize, an image finishing
    // load and growing taller, fonts swapping in, etc.
    this.resizeObserver = new ResizeObserver(this._remeasure);
    this.resizeObserver.observe(this.inner);
    this.resizeObserver.observe(this.viewport);

    this._measure();
    this._tick();
  }

  /** Read every reply's real vertical center from the live DOM. */
  _measure() {
    this.positions = this.items.map((item) => item.el.offsetTop + item.el.offsetHeight / 2);
    this.contentHeight = this.inner.offsetHeight;
  }

  _maxScroll() {
    return Math.max(0, this.contentHeight - this.viewport.clientHeight);
  }

  _onWheel(e) {
    e.preventDefault();
    this.target = clamp(this.target + e.deltaY, 0, this._maxScroll());
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this._settle(), SETTLE_DELAY);
  }

  /** Snap the target to whichever reply currently sits nearest the center. */
  _settle() {
    const centerY = this.target + this.viewport.clientHeight / 2;
    let nearest = 0;
    let nearestDist = Infinity;
    this.positions.forEach((pos, i) => {
      const dist = Math.abs(pos - centerY);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    this._alignToIndex(nearest);
  }

  _alignToIndex(index, notify = true) {
    index = clamp(index, 0, this.items.length - 1);
    const centerOffset = this.viewport.clientHeight / 2;
    this.target = clamp(this.positions[index] - centerOffset, 0, this._maxScroll());

    const changed = index !== this.focusIndex;
    this.focusIndex = index;
    if (notify && changed) {
      this.onFocusChange?.(index, this.items[index]);
    }
  }

  /** Continuous position between items, so blur/opacity change smoothly mid-scroll. */
  _fractionalIndexAt(y) {
    const pos = this.positions;
    if (y <= pos[0]) return 0;
    if (y >= pos[pos.length - 1]) return pos.length - 1;
    for (let i = 0; i < pos.length - 1; i++) {
      if (y >= pos[i] && y <= pos[i + 1]) {
        const span = pos[i + 1] - pos[i];
        return span ? i + (y - pos[i]) / span : i;
      }
    }
    return this.focusIndex;
  }

  _applyFocusEffects() {
    const centerY = this.current + this.viewport.clientHeight / 2;
    const fIndex = this._fractionalIndexAt(centerY);

    this.items.forEach((item, i) => {
      const dist = Math.abs(i - fIndex);
      let blur = 0;
      let opacity = 1;
      let scale = 1;

      if (dist > SHARP_DISTANCE) {
        const t = clamp((dist - SHARP_DISTANCE) / FADE_RANGE, 0, 1);
        blur = t * MAX_BLUR;
        opacity = 1 - t * 0.72;
        scale = 1 - t * 0.035;
      }

      item.el.style.filter = blur ? `blur(${blur.toFixed(2)}px)` : '';
      item.el.style.opacity = opacity.toFixed(3);
      item.el.style.transform = scale !== 1 ? `scale(${scale.toFixed(3)})` : '';
      item.el.style.pointerEvents = dist > SHARP_DISTANCE + FADE_RANGE ? 'none' : '';
    });
  }

  _tick() {
    if (this.destroyed) return;
    this.current = lerp(this.current, this.target, SMOOTHING);
    this.inner.style.transform = `translate3d(0, ${(-this.current).toFixed(2)}px, 0)`;
    this._applyFocusEffects();
    this.rafId = requestAnimationFrame(this._tick);
  }

  next() {
    this._alignToIndex(this.focusIndex + 1);
  }

  prev() {
    this._alignToIndex(this.focusIndex - 1);
  }

  focusPostNo(postNo) {
    const index = this.items.findIndex((item) => item.postNo === postNo);
    if (index >= 0) this._alignToIndex(index);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.rafId);
    clearTimeout(this.idleTimer);
    this.resizeObserver.disconnect();
    this.viewport.removeEventListener('wheel', this._onWheel);
  }
}
