// 05 Proof: offerings catalog and offering pages (F7), the demo theater (F8) and case studies (F9).
import { D, IDX, esc, rich, attr, sectionHead, closeBtn, motionBadge, srcAttr, agentChip, dpChip, clientMode, relabel } from '../core/util.js';
import { state, set, walk } from '../core/state.js';
import { icon } from '../core/icons.js';
import { scenarioView } from './scenarios.js';

const OPTS = D.shared.engine.engagementOptions;
let filters = { motion: 'all', domain: 'all', buyer: 'all', maturity: 'all' };

export function renderProof() {
  return `<section id="proof" class="section light proof-section"><div class="wrap">
    ${sectionHead(D.site.proof.kicker, D.site.proof.title)}
    <div class="proof-cards">${D.site.proof.cards.map((c) => `<a class="proof-card" href="${c.route}" data-proof="${c.id}"><b>${esc(c.title)}</b><p>${esc(c.text)}</p><span class="open-link">Open ▸</span></a>`).join('')}</div>
  </div></section>`;
}

const pageHead = (kicker, title, sub = '') => `<header class="pg-head">${closeBtn()}<p class="kicker">${esc(kicker)}</p><h1 data-autofocus>${esc(title)}</h1>${sub ? `<p class="lede">${rich(sub)}</p>` : ''}</header>`;

function footprint(o) {
  return `<span class="footprint" aria-label="Domains: ${attr(o.domains.join(', '))}">${D.domains.domains.map((d) => `<i class="${o.domains.includes(d.id) ? 'on' : ''}" title="${attr(d.name)}"></i>`).join('')}</span>`;
}

function filterRow(name, label, values) {
  return `<div class="filter"><span>${esc(label)}</span>${['all', ...values].map((v) => `<button class="chip-btn${filters[name] === v ? ' on' : ''}" data-filter="${name}" data-value="${attr(v)}" aria-pressed="${filters[name] === v}">${esc(v === 'all' ? 'All' : (IDX.motions[v]?.short || IDX.domains[v]?.name || v))}</button>`).join('')}</div>`;
}

export function offeringsPage() {
  walk('page', 'offerings', 'Offerings catalog');
  const list = D.offerings.offerings.filter((o) => (filters.motion === 'all' || o.motion === filters.motion) && (filters.domain === 'all' || o.domains.includes(filters.domain)) && (filters.buyer === 'all' || o.buyers.includes(filters.buyer)) && (filters.maturity === 'all' || o.maturity === filters.maturity));
  const buyers = [...new Set(D.offerings.offerings.flatMap((o) => o.buyers))];
  return `<div class="page" data-offerings>${pageHead('05 | Proof · Offerings', 'Offerings catalog', 'Thirteen offerings mapped to Engineer, Operate, Decide & Act and the control plane. Emerging offerings are pending offer-owner validation.')}
    <div class="filters">${filterRow('motion', 'Motion', D.motions.motions.map((m) => m.id))}${filterRow('domain', 'Domain', D.domains.domains.map((d) => d.id))}${filterRow('buyer', 'Buyer', buyers)}${filterRow('maturity', 'Maturity', ['established', 'emerging'])}</div>
    <div class="off-grid">${list.map((o) => `<a class="off-card" href="#/offering/${o.id}" data-offering="${o.id}">
      <header>${motionBadge(o.motion)} <small>${o.id}</small>${o.scenarioIds.length ? '<span class="pill pill-on">Has demo</span>' : ''}${o.maturity === 'emerging' ? '<span class="pill">Emerging</span>' : ''}</header>
      <b>${esc(o.name)}</b><p>${esc(o.promise)}</p>
      <div class="off-kpis">${o.kpis.map((k) => `<span ${srcAttr(k.source)}><b>${esc(k.value)}</b> ${esc(k.label)}</span>`).join('')}</div>${footprint(o)}</a>`).join('') || '<p class="muted">No offering matches these filters.</p>'}</div>
    <h2 class="sub-h">Where each offering activates the ${esc(D.industry.labels.boardName)}</h2>
    <div class="activation"><table class="ptable"><thead><tr><th>Offering</th>${D.domains.domains.map((d) => `<th>${esc(d.name)}</th>`).join('')}<th>Families</th></tr></thead><tbody>
      ${D.offerings.offerings.map((o) => `<tr><td><a href="#/offering/${o.id}">${esc(o.name)}</a></td>${D.domains.domains.map((d) => `<td class="act-cell">${o.domains.includes(d.id) ? '●' : ''}</td>`).join('')}<td>${[...new Set(o.agents.map((a) => IDX.families[IDX.agents[a].family].short))].map(esc).join(' · ')}</td></tr>`).join('')}</tbody></table></div>
  </div>`;
}

export function bindOfferings(node) {
  const root = node.querySelector('[data-offerings]');
  if (!root) return;
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-filter]');
    if (!b) return;
    filters = { ...filters, [b.dataset.filter]: b.dataset.value };
    node.innerHTML = relabel(offeringsPage());
    bindOfferings(node);
  });
}

function boxHtml(o, opt, row, b) {
  const inScope = row.layer !== 'foundation' || opt.layersInScope.includes(b.layerId);
  const label = b.layerId ? IDX.layers[b.layerId].short : b.label;
  return `<a class="arch-box${inScope ? ' in-scope' : ''}${b.agentId ? ' arch-agent' : ''}" href="#/offering/${o.id}/${state.offeringOption[o.id] || 'assess'}/box/${b.id}" ${b.agentId ? `data-agent="${b.agentId}"` : ''}>${esc(label)}${b.agentId ? `<small>${b.agentId}</small>` : ''}</a>`;
}

export function offeringPage({ id, opt }) {
  const o = IDX.offerings[id];
  if (!o) return `<div class="page">${pageHead('Offering', 'Not found')}</div>`;
  const optId = opt && o.options[opt] ? opt : (state.offeringOption[o.id] || 'assess');
  if (state.offeringOption[o.id] !== optId) set({ offeringOption: { ...state.offeringOption, [o.id]: optId } }, { silent: true });
  const meta = OPTS.find((x) => x.id === optId);
  const op = o.options[optId];
  walk('offering', o.id, `${o.name} — ${meta.name}`);
  const checks = state.checklist[o.id] || {};
  const groups = D.shared.engine.checklistGroups;
  const statusCount = (s) => Object.values(checks).filter((x) => x === s).length;
  const total = groups.reduce((n, g) => n + o.checklist[g.id].length, 0);
  return `<div class="page" data-offering-page="${o.id}">${pageHead(`Offering ${o.id} · ${IDX.motions[o.motion].name}`, o.name, o.promise)}
    <p class="off-meta">${motionBadge(o.motion)} ${o.maturity === 'emerging' ? '<span class="pill">Emerging · pending validation</span>' : '<span class="pill pill-on">Established</span>'} · Buyers: ${o.buyers.map(esc).join(', ')}</p>
    <div class="off-kpis big">${o.kpis.map((k) => `<span ${srcAttr(k.source)}><b>${esc(k.value)}</b> ${esc(k.label)}</span>`).join('')}</div>
    <h2 class="sub-h">Engagement options</h2>
    <div class="seg" role="group" aria-label="Engagement option">${OPTS.map((x) => `<a class="seg-btn${x.id === optId ? ' on' : ''}" href="#/offering/${o.id}/${x.id}" aria-pressed="${x.id === optId}" data-opt="${x.id}">${esc(x.name)}</a>`).join('')}</div>
    <div class="opt-card"><div><b>${esc(meta.duration)}</b><span>Duration</span></div><div><b>${esc(meta.gets)}</b><span>You get</span></div><div><b>${esc(op.scope)}</b><span>In scope</span></div><div><b>${esc(meta.exit)}</b><span>Exit criteria</span></div></div>
    <h2 class="sub-h">Reference architecture <small class="muted">— every box opens; highlighted layers are in scope for ${esc(meta.name)}</small></h2>
    <div class="arch"><div class="arch-rows">${o.architecture.map((row) => `<div class="arch-row"><span class="arch-row-name">${esc(row.name)}</span><div class="arch-boxes">${row.boxes.map((b) => boxHtml(o, op, row, b)).join('')}</div></div>`).join('')}</div>
      <a class="rail arch-rail" href="#/control-plane">${esc(D.layers.controlPlane.name)}<small>${icon('lock')} OT safety rule</small></a></div>
    <h2 class="sub-h">What it takes to succeed <small class="muted">— ${statusCount('Have')} have · ${statusCount('Partial')} partial · ${statusCount('Gap')} gap of ${total}</small></h2>
    <div class="checklist">${groups.map((g) => `<div class="check-group"><h4>${esc(g.name)}</h4>${o.checklist[g.id].map((item) => {
      const cur = checks[item];
      return `<div class="check-item"><span>${esc(item)}</span><span class="status-chips">${D.shared.engine.checklistStatuses.map((s) => `<button class="status s-${s.toLowerCase()}${cur === s ? ' on' : ''}" data-check="${attr(item)}" data-status="${s}" aria-pressed="${cur === s}">${s}</button>`).join('')}</span></div>`;
    }).join('')}</div>`).join('')}</div>
    <h2 class="sub-h">Demo and proof</h2>
    <p>${o.scenarioIds.map((s) => `<a class="btn primary" href="#/scenario/${s}">▶ Watch the demo: ${esc(s)} ${esc(IDX.scenarios[s].title)}</a>`).join(' ')}</p>
    <p class="muted">Approved utility proof points will appear here once offer owners supply them (see <a href="#/cases">case studies</a>).</p>
    ${clientMode() ? '' : `<div class="presenter-only"><h2 class="sub-h">Offer team <small class="muted">(presenter mode only)</small></h2><p>${o.team.map(esc).join(' · ')}</p>
      <h2 class="sub-h">Objection handling</h2>${o.objections.map((x) => `<details class="qa"><summary>${esc(x.q)}</summary><p>${esc(x.a)}</p></details>`).join('')}</div>`}
  </div>`;
}

export function bindOfferingPage(node) {
  const root = node.querySelector('[data-offering-page]');
  if (!root) return;
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-check]');
    if (!b) return;
    const id = root.dataset.offeringPage;
    const cur = { ...(state.checklist[id] || {}) };
    cur[b.dataset.check] = cur[b.dataset.check] === b.dataset.status ? undefined : b.dataset.status;
    set({ checklist: { ...state.checklist, [id]: cur } }, { silent: true });
    const st = node.scrollTop;
    node.innerHTML = relabel(offeringPage({ id }));
    node.scrollTop = st;
    bindOfferingPage(node);
  });
}

export function boxDrawer({ id, opt, box }) {
  const o = IDX.offerings[id];
  const b = o?.architecture.flatMap((r) => r.boxes.map((x) => ({ ...x, row: r }))).find((x) => x.id === box);
  if (!b) return `<header class="dr-head">${closeBtn()}<h2 data-autofocus>Not found</h2></header>`;
  const op = o.options[opt] || o.options.assess;
  const meta = OPTS.find((x) => x.id === (o.options[opt] ? opt : 'assess'));
  if (b.layerId) {
    const l = IDX.layers[b.layerId];
    return `<header class="dr-head">${closeBtn()}<p class="kicker">Inside this layer · ${esc(o.name)}</p><h2 data-autofocus>${esc(l.name)}</h2><p class="dr-sub">${esc(l.purpose)}</p></header>
      <section class="dr-block"><h3>In scope for ${esc(meta.name)}</h3><p>${op.layersInScope.includes(l.id) ? `Yes — ${esc(op.scope)}.` : 'Not in this option; assessed only.'}</p></section>
      <section class="dr-block"><h3>Components</h3><ul class="ticks">${l.components.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></section>
      <section class="dr-block"><h3>Data products</h3><div class="chips">${o.dataProducts.map(dpChip).join('')}</div></section>
      <section class="dr-block"><h3>Governed by the control plane</h3><p>${esc(l.governed)}</p></section>
      <p><a href="#/layer/${l.id}">Open the full layer drawer ▸</a></p>`;
  }
  if (b.agentId) {
    const a = IDX.agents[b.agentId];
    return `<header class="dr-head">${closeBtn()}<p class="kicker">Inside this box · ${esc(o.name)}</p><h2 data-autofocus>${esc(a.name)}</h2><p class="dr-sub">${esc(a.mission)}</p></header>
      <section class="dr-block"><h3>In scope for ${esc(meta.name)}</h3><p>${esc(op.scope)}</p></section>
      <section class="dr-block"><h3>Agent</h3><p>${agentChip(a.id)} — double-click any agent for the full view.</p><div class="dr-actions"><a class="btn primary" href="#/agent/${a.id}/full">Open full view</a></div></section>
      <section class="dr-block"><h3>Integrations</h3><p>${a.systems.map(esc).join(' · ')}</p></section>
      <section class="dr-block"><h3>Roles</h3><p>${a.roles.map(esc).join(' · ')}</p></section>`;
  }
  return `<header class="dr-head">${closeBtn()}<p class="kicker">Inside this box · ${esc(o.name)}</p><h2 data-autofocus>${esc(b.label)}</h2><p class="dr-sub">${esc(b.text || '')}</p></header>
    ${b.dpId ? `<section class="dr-block"><h3>Data product</h3><p>${dpChip(b.dpId)}</p></section>` : ''}
    <section class="dr-block"><h3>In scope for ${esc(meta.name)}</h3><p>${esc(op.scope)}</p></section>
    <section class="dr-block"><h3>Accelerators</h3><ul class="ticks"><li>Utility data model (CIM-aligned) and glossary</li><li>Agent templates with the OT cap built in</li><li>Evaluation suites and evidence trail</li></ul></section>`;
}

export function scenariosPage() {
  walk('page', 'scenarios', 'Demo theater');
  return `<div class="page">${pageHead('05 | Proof · Demo theater', 'Demo theater', `Nine scenarios on ${esc(D.industry.labels.yourOrg)}. Each plays offline, pauses at every step, and every agent opens.`)}
    <div class="sc-grid">${D.scenarios.scenarios.map((s) => `<a class="sc-card" href="#/scenario/${s.id}" data-scenario-card="${s.id}"><header>${motionBadge(s.motion)} <small>${s.id}</small></header><b>${esc(s.title)}</b><p>${rich(s.summary)}</p><small>${esc(s.persona)} · ${s.agents.length} agents</small></a>`).join('')}</div></div>`;
}

export function scenarioPage({ id }) {
  const sc = IDX.scenarios[id];
  if (!sc) return `<div class="page">${pageHead('Scenario', 'Not found')}</div>`;
  walk('scenario', sc.id, `${sc.id} ${sc.title}`);
  const i = D.scenarios.scenarios.indexOf(sc);
  const prev = D.scenarios.scenarios[i - 1], next = D.scenarios.scenarios[i + 1];
  return `<div class="page">${pageHead(`Demo theater · ${sc.id}`, sc.title)}${scenarioView(sc)}
    <nav class="sc-nav">${prev ? `<a href="#/scenario/${prev.id}">‹ ${esc(prev.id)} ${esc(prev.title)}</a>` : '<span></span>'}<a href="#/scenarios">All scenarios</a>${next ? `<a href="#/scenario/${next.id}">${esc(next.id)} ${esc(next.title)} ›</a>` : '<span></span>'}</nav></div>`;
}

let caseFilters = {};
export function casesPage() {
  walk('page', 'cases', 'Case studies');
  const all = D.proof.cases;
  const visible = all.filter((c) => (!clientMode() || c.approvedExternal) && Object.entries(caseFilters).every(([k, v]) => !v || v === 'all' || c[k] === v));
  return `<div class="page" data-cases>${pageHead('05 | Proof · Case studies', 'Case studies', 'Anonymised descriptors only. Client mode shows only cases approved for external use.')}
    <div class="filters">${D.proof.filters.map((f) => `<div class="filter"><span>${esc(f)}</span>${['all', ...new Set(all.map((c) => c[f]))].map((v) => `<button class="chip-btn${(caseFilters[f] || 'all') === v ? ' on' : ''}" data-cfilter="${f}" data-value="${attr(v)}">${esc(v === 'all' ? 'All' : (IDX.outcomes[v]?.name || IDX.domains[v]?.name || IDX.motions[v]?.short || v))}</button>`).join('')}</div>`).join('')}</div>
    ${visible.length ? `<div class="sc-grid">${visible.map((c) => `<article class="case-card${c.placeholder ? ' placeholder' : ''}"><header>${motionBadge(c.motion)} <small>${c.id}</small>${c.approvedExternal ? '<span class="pill pill-on">Approved</span>' : '<span class="pill">Not approved for external use</span>'}</header><b>${esc(c.title)}</b><p>${esc(c.client)} · ${esc(c.region)}</p><p><b>Problem:</b> ${esc(c.problem)}</p><p class="muted">${esc(c.result)}</p></article>`).join('')}</div>`
      : `<p class="empty-note">Approved utility case studies are available on request from the offer team.</p>`}
  </div>`;
}

export function bindCases(node) {
  const root = node.querySelector('[data-cases]');
  if (!root) return;
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cfilter]');
    if (!b) return;
    caseFilters = { ...caseFilters, [b.dataset.cfilter]: b.dataset.value };
    node.innerHTML = relabel(casesPage());
    bindCases(node);
  });
}

export const resetProofFilters = () => { filters = { motion: 'all', domain: 'all', buyer: 'all', maturity: 'all' }; caseFilters = {}; };
