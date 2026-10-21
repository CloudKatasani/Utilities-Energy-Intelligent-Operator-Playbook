// Foundation layer drawers (F6), the control plane, the nine-layer stack, the data-product shelf and the
// data-product full view (masked sample rows regenerated in the browser, sample KPIs and five Q&As).
import { D, IDX, OT, esc, closeBtn, classBadge, agentChip, offeringLink, motionBadge, srcAttr, pct, fmt, $, $$ } from '../core/util.js';
import { walk } from '../core/state.js';
import { icon } from '../core/icons.js';
import { industries } from '../data/index.js';
import { notFound } from './future.js';

const gen = () => industries[D.build.industry].generators;
const PAGE = 12;

export function controlPlaneDrawer() {
  const cp = D.layers.controlPlane;
  walk('control-plane', 'control-plane', cp.name);
  return `<header class="dr-head cp-head">${closeBtn()}<p class="kicker">Control plane · across every layer</p><h2 data-autofocus>${esc(cp.name)}</h2><p class="dr-sub">${esc(cp.summary)}</p></header>
    <section class="dr-block ot-rule"><h3>${icon('lock')} ${esc(OT.title)}</h3><p>${esc(OT.rule)}</p>
      <p>Capped at ${OT.capLevel}: ${OT.agentsCapped.map((id) => agentChip(id)).join(' ')} and the Volt/VAR, DER-dispatch, storage-dispatch and FLISR processes.</p></section>
    <section class="dr-block"><h3>What it does at each layer</h3><dl class="facts">${D.layers.layers.map((l) => `<dt><a href="#/layer/${l.id}">${esc(l.short)}</a></dt><dd>${esc(cp.perLayer[l.id])}</dd>`).join('')}</dl></section>
    <section class="dr-block"><h3>Agents of the control plane</h3><div class="chips">${cp.agents.map((id) => agentChip(id)).join('')}</div></section>
    <section class="dr-block"><h3>Motion and demo</h3><p>${motionBadge('govern')} <a href="#/scenario/U-S9">▶ U-S9 Assured by design</a> · <a href="#/accelerate/govern">Open in Accelerate</a></p></section>`;
}

function stack() {
  const s = D.layers.stack;
  return `<div class="stack" data-stack><div class="stack-sources">${s.sources.map((x) => `<span>${esc(x)}</span>`).join('')}</div>
    <ol class="stack-layers">${s.layers.map((l, i) => `<li class="stack-l stack-${l.id}" data-stack-step="${i}"><b>${esc(l.name)}</b><span>${esc(l.text)}</span></li>`).join('')}</ol>
    <button class="btn" data-replay-flow>${icon('play')} Replay flow</button></div>`;
}

function shelf() {
  const groups = [...new Set(D.dataProducts.products.map((p) => p.domain))];
  return groups.map((g) => `<h4 class="shelf-group">${esc(g)}</h4><div class="shelf">${D.dataProducts.products.filter((p) => p.domain === g).map((p) => `<a class="dp-card" href="#/dp/${p.id}" data-dp="${p.id}" title="Double-click for the sample and Q&amp;A"><b>${esc(p.name)}</b><small>${p.id}</small>${classBadge(p.classification)}<span class="dp-meta">${pct(p.quality)} quality · ${esc(p.freshness)}${p.certified ? ' · certified' : ''}</span></a>`).join('')}</div>`).join('');
}

export function layerDrawer({ id }) {
  const l = IDX.layers[id];
  if (!l) return notFound(id);
  walk('layer', l.id, l.name);
  const eng = D.shared.engine;
  return `<header class="dr-head">${closeBtn()}<p class="kicker">Foundation layer · How this layer looks · what it takes</p><h2 data-autofocus>${esc(l.name)}</h2><p class="dr-sub">${esc(l.purpose)}</p></header>
    <section class="dr-block"><h3>Reference components</h3><ul class="ticks">${l.components.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
      <p class="muted small">Platform options:</p><div class="chips">${eng.platforms.map((p) => `<span class="chip">${esc(p)}</span>`).join('')}</div></section>
    <section class="dr-block"><h3>Utility specifics</h3><p>${esc(l.specifics)}</p></section>
    <section class="dr-block"><h3>What it takes to succeed</h3><ul class="ticks">${l.takes.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></section>
    <section class="dr-block"><h3>Maturity ladder</h3><ol class="ladder">${eng.maturityLadder.map((m) => `<li>${esc(m)}</li>`).join('')}</ol></section>
    <section class="dr-block"><h3>Layer KPIs</h3><div class="chips">${l.kpis.map((k) => `<span class="chip" ${srcAttr('synthetic')}>${esc(k)}</span>`).join('')}</div></section>
    <section class="dr-block warn-block"><h3>Common failure mode</h3><p>${esc(l.failure.text)} <a href="#/agent/${l.failure.agent}/run">See the knockout ▸</a></p></section>
    <section class="dr-block cp-block"><h3>${icon('lock')} Governed by the control plane</h3><p>${esc(l.governed)}</p></section>
    <section class="dr-block"><h3>Motions and offerings that use it</h3><p>${l.motions.map(motionBadge).join(' ')}</p><div class="chips">${l.offerings.map(offeringLink).join('')}</div></section>
    ${l.id === 'data' ? `<section class="dr-block"><h3>Nine-layer stack</h3>${stack()}</section><section class="dr-block"><h3>Data-product shelf (${D.dataProducts.products.length})</h3>${shelf()}</section>` : ''}`;
}

function dpFacts(p) {
  return `<dl class="facts"><dt>Owner</dt><dd>${esc(p.owner)}</dd><dt>Domain</dt><dd>${esc(p.domain)}</dd><dt>Classification</dt><dd>${classBadge(p.classification)} <span class="muted small">${esc(IDX.classes[p.classification]?.refusal || '')}</span></dd>
    <dt>Quality</dt><dd ${srcAttr('synthetic')}>${pct(p.quality)}</dd><dt>Freshness</dt><dd>${esc(p.freshness)}</dd><dt>Certification</dt><dd>${p.certified ? '✓ Certified v1.0' : 'In certification'}</dd>
    <dt>Lifecycle</dt><dd><ol class="lifecycle">${D.dataProducts.lifecycle.map((s) => `<li class="${s === p.stage ? 'on' : ''}">${esc(s)}</li>`).join('')}</ol></dd>
    <dt>Access surfaces</dt><dd>${p.surfaces.map(esc).join(' · ')}</dd><dt>Certified KPIs</dt><dd>${p.certifiedKpis.map(esc).join(' · ')}</dd>
    <dt>Consuming agents</dt><dd>${p.agents.length ? p.agents.map((a) => agentChip(a)).join(' ') : 'All agents (audit) · UA-DI-12'}</dd></dl>`;
}

export function dpDrawer({ id }) {
  const p = IDX.products[id];
  if (!p) return notFound(id);
  walk('dp', p.id, p.name);
  return `<header class="dr-head">${closeBtn()}<p class="kicker">Data product · ${p.id}</p><h2 data-autofocus>${esc(p.name)}</h2><p class="dr-sub">${esc(p.description)}</p></header>
    <div class="kpi-row">${p.sampleKpis.map((k) => `<div ${srcAttr('synthetic')}><b>${esc(k.value)}</b><span>${esc(k.label)}</span></div>`).join('')}</div>
    ${dpFacts(p)}
    <div class="dr-actions"><a class="btn primary" href="#/dp/${p.id}/full">Open sample & Q&amp;A</a></div>`;
}

function dpQa(p) {
  const cls = IDX.classes[p.classification];
  const qa = [
    { q: 'Who owns it and how fresh is it?', a: `${p.owner}. Refreshed ${p.freshness.toLowerCase()}; quality ${pct(p.quality)} on its critical data elements (synthetic).` },
    { q: 'Can I see customer-level or restricted rows?', a: cls?.restricted ? `Not by default. ${cls.refusal}` : 'Yes, for internal roles with a business need. Samples here use masked identifiers.' },
    { q: 'Which KPIs are certified on it?', a: `${p.certifiedKpis.join(', ')}. Each has one certified definition in the glossary.` },
    { q: 'Which agents use it?', a: p.agents.length ? p.agents.map((a) => `${a} ${IDX.agents[a]?.name || ''}`).join('; ') : 'Every agent writes to it; the Agent Evaluation & Promotion Agent reads it.' },
    { q: 'How do I get access?', a: `Request it in the marketplace. ${cls?.restricted ? 'The data product owner approves, because the classification is restricted.' : 'Access is auto-approved within policy for a declared purpose, time-boxed.'}` },
  ];
  return qa.map((x, i) => `<details class="qa"${i === 0 ? ' open' : ''}><summary>${esc(x.q)}</summary><p>${esc(x.a)}</p></details>`).join('');
}

export function dpFull({ id }) {
  const p = IDX.products[id];
  if (!p) return `<div class="fv">${closeBtn()}<h2 data-autofocus>Not found</h2></div>`;
  walk('dp', p.id, p.name);
  const g = gen()[p.rows.generator](D.synthetic, D.fixtures);
  const cls = IDX.classes[p.classification];
  return `<div class="fv" data-dpfull="${p.id}">
    <header class="fv-head">${closeBtn()}<div><p class="kicker">Data product library · ${p.id}</p><h2 data-autofocus>${esc(p.name)}</h2></div><div class="fv-badges">${classBadge(p.classification)}</div></header>
    <section class="fv-sec"><h3>Sample KPIs</h3><div class="kpi-row">${p.sampleKpis.map((k) => `<div ${srcAttr('synthetic')}><b>${esc(k.value)}</b><span>${esc(k.label)}</span></div>`).join('')}</div></section>
    <section class="fv-sec"><h3>Sample rows <small class="muted">${fmt(g.count)} rows, regenerated in your browser from seed ${D.build.seed}</small></h3>
      ${cls?.restricted ? `<p class="mask-note">${icon('lock')} Masked sample: ${esc(cls.refusal)}</p>` : ''}
      <div data-sample></div>
      <div class="pager"><button class="btn" data-page="-1" aria-label="Previous rows">${icon('prev')}</button><span data-page-label></span><button class="btn" data-page="1" aria-label="Next rows">${icon('next')}</button></div></section>
    <section class="fv-sec"><h3>Facts</h3>${dpFacts(p)}</section>
    <section class="fv-sec"><h3>Ask about this product</h3>${dpQa(p)}</section>
  </div>`;
}

export function bindDpFull(node) {
  const root = node.querySelector('[data-dpfull]');
  if (!root) return;
  const p = IDX.products[root.dataset.dpfull];
  const g = gen()[p.rows.generator](D.synthetic, D.fixtures);
  let page = 0;
  const pages = Math.ceil(g.count / PAGE);
  const draw = () => {
    const rows = Array.from({ length: Math.min(PAGE, g.count - page * PAGE) }, (_, k) => g.row(page * PAGE + k));
    const cols = Object.keys(rows[0] || {});
    $('[data-sample]', root).innerHTML = `<div class="table-wrap"><table class="ptable sample"><thead><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td>${esc(typeof r[c] === 'number' ? fmt(r[c], Number.isInteger(r[c]) ? 0 : 2) : r[c])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    $('[data-page-label]', root).textContent = `Rows ${fmt(page * PAGE + 1)}–${fmt(page * PAGE + rows.length)} of ${fmt(g.count)}`;
  };
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-page]');
    if (!b) return;
    page = (page + Number(b.dataset.page) + pages) % pages;
    draw();
  });
  draw();
}

export function bindStack(node) {
  const btn = node.querySelector('[data-replay-flow]');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const steps = $$('[data-stack-step]', node);
    steps.forEach((s) => s.classList.remove('lit'));
    steps.forEach((s, i) => setTimeout(() => s.classList.add('lit'), i * 260));
  });
}
