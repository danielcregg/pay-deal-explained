// Section 9: How we got here, what happens next. A vertical timeline with a "Now"
// marker, ending with a neutral pointer to the unions' own pages.

import { h } from '../dom.js';
import { prefersReducedMotion, onFirstView, replayTransition } from '../motion.js';

/** Mark each event past, now (the latest on or before today) or future. */
export function model(events, today) {
  let nowIndex = -1;
  events.forEach((e, i) => { if (e.date <= today) nowIndex = i; });
  return events.map((e, i) => ({ ...e, state: i < nowIndex ? 'past' : i === nowIndex ? 'now' : 'future' }));
}

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function render(root, { data }) {
  const sources = new Map(data.SOURCES.map((s) => [s.id, s]));
  const events = model(data.TIMELINE, todayLocal());
  const list = h('ol', { class: 'tl' }, events.map((e, i) => {
    const src = sources.get(e.sourceId);
    return h('li', { class: `tl-item ${e.state}`, style: `--d:${(i * 0.12).toFixed(2)}s` },
      h('span', { class: 'tl-dot', 'aria-hidden': 'true' }),
      h('p', { class: 'tl-when' }, e.when, e.state === 'now' ? h('span', { class: 'tl-now' }, 'Now') : null,
        e.state === 'future' ? h('span', { class: 'visually-hidden' }, ' (still to come)') : null),
      h('p', { class: 'tl-label' }, e.label),
      src ? h('p', { class: 'tl-source' }, src.url ? h('a', { href: src.url, rel: 'noopener' }, src.publisher) : src.publisher) : null);
  }));

  const unions = h('aside', { class: 'plate union-view', 'aria-labelledby': 'union-view-h' },
    h('h3', { id: 'union-view-h' }, 'Your union’s view'),
    h('p', {}, 'This site does not report any union’s recommendation on how to vote. For your union’s view of the draft and its ballot arrangements, go to its own website.'),
    h('ul', {}, data.UNION_LINKS.map((u) => h('li', {}, h('a', { href: u.url, rel: 'noopener' }, u.name), `: ${u.note}`))));

  root.append(h('div', { class: 'plate' }, list), unions);

  if (!prefersReducedMotion()) {
    list.classList.add('pre');
    onFirstView(list, () => replayTransition(list));
  }
}
