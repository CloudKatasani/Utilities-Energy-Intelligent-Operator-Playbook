// Hash router over one scrolling story plus three overlay layers: page, drawer and full view.
// Every state deep-links, e.g. #/accelerate/operate, #/agent/UA-GO-02/run, #/offering/U-O1/pilot.
//   section  scrolls the story to an anchor and closes overlays
//   page     a full-screen page (offerings catalog, offering, scenario, briefing)
//   drawer   a right-hand drawer, optionally over a parent page
//   full     the agent / data-product full view, over whatever is open
import { relabel } from './util.js';

const routes = [];
const open = { page: null, drawer: null, full: null };
let baseHash = '#/';
const hooks = new Set();
let returnFocus = null;

export function route(pattern, kind, render, { parent } = {}) {
  const keys = [];
  const re = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; })}$`);
  routes.push({ re, keys, kind, render, parent });
}

export const afterRoute = (fn) => hooks.add(fn);
export const current = () => ({ ...open, base: baseHash });

function match(hash) {
  const path = decodeURIComponent(String(hash || '#/').replace(/^#/, '')) || '/';
  for (const r of routes) {
    const m = path.match(r.re);
    if (m) return { ...r, params: Object.fromEntries(r.keys.map((k, i) => [k, m[i + 1]])), hash: `#${path}` };
  }
  return null;
}

const layerEl = (l) => document.getElementById(`${l}-layer`);
const contentEl = (l) => document.getElementById(`${l}-content`);

function setVisible(l, on) {
  const el = layerEl(l);
  el.classList.toggle('open', on);
  el.setAttribute('aria-hidden', on ? 'false' : 'true');
  if (on) el.removeAttribute('inert'); else el.setAttribute('inert', '');
  document.body.classList.toggle(`has-${l}`, on);
  const any = Boolean(open.page || open.drawer || open.full);
  document.body.classList.toggle('layer-open', any);
  // The story behind an open layer is inert, so keyboard focus stays in the dialog.
  ['main', 'footer'].forEach((id) => { const n = document.getElementById(id); if (any) n.setAttribute('inert', ''); else n.removeAttribute('inert'); });
}

function paint(l, m, { keepScroll = false } = {}) {
  const el = contentEl(l);
  const t0 = performance.now();
  const top = el.scrollTop;
  el.innerHTML = relabel(String(m.render(m.params) ?? ''));
  el.dataset.route = m.hash;
  el.scrollTop = keepScroll ? top : 0;
  const title = el.querySelector('h1, h2');
  if (title) layerEl(l).setAttribute('aria-label', title.textContent.trim());
  setVisible(l, true);
  document.dispatchEvent(new CustomEvent('layer-rendered', { detail: { layer: l, route: m.hash, node: el, ms: performance.now() - t0, params: m.params } }));
  if (!keepScroll) {
    const f = el.querySelector('[data-autofocus]') || el.querySelector('h1, h2');
    if (f) { f.setAttribute('tabindex', '-1'); f.focus({ preventScroll: true }); }
  }
}

export function close(l) {
  open[l] = null;
  setVisible(l, false);
  contentEl(l).innerHTML = '';
  document.dispatchEvent(new CustomEvent('layer-closed', { detail: { layer: l } }));
}

export function closeAll() {
  ['full', 'drawer', 'page'].forEach((l) => open[l] && close(l));
  if (returnFocus && document.contains(returnFocus)) returnFocus.focus({ preventScroll: true });
  returnFocus = null;
}

export function apply(hash = location.hash) {
  const m = match(hash);
  if (!m) { closeAll(); return; }
  const hadOverlay = open.page || open.drawer || open.full;
  if (m.kind === 'section') {
    closeAll();
    baseHash = m.hash;
    m.render(m.params);
  } else if (m.kind === 'page') {
    if (open.full) close('full');
    if (open.drawer) close('drawer');
    if (open.page !== m.hash) { open.page = m.hash; paint('page', m); }
  } else if (m.kind === 'drawer') {
    if (open.full) close('full');
    if (m.parent) {
      const ph = m.parent(m.params);
      if (open.page !== ph) { const pm = match(ph); open.page = ph; paint('page', pm); }
    }
    if (open.drawer !== m.hash) { open.drawer = m.hash; paint('drawer', m); }
  } else if (m.kind === 'full') {
    if (open.full !== m.hash) { open.full = m.hash; paint('full', m); }
  }
  if (!hadOverlay && (open.page || open.drawer || open.full)) returnFocus = document.activeElement;
  hooks.forEach((fn) => fn(m));
}

// Esc / close: remove the top layer and reveal what is beneath it.
export function popTop() {
  const top = open.full ? 'full' : open.drawer ? 'drawer' : open.page ? 'page' : null;
  if (!top) return false;
  close(top);
  const below = open.drawer || open.page;
  const target = below || baseHash;
  history.replaceState(null, '', target);
  if (!below) closeAll();
  const m = match(target);
  hooks.forEach((fn) => fn(m || { hash: target, kind: 'section', params: {} }));
  return true;
}

export function go(hash, { replace = false } = {}) {
  const h = hash.startsWith('#') ? hash : `#${hash}`;
  if (location.hash === h) { apply(h); return; }
  if (replace) { history.replaceState(null, '', h); apply(h); } else location.hash = h;
}

// Re-render the open layers in place (after a mode, lens or operator change).
export function refresh() {
  ['page', 'drawer', 'full'].forEach((l) => {
    if (!open[l]) return;
    const m = match(open[l]);
    if (m) paint(l, m, { keepScroll: true });
  });
}

export function start() {
  window.addEventListener('hashchange', () => apply());
  apply();
}
