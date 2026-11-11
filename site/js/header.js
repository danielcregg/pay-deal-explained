// Keeps --header-h equal to the sticky header's height, so links to a chapter or a
// glossary entry land just below the header however many rows it wraps to
// (base.css: html { scroll-padding-top: calc(var(--header-h) + …) }).

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
