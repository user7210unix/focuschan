// motion.js — the site's motion system. Built on GSAP (vendored locally,
// loaded as classic scripts before this module — see index.html), exposed
// on `window.gsap` / `window.Flip`.
//
// Everything here follows the same rules:
//   - animate transform/opacity/filter only — never layout properties
//     (width/height/top/left get set once, not tweened, so the browser
//     never has to reflow mid-animation)
//   - respect prefers-reduced-motion by collapsing to an instant/simple
//     state instead of skipping feedback entirely
//   - small UI (buttons, toggles) moves fast and snappy; large surfaces
//     (the lightbox, panels) move slower and heavier

const gsap = window.gsap;
const Flip = window.Flip;

const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

export function prefersReducedMotion() {
  return reduceMotionQuery.matches;
}

/** A quick, snappy press-feedback pulse for small interactive UI. */
export function microPulse(el) {
  if (!gsap || prefersReducedMotion()) return;
  gsap.fromTo(
    el,
    { scale: 0.9 },
    { scale: 1, duration: 0.32, ease: 'back.out(2.4)' },
  );
}

/**
 * Staggered, blurred "soft reveal" for a set of elements as they enter the
 * viewport — used for the board's thread list and the reply stream's
 * initial paint. Deliberately restrained: short travel distance, a touch
 * of blur that clears quickly, gentle non-mechanical stagger.
 */
export function revealOnScroll(elements, { rootMargin = '0px 0px -8% 0px' } = {}) {
  const items = [...elements];
  if (!items.length) return () => {};

  if (!gsap || prefersReducedMotion()) {
    items.forEach((el) => el.classList.add('is-revealed'));
    return () => {};
  }

  gsap.set(items, { opacity: 0, y: 16, filter: 'blur(7px)' });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        // A tiny randomized offset per item keeps a batch of simultaneous
        // reveals (e.g. scrolling fast) from feeling like one mechanical
        // wave — closer to how attention actually lands on things.
        const jitter = Math.random() * 0.1;
        gsap.to(entry.target, {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.62,
          delay: jitter,
          ease: 'power2.out',
        });
      });
    },
    { rootMargin, threshold: 0.05 },
  );

  items.forEach((el) => observer.observe(el));
  return () => observer.disconnect();
}

/**
 * The core "unfolding" image-expand transition: a thumbnail becomes the
 * fullscreen lightbox view. Two phases, matching the target motion:
 *   1. a short burst where the box grows from a top-anchored origin — the
 *      bottom edge visibly leads, the top stays put a beat longer
 *      (blur ramps up here — motion blur for the acceleration)
 *   2. the origin recenters and the box eases the rest of the way to its
 *      target position/scale, with a very small skew/rotateX "flex" that
 *      settles out, a hair of overshoot, then rest (blur clears here)
 *
 * Pure transform + opacity + filter — width/height/position are set once
 * up front, never animated, so there's no layout thrash.
 */
export function animateExpand({ flight, backdrop, revealTarget, sourceRect, targetRect }) {
  if (!gsap || prefersReducedMotion()) {
    gsap?.set(flight, { opacity: 0 });
    gsap?.to(backdrop, { opacity: 1, duration: 0.18 });
    gsap?.to(revealTarget, { opacity: 1, duration: 0.18 });
    return Promise.resolve();
  }

  const scaleX = sourceRect.width / targetRect.width;
  const scaleY = sourceRect.height / targetRect.height;
  const dx = sourceRect.left + sourceRect.width / 2 - (targetRect.left + targetRect.width / 2);
  const dy = sourceRect.top + sourceRect.height / 2 - (targetRect.top + targetRect.height / 2);
  // How far up the top-anchored origin sits vs. true center, expressed as
  // the extra Y offset needed so scaling from the top edge (instead of the
  // center) still lines up with the thumbnail's real top edge.
  const topAnchorDy = dy - (targetRect.height * scaleY - targetRect.height) / 2;

  return new Promise((resolve) => {
    const tl = gsap.timeline({ onComplete: resolve });

    gsap.set(flight, {
      x: dx,
      y: topAnchorDy,
      scaleX,
      scaleY,
      transformOrigin: '50% 0%',
      filter: 'blur(0px)',
      opacity: 1,
    });
    gsap.set(revealTarget, { opacity: 0 });

    tl.to(backdrop, { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0)
      // Phase 1 — acceleration: blur ramps up, the box grows from the top
      // edge so the bottom visibly leads.
      .to(flight, { filter: 'blur(7px)', duration: 0.14, ease: 'power1.out' }, 0)
      .to(
        flight,
        {
          scaleY: gsap.utils.interpolate(scaleY, 1, 0.62),
          x: gsap.utils.interpolate(dx, 0, 0.35),
          y: gsap.utils.interpolate(topAnchorDy, 0, 0.3),
          duration: 0.2,
          ease: 'power2.in',
        },
        0.02,
      )
      // Phase 2 — the top catches up: origin recenters, everything eases
      // the rest of the way home, with a whisper of organic flex.
      .set(flight, { transformOrigin: '50% 50%' }, 0.22)
      .to(
        flight,
        {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          duration: 0.46,
          ease: 'power3.out',
        },
        0.22,
      )
      .to(flight, { skewY: -0.9, rotateX: 2.4, duration: 0.16, ease: 'sine.out' }, 0.24)
      .to(flight, { skewY: 0.3, rotateX: -0.8, duration: 0.18, ease: 'sine.inOut' }, 0.4)
      .to(flight, { skewY: 0, rotateX: 0, duration: 0.22, ease: 'power2.out' }, 0.56)
      .to(flight, { filter: 'blur(0px)', duration: 0.32, ease: 'power2.out' }, 0.3)
      // A hair of overshoot before it settles, then crossfade to the real,
      // uncropped media and drop the flight clone.
      .to(flight, { scale: '+=0.012', duration: 0.1, ease: 'power1.out' }, 0.58)
      .to(flight, { scale: '-=0.012', duration: 0.2, ease: 'power2.out' }, 0.68)
      .to(flight, { opacity: 0, duration: 0.22, ease: 'power1.out' }, 0.66)
      .to(revealTarget, { opacity: 1, duration: 0.3, ease: 'power1.out' }, 0.62);
  });
}

/**
 * A one-shot staggered entrance for a small group of static elements (the
 * OP panel's contents on thread load). Distinct from `revealOnScroll`:
 * nothing here is scroll-triggered or repeatable, it just plays once.
 */
export function revealPanel(elements) {
  const items = [...elements].filter(Boolean);
  if (!items.length) return;

  if (!gsap || prefersReducedMotion()) return;

  gsap.fromTo(
    items,
    { opacity: 0, y: 10, filter: 'blur(4px)' },
    {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: 0.55,
      ease: 'power2.out',
      stagger: 0.055,
    },
  );
}

/** Faster, lighter reverse — closing should feel immediately responsive. */
export function animateCollapse({ flight, backdrop, revealTarget, sourceRect, targetRect }) {
  if (!gsap || prefersReducedMotion()) {
    gsap?.to(backdrop, { opacity: 0, duration: 0.15 });
    return Promise.resolve();
  }

  const scaleX = sourceRect.width / targetRect.width;
  const scaleY = sourceRect.height / targetRect.height;
  const dx = sourceRect.left + sourceRect.width / 2 - (targetRect.left + targetRect.width / 2);
  const dy = sourceRect.top + sourceRect.height / 2 - (targetRect.top + targetRect.height / 2);

  return new Promise((resolve) => {
    gsap.set(flight, { x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1, transformOrigin: '50% 50%' });
    gsap.set(revealTarget, { opacity: 0 });

    const tl = gsap.timeline({ onComplete: resolve });
    tl.to(flight, { filter: 'blur(5px)', duration: 0.1, ease: 'power1.in' }, 0)
      .to(flight, { x: dx, y: dy, scaleX, scaleY, duration: 0.32, ease: 'power2.in' }, 0.02)
      .to(flight, { filter: 'blur(0px)', opacity: 0, duration: 0.16, ease: 'power1.out' }, 0.28)
      .to(backdrop, { opacity: 0, duration: 0.3, ease: 'power1.out' }, 0.1);
  });
}
