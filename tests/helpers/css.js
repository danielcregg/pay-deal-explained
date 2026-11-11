// Minimal CSS reading for tests: one rule's body, its custom properties, WCAG contrast.
import { readFileSync } from 'node:fs';

export const readCss = (name) => readFileSync(new URL(`../../site/css/${name}`, import.meta.url), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The body of the first rule whose whole selector is `selector` (e.g. ':root', 'body.present'). */
export function ruleBody(css, selector) {
  const m = new RegExp(`(^|[\\s};])${escape(selector)}\\s*\\{`).exec(css);
  if (!m) return null;
  let i = m.index + m[0].length;
  const start = i;
  for (let depth = 1; depth; i++) {
    if (i >= css.length) throw new Error(`unbalanced braces after ${selector}`);
    if (css[i] === '{') depth++;
    else if (css[i] === '}') depth--;
  }
  return css.slice(start, i - 1);
}

/** Custom properties declared in a rule body: { '--paper': '#fbfaf7', … }. */
export function tokens(body) {
  return Object.fromEntries([...(body ?? '').matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, k, v]) => [k, v.trim()]));
}

/** Light and dark token sets: :root, then the dark-scheme :root on top. */
export function themes(css) {
  const light = tokens(ruleBody(css, ':root'));
  const dark = { ...light, ...tokens(ruleBody(ruleBody(css, '@media (prefers-color-scheme: dark)') ?? '', ':root')) };
  return { light, dark };
}

const channel = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const luminance = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel(n >> 16) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
};

/** WCAG 2 contrast ratio between two #rrggbb colours. */
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
