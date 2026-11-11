// Section 10: Plain-English glossary. Also turns every [data-term] on the page into a
// button that explains the term in place (tap-to-explain), with a link to its entry.

import { h } from '../dom.js';

export const termHref = (id) => `#term-${id}`;

function enhanceTerms(doc, glossary) {
  const byId = new Map(glossary.map((g) => [g.id, g]));
  const pop = h('div', { class: 'term-pop', id: 'term-pop', hidden: true });
  doc.body.append(pop);
  let openFor = null;

  const close = () => {
    if (!openFor) return;
    openFor.setAttribute('aria-expanded', 'false');
    pop.hidden = true;
    openFor = null;
  };

  const open = (btn, entry) => {
    pop.replaceChildren(
      h('strong', {}, entry.term),
      h('span', {}, ` ${entry.text} `),
      h('a', { href: termHref(entry.id) }, 'In the glossary'));
    pop.hidden = false;
    const box = btn.getBoundingClientRect();
    const width = Math.min(320, doc.documentElement.clientWidth - 24);
    pop.style.width = `${width}px`;
    pop.style.left = `${Math.max(12, Math.min(box.left + window.scrollX, window.scrollX + doc.documentElement.clientWidth - width - 12))}px`;
    pop.style.top = `${box.bottom + window.scrollY + 6}px`;
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
    el.replaceWith(btn);
  }

  doc.addEventListener('click', (e) => { if (openFor && !pop.contains(e.target)) close(); });
  doc.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openFor) { const btn = openFor; close(); btn.focus(); }
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
