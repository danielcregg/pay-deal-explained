// Section 10: Plain-English glossary. Also turns every [data-term] on the page into a
// button that explains the term in place (tap-to-explain), with a link to its entry.

import { h } from '../dom.js';

export const termHref = (id) => `#term-${id}`;

function enhanceTerms(doc, glossary) {
  const byId = new Map(glossary.map((g) => [g.id, g]));
  // One shared explanation, moved next to whichever term is open so it follows the term
  // in reading order (screen readers reach it next; its link is the next tab stop).
  const pop = h('span', { class: 'term-pop', id: 'term-pop', role: 'note', hidden: true });
  let openFor = null;

  const close = () => {
    if (!openFor) return;
    openFor.setAttribute('aria-expanded', 'false');
    pop.hidden = true;
    pop.remove();
    openFor = null;
  };

  const open = (btn, entry) => {
    pop.replaceChildren(
      h('strong', {}, entry.term),
      h('span', {}, ` ${entry.text} `),
      h('a', { href: termHref(entry.id) }, 'In the glossary'));
    btn.after(pop);
    pop.hidden = false;
    const viewport = doc.documentElement.clientWidth;
    pop.style.width = `${Math.min(320, viewport - 24)}px`;
    pop.style.left = '0px';
    const box = pop.getBoundingClientRect();
    let shift = 0;
    if (box.right > viewport - 12) shift = viewport - 12 - box.right;
    if (box.left + shift < 12) shift = 12 - box.left;
    pop.style.left = `${shift}px`;
    btn.setAttribute('aria-expanded', 'true');
    openFor = btn;
  };

  for (const el of doc.querySelectorAll('[data-term]')) {
    const entry = byId.get(el.dataset.term);
    if (!entry || el.tagName === 'BUTTON') continue;
    const btn = h('button', { type: 'button', class: 'term', 'aria-expanded': 'false', 'aria-controls': 'term-pop', dataset: { term: entry.id } }, el.textContent);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (openFor === btn) close(); else { close(); open(btn, entry); }
    });
    el.replaceWith(h('span', { class: 'term-wrap' }, btn));
  }

  doc.addEventListener('click', (e) => { if (openFor && !pop.contains(e.target)) close(); });
  doc.addEventListener('keydown', (e) => {
    // Marked as handled, so the same Esc does not also leave Present mode.
    if (e.key === 'Escape' && openFor) { e.preventDefault(); const btn = openFor; close(); btn.focus(); }
  });
  window.addEventListener('resize', close);
}

export function render(root, { data }) {
  root.append(h('div', { class: 'plate' },
    h('dl', { class: 'glossary' }, data.GLOSSARY.map((g) => [
      h('dt', { id: `term-${g.id}` }, g.term),
      h('dd', {}, g.text),
    ]))));
  enhanceTerms(document, data.GLOSSARY);
}
