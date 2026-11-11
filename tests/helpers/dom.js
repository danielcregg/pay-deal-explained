// A tiny stand-in for the browser DOM: enough to run the site's render code in Node and
// inspect what it built. It has elements, text, attributes, classes, events that bubble,
// focus and a simple selector matcher. It is not a browser: no layout, no CSS, no HTML
// parsing (innerHTML is kept as a plain string).

const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

export class Node {
  constructor() { this.parentNode = null; this.childNodes = []; }
  get firstChild() { return this.childNodes[0] ?? null; }
  contains(other) {
    for (let n = other; n; n = n.parentNode) if (n === this) return true;
    return false;
  }
  remove() {
    const parent = this.parentNode;
    if (!parent) return;
    parent.childNodes.splice(parent.childNodes.indexOf(this), 1);
    this.parentNode = null;
  }
}

export class Text extends Node {
  constructor(data) { super(); this.nodeName = '#text'; this.data = String(data); }
  get textContent() { return this.data; }
}

function matchesCompound(el, compound) {
  const m = /^([a-zA-Z][\w-]*|\*)?((?:[#.][\w-]+|\[[^\]]+\])*)$/.exec(compound);
  if (!m) throw new Error(`fake DOM: unsupported selector "${compound}"`);
  if (m[1] && m[1] !== '*' && el.localName !== m[1].toLowerCase()) return false;
  for (const [part] of m[2].matchAll(/[#.][\w-]+|\[[^\]]+\]/g)) {
    if (part[0] === '#') { if (el.id !== part.slice(1)) return false; continue; }
    if (part[0] === '.') { if (!el.classList.contains(part.slice(1))) return false; continue; }
    const a = /^\[([\w-]+)(?:(\^?=)"?([^"\]]*)"?)?\]$/.exec(part);
    if (!a) throw new Error(`fake DOM: unsupported selector "${part}"`);
    const fromData = a[1].startsWith('data-') ? el.dataset[camel(a[1].slice(5))] : undefined;
    const value = el.getAttribute(a[1]) ?? fromData ?? null;
    if (value === null) return false;
    if (a[2] === '=' && value !== a[3]) return false;
    if (a[2] === '^=' && !value.startsWith(a[3])) return false;
  }
  return true;
}

/** Compound selectors joined by descendant combinators only (a child ">" throws). */
function matchesChain(el, parts) {
  if (!matchesCompound(el, parts[parts.length - 1])) return false;
  if (parts.length === 1) return true;
  for (let a = el.parentNode; a instanceof Element; a = a.parentNode) {
    if (matchesChain(a, parts.slice(0, -1))) return true;
  }
  return false;
}

export class Element extends Node {
  constructor(tag, doc) {
    super();
    this.tagName = tag.toUpperCase();
    this.localName = tag.toLowerCase();
    this.ownerDocument = doc;
    this.attributes = new Map();
    this.dataset = {};
    this.style = {};
    this.listeners = new Map();
    this.hidden = false;
    this.innerHTML = '';
    this.offsetWidth = 0;
    this.offsetHeight = 0;
    this.clientWidth = 0;
  }
  get nodeName() { return this.tagName; }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name.startsWith('data-')) this.dataset[camel(name.slice(5))] = String(value);
    if (name === 'hidden') this.hidden = true;
  }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  hasAttribute(name) { return this.attributes.has(name); }
  removeAttribute(name) { this.attributes.delete(name); if (name === 'hidden') this.hidden = false; }
  get className() { return this.getAttribute('class') ?? ''; }
  set className(v) { this.attributes.set('class', String(v)); }
  get id() { return this.getAttribute('id') ?? ''; }
  set id(v) { this.attributes.set('id', String(v)); }
  get classList() {
    const el = this;
    const list = () => el.className.split(/\s+/).filter(Boolean);
    return {
      contains: (c) => list().includes(c),
      add: (c) => { if (!list().includes(c)) el.className = [...list(), c].join(' '); },
      remove: (c) => { el.className = list().filter((x) => x !== c).join(' '); },
      toggle(c, on = !this.contains(c)) { if (on) this.add(c); else this.remove(c); },
    };
  }

  /**
   * Form values. An input starts from its `value` attribute. A select's value is one of
   * its options: the one set, or the first when that option is not (or no longer) there.
   */
  get value() {
    if (this.localName === 'select') {
      const values = this.querySelectorAll('option').map((o) => o.getAttribute('value') ?? o.textContent);
      if (this.formValue !== undefined && values.includes(this.formValue)) return this.formValue;
      return values[0] ?? '';
    }
    return this.formValue ?? this.getAttribute('value') ?? '';
  }
  set value(v) { this.formValue = String(v); }

  get children() { return this.childNodes.filter((n) => n instanceof Element); }
  insertBefore(node, ref) {
    const n = node instanceof Node ? node : new Text(node);
    if (n === ref) return n;
    n.remove();
    const at = ref ? this.childNodes.indexOf(ref) : this.childNodes.length;
    this.childNodes.splice(at, 0, n);
    n.parentNode = this;
    return n;
  }
  append(...nodes) { for (const n of nodes) this.insertBefore(n, null); }
  appendChild(node) { return this.insertBefore(node, null); }
  prepend(...nodes) { const first = this.firstChild; for (const n of nodes) this.insertBefore(n, first); }
  after(node) {
    const siblings = this.parentNode.childNodes;
    this.parentNode.insertBefore(node, siblings[siblings.indexOf(this) + 1] ?? null);
  }
  replaceWith(node) { this.parentNode.insertBefore(node, this); this.remove(); }
  replaceChildren(...nodes) { for (const c of [...this.childNodes]) c.remove(); this.append(...nodes); }
  get textContent() { return this.childNodes.map((n) => n.textContent).join(''); }
  set textContent(v) { this.replaceChildren(...(v === '' || v == null ? [] : [new Text(v)])); }

  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(fn);
  }
  /** Runs listeners on this node and, unless `bubbles` is false, on each ancestor up to the document. */
  dispatchEvent(event) {
    event.target ??= this;
    event.defaultPrevented ??= false;
    event.preventDefault ??= function preventDefault() { this.defaultPrevented = true; };
    event.stopPropagation ??= function stopPropagation() { this.stopped = true; };
    for (let n = this; n && !event.stopped; n = n.parentNode) {
      for (const fn of n.listeners.get(event.type) ?? []) fn.call(n, event);
      if (event.bubbles === false) break;
    }
    return !event.defaultPrevented;
  }
  click() { this.dispatchEvent({ type: 'click', bubbles: true }); }
  focus() {
    const doc = this.ownerDocument;
    const previous = doc.activeElement;
    if (previous === this) return;
    if (previous instanceof Element) previous.dispatchEvent({ type: 'blur', bubbles: false });
    doc.activeElement = this;
    this.dispatchEvent({ type: 'focus', bubbles: false });
  }

  getBoundingClientRect() { return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }; }
  /** "Rendered" here means attached to the document with no hidden ancestor. */
  getClientRects() {
    for (let n = this; n; n = n.parentNode) {
      if (n.hidden) return [];
      if (n === this.ownerDocument) return [{}];
    }
    return [];
  }

  matches(selector) { return selector.split(',').some((s) => matchesChain(this, s.trim().split(/\s+/))); }
  closest(selector) {
    for (let n = this; n instanceof Element; n = n.parentNode) if (n.matches(selector)) return n;
    return null;
  }
  querySelectorAll(selector) {
    const found = [];
    const walk = (el) => { for (const c of el.children) { if (c.matches(selector)) found.push(c); walk(c); } };
    walk(this);
    return found;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
}

export class Document extends Element {
  constructor() {
    super('#document', null);
    this.ownerDocument = this;
    this.documentElement = this.createElement('html');
    this.documentElement.clientWidth = 1024;
    this.body = this.createElement('body');
    this.insertBefore(this.documentElement, null);
    this.documentElement.append(this.body);
    this.activeElement = this.body;
  }
  createElement(tag) { return new Element(tag, this); }
  createElementNS(_namespace, tag) { const el = new Element(tag, this); el.tagName = tag; return el; }
  createTextNode(text) { return new Text(text); }
  getElementById(id) { return this.querySelector(`#${id}`); }
}

let reducedMotion = true;

/** Tests run with reduced motion unless they switch it off to exercise the timed animations. */
export function setReducedMotion(flag) { reducedMotion = flag; }

/** Make `document`, `window` and `Node` available to the site's modules. Returns the document. */
export function installDom() {
  const document = new Document();
  const window = {
    document,
    innerHeight: 768,
    addEventListener() {},
    matchMedia: () => ({ matches: reducedMotion }), // reduced motion: charts draw in their final state
  };
  Object.assign(globalThis, { document, window, Node });
  return document;
}
