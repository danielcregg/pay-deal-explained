// Small helpers for hand-written SVG charts.

const NS = 'http://www.w3.org/2000/svg';

export function svgEl(tag, attrs = {}, children = []) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== undefined && v !== null && v !== false) el.setAttribute(k, String(v));
  }
  for (const c of [].concat(children)) {
    if (c !== null && c !== undefined && c !== false) el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
}

/** Map [d0, d1] onto [r0, r1] linearly (r1 may be below r0, e.g. for y axes). */
export function scaleLinear([d0, d1], [r0, r1]) {
  const k = (r1 - r0) / (d1 - d0);
  return (x) => r0 + (x - d0) * k;
}
