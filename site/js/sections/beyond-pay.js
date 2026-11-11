// Section 8: Beyond pay. What else the draft covers, each item marked as confirmed,
// as reported, or not yet published.

import { h } from '../dom.js';

const BADGE = {
  known: ['Confirmed', 'known'],
  reported: ['As reported', 'reported'],
  'not-yet-published': ['Not yet published', 'unpublished'],
};

export function render(root, { data }) {
  const sources = new Map(data.SOURCES.map((s) => [s.id, s]));
  root.append(h('div', { class: 'bp-cards' }, data.BEYOND_PAY.map((item) => {
    const [label, cls] = BADGE[item.status];
    return h('article', { class: 'plate beyond' },
      h('p', { class: `badge ${cls}` }, label),
      h('h3', {}, item.title),
      h('p', {}, item.text),
      h('p', { class: 'beyond-src' }, 'Source: ', item.sourceIds.map((id, i) => {
        const s = sources.get(id);
        const link = s.url ? h('a', { href: s.url, rel: 'noopener' }, s.publisher) : s.publisher;
        return i ? [', ', link] : link;
      })));
  })));
}
