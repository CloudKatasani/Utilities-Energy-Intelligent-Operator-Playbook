// Shared helpers: data access, indexes, escaping, badges and the session-only relabels.
import { state } from './state.js';

export const D = window.__PLAYBOOK__;
export const L = D.industry.labels;

const index = (arr) => Object.fromEntries((arr || []).map((x) => [x.id, x]));
export const IDX = {
  agents: index(D.agents.agents),
  families: index(D.families.families),
  outcomes: index(D.outcomes.outcomes),
  domains: index(D.domains.domains),
  areas: index(D.domains.areas),
  subAreas: index(D.domains.subAreas),
  processes: index(D.domains.processes),
  products: index(D.dataProducts.products),
  layers: index(D.layers.layers),
  motions: index(D.motions.motions),
  offerings: index(D.offerings.offerings),
  scenarios: index(D.scenarios.scenarios),
  sources: index(D.sources.sources),
  classes: index(D.industry.classifications),
  audiences: index(D.presenter.audiences),
};

export const OT = D.industry.otSafety;
export const isOtCapped = (agentId) => OT.agentsCapped.includes(agentId);
export const LEVELS = ['L1', 'L2', 'L3', 'L4'];
export const levelNum = (l) => Number(String(l).replace('L', ''));
export const maxLevel = (a) => (isOtCapped(a.id) ? OT.capLevel : a.autonomyMax);

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
// Content strings are trusted (they ship in the build); **bold** becomes <b>.
export const rich = (s) => String(s ?? '').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
export const attr = (s) => esc(String(s ?? '').replace(/<[^>]+>/g, ''));

export const fmt = (n, d = 0) => Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
export const money = (m, d = 1) => `$${fmt(m, d)}M`;
export const pct = (x, d = 0) => `${fmt(x * 100, d)}%`;

// Source tooltip for any number: data-tip carries the explanation (spec F11).
export function tipFor(source, extra = '') {
  const types = D.shared.engine.sourceTypes;
  const s = IDX.sources[source];
  if (s) return `${s.label}. Checked ${s.checked}. ${s.url}`;
  const label = types[source] || types.synthetic;
  const syn = source === 'synthetic' ? ` · ${D.industry.synthetic.disclosure}` : '';
  const pending = source === 'BENCH' || source === 'capgemini-proof' ? ' · Pending validation' : '';
  return `${label}${syn}${pending}${extra ? ` · ${extra}` : ''}`;
}
export const srcAttr = (source, extra) => `data-tip="${attr(tipFor(source, extra))}" tabindex="0"`;

export function autonomyBadge(level, { capped = false, title = '' } = {}) {
  const n = levelNum(level);
  return `<span class="lvl lvl-${n}${capped ? ' lvl-capped' : ''}" ${title ? `data-tip="${attr(title)}"` : ''}>${esc(level)}${capped ? ' · OT cap' : ''}</span>`;
}

export function motionBadge(id) {
  const m = IDX.motions[id];
  if (!m) return '';
  return `<span class="mbadge ${m.cls}">${esc(m.short)}</span>`;
}

export function classBadge(id) {
  const c = IDX.classes[id] || { id, label: id, restricted: false };
  return `<span class="cbadge${c.restricted ? ' cbadge-restricted' : ''}" data-tip="${attr(c.refusal || 'Internal data')}">${esc(c.label)}</span>`;
}

export function tagLabel(commodity) {
  return D.industry.subAreaTags[commodity] || commodity;
}

export const familyCls = (id) => IDX.families[id]?.cls || '';

export function agentChip(id, { full = false } = {}) {
  const a = IDX.agents[id];
  if (!a) return `<span class="chip">${esc(id)}</span>`;
  return `<a class="agent-chip ${familyCls(a.family)}" href="#/agent/${a.id}${full ? '/full' : ''}" data-agent="${a.id}" title="${attr(a.name)} — double-click for the full view">${esc(a.name)} <small>${a.id}</small></a>`;
}

export function dpChip(id) {
  const p = IDX.products[id];
  if (!p) return `<span class="chip">${esc(id)}</span>`;
  return `<a class="dp-chip" href="#/dp/${p.id}" data-dp="${p.id}">${esc(p.name)} <small>${p.id}</small></a>`;
}

// Seed data-product references look like "UDP-GRD-01 Outage & Reliability 360" or plain text.
export function dpRef(ref) {
  const id = String(ref).split(' ')[0];
  return IDX.products[id] ? dpChip(id) : `<span class="chip">${esc(ref)}</span>`;
}

export const offeringLink = (id) => {
  const o = IDX.offerings[id];
  return o ? `<a class="off-chip" href="#/offering/${o.id}">${esc(o.name)} <small>${o.id}</small></a>` : '';
};

export function sectionHead(kicker, title, lede = '', { dark = false, edit } = {}) {
  return `<div class="section-head${dark ? ' on-dark' : ''}"><p class="kicker">${esc(kicker)}</p><h2${edit ? ` data-edit="${edit}"` : ''}>${rich(title)}</h2>${lede ? `<p class="lede">${rich(lede)}</p>` : ''}</div>`;
}

export const closeBtn = () => '<button class="close" data-close aria-label="Close">×</button>';

// Session relabels applied to rendered HTML: the presenter's operator name and the as-of shift.
export function relabel(html) {
  let out = html;
  if (state.operatorName) {
    const name = esc(state.operatorName);
    out = out.replace(new RegExp(`\\b[Yy]our ${L.org}\\b`, 'g'), name).replace(new RegExp(`\\b[Tt]he ${L.org}\\b(?![^<]*>)`, 'g'), name);
  }
  if (state.anchorShift) {
    const k = state.anchorShift;
    out = out.replace(/\b(202[4-8])-(0[1-9]|1[0-2])(-\d{2})?\b/g, (m, y, mo, day) => {
      const d = new Date(Date.UTC(Number(y), Number(mo) - 1 + k, 1));
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}${day || ''}`;
    });
  }
  return out;
}

export function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('show'), 3200);
}

export const clientMode = () => state.mode === 'client';

export function download(name, text, type = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
