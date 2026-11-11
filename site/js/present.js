// Present mode: the same sections as full-screen chapters for a projector, with
// Back/Next buttons, arrow keys, Page Up/Down, Space, Home/End, and Esc to exit.

import { h } from './dom.js';

/** Where a key press takes you, or `current` when a control owns the key. */
export function nextChapter(current, key, count, inFormControl) {
  if (inFormControl) return current;
  switch (key) {
    case 'ArrowRight': case 'PageDown': case ' ': return Math.min(count, current + 1);
    case 'ArrowLeft': case 'PageUp': return Math.max(0, current - 1);
    case 'Home': return 0;
    case 'End': return count;
    default: return current;
  }
}

/**
 * What a key press does in Present mode: `{ exit: true }`, `{ to: chapter }` or null.
 * A key something else already handled (Esc closing a glossary pop-up) does nothing here.
 */
export function presentKeyAction(e, current, count, owned) {
  if (e.defaultPrevented) return null;
  if (e.key === 'Escape') return { exit: true };
  if (e.altKey || e.ctrlKey || e.metaKey) return null;
  const to = nextChapter(current, e.key, count, owned);
  return to === current ? null : { to };
}

/** Does the focused element own this key? Inputs and interactive charts own the arrows; buttons own Space. */
function ownsKey(el, key) {
  if (!el || el === document.body) return false;
  if (el.matches('input, select, textarea, [contenteditable], svg[tabindex]')) return true;
  return key === ' ' && el.matches('button, a[href], summary');
}

let state = null;

function sections() {
  return [...document.querySelectorAll('main > [data-chapter]')]
    .sort((a, b) => Number(a.dataset.chapter) - Number(b.dataset.chapter));
}

export function goTo(i) {
  if (!state) return;
  const all = state.sections;
  state.index = Math.max(0, Math.min(all.length - 1, i));
  all.forEach((s, n) => s.classList.toggle('is-current', n === state.index));
  const current = all[state.index];
  const count = all.length - 1;
  state.label.textContent = state.index === 0 ? 'Introduction' : `Chapter ${state.index} of ${count}`;
  state.dots.forEach((d, n) => d.classList.toggle('on', n === state.index));
  state.back.disabled = state.index === 0;
  state.next.disabled = state.index === count;
  window.scrollTo({ top: 0, behavior: 'instant' });
  const heading = current.querySelector('h1, h2');
  if (heading) {
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }
}

export function exitPresent() {
  if (!state) return;
  const current = state.sections[state.index];
  document.removeEventListener('keydown', state.onKey);
  state.nav.remove();
  state.sections.forEach((s) => s.classList.remove('is-current'));
  document.body.classList.remove('present');
  state = null;
  current.scrollIntoView({ behavior: 'instant', block: 'start' });
  document.querySelector('[data-action="present"]')?.focus({ preventScroll: true });
}

export function enterPresent(start = 0) {
  if (state) return;
  const all = sections();
  const back = h('button', { type: 'button', class: 'back' }, '← Back');
  const next = h('button', { type: 'button', class: 'next' }, 'Next →');
  const exit = h('button', { type: 'button', class: 'exit' }, 'Exit');
  const label = h('span', { class: 'label', 'aria-live': 'polite' });
  const dots = all.map(() => h('span'));
  const nav = h('nav', { class: 'present-nav', 'aria-label': 'Presentation' },
    back, label, h('span', { class: 'present-dots', 'aria-hidden': 'true' }, dots), next, exit);
  const onKey = (e) => {
    const action = presentKeyAction(e, state.index, all.length - 1, ownsKey(document.activeElement, e.key));
    if (!action) return;
    e.preventDefault();
    if (action.exit) exitPresent(); else goTo(action.to);
  };
  state = { sections: all, index: 0, nav, label, dots, back, next, onKey };
  back.addEventListener('click', () => goTo(state.index - 1));
  next.addEventListener('click', () => goTo(state.index + 1));
  exit.addEventListener('click', exitPresent);
  document.addEventListener('keydown', onKey);
  document.body.append(nav);
  document.body.classList.add('present');
  goTo(start);
}

/** Show the Present button and start from whichever chapter is on screen. */
export function initPresent() {
  const button = document.querySelector('[data-action="present"]');
  if (!button) return;
  button.hidden = false;
  button.addEventListener('click', () => {
    const all = sections();
    const onScreen = all.findIndex((s) => s.getBoundingClientRect().bottom > window.innerHeight * 0.35);
    enterPresent(Math.max(0, onScreen));
  });
}
