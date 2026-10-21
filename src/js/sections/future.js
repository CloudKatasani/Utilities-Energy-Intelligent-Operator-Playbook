// 02 Future <Org> board (F1), motion lens, domain explorer and the outcome / domain / area / sub-area
// drawers (F2).
import { D, IDX, OT, esc, rich, sectionHead, closeBtn, autonomyBadge, motionBadge, tagLabel, agentChip, offeringLink, srcAttr, clientMode, LEVELS } from '../core/util.js';
import { state, set, walk } from '../core/state.js';
import { icon } from '../core/icons.js';

const LENSES = [{ id: 'all', short: 'All' }, ...D.motions.motions.map((m) => ({ id: m.id, short: m.short }))];
const agentsOf = (pred) => D.agents.agents.filter(pred);
const processesOf = (pred) => D.domains.processes.filter(pred);

export function autonomyMix(procs) {
  const n = procs.length || 1;
  const counts = LEVELS.map((l) => procs.filter((p) => p.autonomy === l).length);
  return `<div class="mix" role="img" aria-label="Autonomy mix: ${LEVELS.map((l, i) => `${l} ${counts[i]}`).join(', ')}">${counts.map((c, i) => (c ? `<span class="mix-seg lvl-bg-${i + 1}" style="width:${(c / n) * 100}%" title="L${i + 1}: ${c}"></span>` : '')).join('')}</div>
    <div class="mix-legend">${LEVELS.map((l, i) => `<span><i class="lvl-bg-${i + 1}"></i>${l} ${counts[i]}</span>`).join('')}</div>`;
}

function lensHit(kind, item, lens) {
  if (lens === 'all') return true;
  if (kind === 'family') return agentsOf((a) => a.family === item.id && a.motion === lens).length > 0;
  if (kind === 'layer') return item.motions.includes(lens);
  if (kind === 'outcome') return item.motion === lens || agentsOf((a) => a.motion === lens && a.outcomes.includes(item.id)).length > 0;
  if (kind === 'domain') return processesOf((p) => p.domainId === item.id && p.motion === lens).length > 0;
  return true;
}

function tile(kind, item, href, body, extraCls = '') {
  const hit = lensHit(kind, item, state.lens);
  return `<a class="tile tile-${kind} ${extraCls}${hit ? '' : ' dim'}" href="${href}" data-${kind}="${item.id}">${body}</a>`;
}

export function renderBoard() {
  const lens = state.lens;
  const outcomes = D.outcomes.outcomes.map((o) => tile('outcome', o, `#/outcome/${o.id}`, `${icon(o.icon)}<b>${esc(o.name)}</b>`)).join('');
  const domains = D.domains.domains.map((d) => {
    const areas = D.domains.areas.filter((a) => a.domainId === d.id);
    const n = processesOf((p) => p.domainId === d.id).length;
    return tile('domain', d, `#/domain/${d.id}`, `${icon(d.icon)}<span class="tile-num">${d.layer.replace('L', '0')}</span><b>${esc(d.name)}</b><small>${areas.length} operating areas · ${n} agent processes</small>`);
  }).join('');
  const families = D.families.families.map((f) => {
    const n = agentsOf((a) => a.family === f.id).length;
    const capped = agentsOf((a) => a.family === f.id && OT.agentsCapped.includes(a.id)).length;
    return tile('family', f, `#/family/${f.id}`, `<span class="fam-dot ${f.cls}"></span><b>${esc(f.short)}</b><small>${n} flagship agents · ${f.processCount} processes${capped ? ` · ${capped} OT-capped` : ''}</small>`, f.cls);
  }).join('');
  const layers = D.layers.layers.map((l) => tile('layer', l, `#/layer/${l.id}`, `${icon(l.icon)}<b>${esc(l.short)}</b>`)).join('');
  return `<section id="future" class="section dark board-section">
    <div class="wrap">
      ${sectionHead(D.site.board.kicker, D.site.board.title, D.site.board.lede, { dark: true, edit: 'site.board.title' })}
      <div class="lens-row"><span class="lens-label">${esc(D.site.board.lensLabel)}</span>
        <div class="seg seg-dark" role="group" aria-label="Motion lens">${LENSES.map((x) => `<button class="seg-btn${lens === x.id ? ' on' : ''}" data-lens="${x.id}" aria-pressed="${lens === x.id}">${esc(x.short)}</button>`).join('')}</div>
      </div>
      <div class="board">
        <div class="board-main">
          <div class="band"><h3 class="band-title">${esc(D.site.board.bands.outcomes)}</h3><div class="band-tiles five">${outcomes}</div></div>
          <div class="band"><h3 class="band-title">${esc(D.site.board.bands.domains)}</h3><div class="band-tiles four">${domains}</div></div>
          <div class="band"><h3 class="band-title">${esc(D.site.board.bands.families)}</h3><div class="band-tiles five">${families}</div></div>
          <div class="band"><h3 class="band-title">${esc(D.site.board.bands.foundation)}</h3><div class="band-tiles five">${layers}</div></div>
        </div>
        <a class="rail" href="#/control-plane" data-rail><span>${esc(D.site.board.bands.rail)}</span><small>${icon('lock')} OT safety rule · policy · evidence</small></a>
      </div>
      ${renderExplorer()}
    </div>
  </section>`;
}

function renderExplorer() {
  return `<div class="explorer" id="explorer">
    <h3 class="explorer-title">${esc(D.site.board.explorerTitle)}</h3>
    <p class="explorer-lede">${esc(D.site.board.explorerLede)}</p>
    <div class="explorer-cols">${D.domains.domains.map((d) => `<div class="ex-col">
      <a class="ex-domain" href="#/domain/${d.id}">${icon(d.icon)} <span>${d.layer.replace('L', '0')}</span> ${esc(d.name)}</a>
      ${D.domains.areas.filter((a) => a.domainId === d.id).map((a) => `<div class="ex-area">
        <a class="ex-area-name" href="#/area/${a.id}">${esc(a.name)}</a>
        <div class="ex-subs">${D.domains.subAreas.filter((s) => s.areaId === a.id).map((s) => `<a class="ex-sub" href="#/subarea/${s.id}" data-subarea="${s.id}">${esc(s.name)} <span class="tag tag-${s.commodity}">${esc(tagLabel(s.commodity))}</span></a>`).join('')}</div>
      </div>`).join('')}
    </div>`).join('')}</div>
  </div>`;
}

export function bindBoard(root) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lens]');
    if (!b) return;
    set({ lens: b.dataset.lens });
    walk('lens', b.dataset.lens, `Motion lens: ${b.textContent}`);
  });
}

// ---------------------------------------------------------------- drawers
const head = (kicker, title, sub = '') => `<header class="dr-head">${closeBtn()}<p class="kicker">${esc(kicker)}</p><h2 data-autofocus>${esc(title)}</h2>${sub ? `<p class="dr-sub">${rich(sub)}</p>` : ''}</header>`;
const block = (title, body) => `<section class="dr-block"><h3>${esc(title)}</h3>${body}</section>`;

export function outcomeDrawer({ id }) {
  const o = IDX.outcomes[id];
  if (!o) return notFound(id);
  walk('outcome', o.id, o.name);
  const agents = agentsOf((a) => a.outcomes.includes(o.id));
  const kpis = `<ul class="kpi-tree">${o.kpis.map((k) => `<li ${srcAttr(k.source)}><span>${esc(k.name)}</span>${k.value ? `<b>${esc(k.value)}</b>` : ''}</li>`).join('')}</ul>`;
  const sc = IDX.scenarios[o.scenario];
  return `${head('Business outcome', o.name, o.definition)}
    ${block('KPI tree', `${kpis}<p class="muted small">Reliability metrics follow IEEE 1366, with and without major event days. Values are synthetic; hover for the source.</p>`)}
    ${block('Domains that move it', `<div class="chips">${o.domains.map((d) => `<a class="chip" href="#/domain/${d}">${esc(IDX.domains[d].name)}</a>`).join('')}</div>`)}
    ${block(`Agents that move it (${agents.length})`, `<div class="chips">${agents.map((a) => agentChip(a.id)).join('')}</div>`)}
    ${block('Offerings', `<div class="chips">${o.offerings.map(offeringLink).join('')}</div>`)}
    ${block('Motion and demo', `<p>${motionBadge(o.motion)} ${sc ? `<a href="#/scenario/${sc.id}">▶ ${esc(sc.id)} ${esc(sc.title)}</a>` : ''}</p>`)}`;
}

export function domainDrawer({ id }) {
  const d = IDX.domains[id];
  if (!d) return notFound(id);
  walk('domain', d.id, d.name);
  const areas = D.domains.areas.filter((a) => a.domainId === d.id);
  const procs = processesOf((p) => p.domainId === d.id);
  return `${head(`Value-stream domain ${d.layer.replace('L', '0')}`, d.name, d.summary)}
    ${block('Autonomy mix', autonomyMix(procs))}
    ${block(`Operating areas (${areas.length})`, areas.map((a) => {
      const subs = D.domains.subAreas.filter((s) => s.areaId === a.id);
      return `<div class="area-card"><a class="area-card-name" href="#/area/${a.id}">${esc(a.name)}</a><p>${esc(a.summary)}</p>
        <div class="chips">${subs.map((s) => `<a class="chip" href="#/subarea/${s.id}">${esc(s.name)} <span class="tag tag-${s.commodity}">${esc(tagLabel(s.commodity))}</span></a>`).join('')}</div></div>`;
    }).join(''))}`;
}

export function areaDrawer({ id }) {
  const a = IDX.areas[id];
  if (!a) return notFound(id);
  walk('area', a.id, a.name);
  const subs = D.domains.subAreas.filter((s) => s.areaId === a.id);
  const procs = processesOf((p) => p.areaId === a.id);
  const now = procs.filter((p) => p.readiness === 'now').length;
  return `${head(`Operating area · ${IDX.domains[a.domainId].name}`, a.name, a.summary)}
    <div class="stat-row"><div><b>${subs.length}</b><span>sub-areas</span></div><div><b>${procs.length}</b><span>agent processes</span></div><div><b>${now}</b><span>deployable now</span></div><div><b>${procs.filter((p) => p.otCapped).length}</b><span>OT-capped at L2</span></div></div>
    ${block('Autonomy mix', autonomyMix(procs))}
    ${block('Sub-areas', subs.map((s) => `<a class="sub-card" href="#/subarea/${s.id}"><b>${esc(s.name)}</b> <span class="tag tag-${s.commodity}">${esc(tagLabel(s.commodity))}</span><p>${esc(s.description)}</p><small>${s.processIds.length} agent processes</small></a>`).join(''))}`;
}

export function processTable(procs) {
  return `<div class="table-wrap"><table class="ptable"><thead><tr><th>Process</th><th>Pattern · trigger</th><th>Autonomy</th><th>Value lever</th><th>Impact</th><th>Readiness</th><th>Motion</th></tr></thead><tbody>
    ${procs.map((p) => `<tr data-process="${p.id}"><td><b>${esc(p.process)}</b> <small>${p.id}</small><br>${esc(p.subProcess)}</td><td>${esc(p.agentPattern)}<br><small>${esc(p.trigger)}</small></td>
      <td>${autonomyBadge(p.autonomy, { capped: p.otCapped, title: p.otCapped ? OT.tooltip : '' })}</td><td>${esc(p.valueLever)}</td>
      <td><span ${srcAttr(p.source)}>${esc(p.estimatedImpact.replace(' [validate]', ''))}</span>${p.validated ? '' : ' <span class="validate">validate</span>'}</td>
      <td><span class="ready ready-${p.readiness === 'now' ? 'now' : 'later'}">${p.readiness === 'now' ? 'Now' : esc(p.readiness.replace('mo', ' months'))}</span></td><td>${motionBadge(p.motion)}</td></tr>`).join('')}
  </tbody></table></div>`;
}

export function subAreaDrawer({ id }) {
  const s = IDX.subAreas[id];
  if (!s) return notFound(id);
  walk('subarea', s.id, s.name);
  const area = IDX.areas[s.areaId];
  const dom = IDX.domains[s.domainId];
  const procs = s.processIds.map((p) => IDX.processes[p]);
  const offers = D.offerings.offerings.filter((o) => o.areas.includes(s.areaId) && (!clientMode() || o.validated));
  const agents = agentsOf((a) => a.operatingArea === s.areaId);
  const scen = D.scenarios.scenarios.filter((sc) => sc.agents.some((x) => agents.some((a) => a.id === x)));
  return `${head(`${area.name} · ${dom.layer} ${dom.name}`, s.name, `<span class="tag tag-${s.commodity}">${esc(tagLabel(s.commodity))}</span> · Family: <a href="#/family/${s.family}">${esc(IDX.families[s.family].short)}</a>`)}
    ${block('What it covers', `<p>${esc(s.description)}</p>`)}
    ${block('KPIs that matter', `<div class="chips">${s.kpis.map((k) => `<a class="chip kpi-chip" href="#/impact" ${srcAttr('synthetic', 'Open the value calculator')}>${esc(k)}</a>`).join('')}</div>`)}
    ${block(`Where AI agents act (${procs.length})`, `${processTable(procs)}${procs.some((p) => p.otCapped) ? `<p class="ot-note">${icon('lock')} ${esc(OT.tooltip)}</p>` : ''}`)}
    ${agents.length ? block('Flagship agents in this area', `<div class="chips">${agents.map((a) => agentChip(a.id)).join('')}</div>`) : ''}
    ${block('How we help', offers.length ? `<div class="chips">${offers.map((o) => offeringLink(o.id)).join('')}</div>` : '<p class="muted">Offer mapping pending validation.</p>')}
    ${scen.length ? block('Related demo', scen.map((sc) => `<a class="demo-link" href="#/scenario/${sc.id}">▶ ${esc(sc.id)} ${esc(sc.title)}</a>`).join(' ')) : ''}`;
}

export const notFound = (id) => `<header class="dr-head">${closeBtn()}<h2 data-autofocus>Not found</h2><p>Nothing matches “${esc(id)}”.</p></header>`;

// Board highlight for the open drawer: related tiles light up, others dim; cleared on close.
export function highlight(route) {
  const board = document.getElementById('future');
  if (!board) return;
  board.querySelectorAll('.hl').forEach((x) => x.classList.remove('hl'));
  board.classList.remove('has-hl');
  const m = route && route.match(/^#\/(outcome|family|domain|layer)\/([^/]+)$/);
  if (!m) return;
  const [, kind, id] = m;
  const mark = (sel) => board.querySelectorAll(sel).forEach((x) => x.classList.add('hl'));
  board.classList.add('has-hl');
  mark(`[data-${kind}="${id}"]`);
  if (kind === 'outcome') {
    const o = IDX.outcomes[id];
    o.domains.forEach((d) => mark(`[data-domain="${d}"]`));
    o.families.forEach((f) => mark(`[data-family="${f}"]`));
  }
  if (kind === 'family') IDX.families[id].outcomes.forEach((o) => mark(`[data-outcome="${o}"]`));
  if (kind === 'layer') mark('[data-rail]');
}
