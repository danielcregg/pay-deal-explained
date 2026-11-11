// Keeps --header-h equal to the sticky header's height, so links to a chapter or a
// glossary entry land just below the header however many rows it wraps to
// (base.css: html { scroll-padding-top: calc(var(--header-h) + …) }).

import { finalSalary } from './pay.js';
import { resolvePay, owedFor } from './selection.js';
import { eur } from './format.js';
import { h } from './dom.js';

/** What the header chip says: the chosen pay and where it ends up, or an invitation to choose. */
export function mineText(sel, data) {
  const pay = resolvePay(sel, data.SCALES);
  const hourly = pay.unit === 'hour';
  const end = finalSalary(pay.base, data.DEAL.steps, { includeLB: sel.includeLB }) * pay.factor;
  return {
    label: pay.isExample ? `Example: ${pay.label}` : `Your pay: ${pay.label}`,
    figure: eur(end, { cents: hourly }),
    tail: (hourly ? 'an hour by 2029' : 'by 2029') + (() => {
      const owed = Boolean(sel.includeOwed && owedFor(sel, data.SCALES));
      if (owed && sel.includeLB) return ', with both 1%s';
      if (owed) return ', with the 2025 1%';
      return sel.includeLB ? ', with the 2029 1%' : '';
    })(),
    go: pay.isExample ? 'Choose yours' : 'Change',
  };
}

/** Keep the header chip (a link to section 1) in step with the reader's choices. */
export function mountMine(el, store, data) {
  if (!el) return;
  const show = () => {
    const t = mineText(store.get(), data);
    el.replaceChildren(h('span', { class: 'mine-label' }, t.label), ' ', h('b', {}, t.figure), ' ', h('span', {}, t.tail), ' ', h('span', { class: 'mine-go' }, t.go));
    el.setAttribute('aria-label', `${t.label}: ${t.figure} ${t.tail}. ${t.go}`);
    el.hidden = false;
  };
  show();
  store.subscribe(show);
}

export function syncHeaderHeight(doc = document) {
  const header = doc.querySelector('.site-header');
  const height = header ? header.offsetHeight : 0;
  doc.documentElement.style.setProperty('--header-h', `${height}px`);
  return height;
}

export function trackHeaderHeight(doc = document) {
  syncHeaderHeight(doc);
  const header = doc.querySelector('.site-header');
  if (header && typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => syncHeaderHeight(doc)).observe(header);
  }
}
