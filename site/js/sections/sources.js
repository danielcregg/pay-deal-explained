// Section 11: Sources and assumptions. Every source with its date, the assumptions
// behind the calculations, the independence notice and how to report an error.

import { h } from '../dom.js';
import { longDate } from '../format.js';

export function render(root, { data }) {
  const { SOURCES, ASSUMPTIONS, SITE } = data;
  root.append(
    h('div', { class: 'plate sources' },
      h('h3', {}, 'Sources'),
      h('ol', { class: 'source-list' }, SOURCES.map((s) => h('li', {},
        h('span', { class: 'src-pub' }, s.publisher), ', ',
        s.url ? h('a', { href: s.url, rel: 'noopener' }, s.title) : h('cite', {}, s.title),
        `, ${longDate(s.date)}.`,
        s.url ? null : h('span', { class: 'src-note' }, ' (no link available)')))),
      h('h3', {}, 'Assumptions'),
      h('ul', { class: 'assumption-list' }, ASSUMPTIONS.map((a) => h('li', {}, a))),
      h('h3', {}, 'About this site'),
      h('p', {}, 'An unofficial and independent explainer: not affiliated with any union, university or Government body. Not financial advice. Check your own figures with your payroll office or union.'),
      h('p', {}, `Last updated ${longDate(SITE.lastUpdated)}. `,
        'Spotted a mistake? ', h('a', { href: SITE.issuesUrl, rel: 'noopener' }, 'Report it on GitHub'), '.')));
}
