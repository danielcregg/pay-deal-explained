// Motion helpers. Animations are skipped when the reader asks for reduced motion.

export function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Replay a CSS transition from the state set by `cls` (e.g. bars at scaleY(0)) to the
 * element's normal state. Forcing a style flush between adding and removing the class
 * starts the transition without waiting for an animation frame, so the final state
 * never depends on frames being rendered (background tabs, print, screenshots).
 */
export function replayTransition(el, cls = 'pre') {
  el.classList.add(cls);
  void el.getBoundingClientRect();
  el.classList.remove(cls);
}

/**
 * Count a figure from one value to another. Timed, not frame-based, so it lands on `to`
 * even where no frames are drawn; with reduced motion it lands there at once.
 */
export function countTo(el, from, to, format, duration = 600) {
  if (el.counting) clearInterval(el.counting);
  el.counting = null;
  if (prefersReducedMotion() || from === to || !Number.isFinite(from)) { el.textContent = format(to); return; }
  const t0 = Date.now();
  el.counting = setInterval(() => {
    const p = Math.min(1, (Date.now() - t0) / duration);
    el.textContent = format(from + (to - from) * (1 - Math.pow(1 - p, 3)));
    if (p >= 1) { clearInterval(el.counting); el.counting = null; }
  }, 30);
}

/**
 * Run `fn` once, the first time `el` scrolls into the upper 80% of the viewport.
 * (A visibility ratio would never be reached by elements taller than the screen.)
 */
export function onFirstView(el, fn) {
  if (typeof IntersectionObserver === 'undefined') { fn(); return; }
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { io.disconnect(); fn(); }
  }, { threshold: 0, rootMargin: '0px 0px -20% 0px' });
  io.observe(el);
}
