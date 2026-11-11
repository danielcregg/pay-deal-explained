// The chapter rail (wide screens): one dot per chapter in its family colour, showing
// where the reader is and giving a way to jump. Each dot is a link named for its chapter.

import { h } from './dom.js';

/** The chapter being read: the last whose top edge has reached `line`; -1 before the first. */
export function currentChapter(tops, line) {
  let current = -1;
  tops.forEach((top, i) => { if (top <= line) current = i; });
  return current;
}

export function mountRail(doc = document) {
  const sections = [...doc.querySelectorAll('main > section.chapter')];
  if (!sections.length) return;
  const links = sections.map((section) => h('a', { href: `#${section.id}`, dataset: { family: section.dataset.family ?? 'slate' } },
    h('span', { class: 'rail-dot', 'aria-hidden': 'true' }),
    h('span', { class: 'rail-label' }, `${section.dataset.chapter}. ${section.querySelector('h2')?.textContent ?? section.id}`)));
  doc.body.append(h('nav', { class: 'rail', 'aria-label': 'Chapters' }, links));

  const update = () => {
    const now = currentChapter(sections.map((s) => s.getBoundingClientRect().top), window.innerHeight * 0.4);
    links.forEach((a, i) => {
      if (i === now) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  };
  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
}
