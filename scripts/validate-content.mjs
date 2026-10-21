// Content validator, per industry pack: counts, cross-references, the OT safety rule, sources and
// validation flags on every metric, calculator formulas (only known identifiers), routes written in
// content, unresolved tokens and placeholder text. Exits non-zero on any problem.
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, loadPack, selectedPacks } from './lib/content.mjs';
import { resolveTokens, tokenContext } from './lib/tokens.mjs';
import { compile } from '../src/js/core/expr.js';
import { ROUTES, routeRe } from '../src/js/core/route-table.js';

let failed = 0;
for (const id of selectedPacks()) {
  const c = loadPack(id, { requireSynthetic: true });
  const mod = await import(pathToFileURL(join(ROOT, `src/js/data/industries/${id}.js`)).href);
  const errors = [];
  const err = (m) => errors.push(m);
  const ids = (arr) => new Set(arr.map((x) => x.id));
  const ind = c.industry;
  const dom = c.domains;
  const agents = c.agents.agents;
  const S = {
    domains: ids(dom.domains), areas: ids(dom.areas), subAreas: ids(dom.subAreas), processes: ids(dom.processes),
    families: ids(c.families.families), agents: ids(agents), products: ids(c.dataProducts.products), offerings: ids(c.offerings.offerings),
    scenarios: ids(c.scenarios.scenarios), layers: ids(c.layers.layers), outcomes: ids(c.outcomes.outcomes), motions: ids(c.motions.motions),
    classes: ids(ind.classifications), sources: ids(c.sources.sources),
  };
  const ref = (set, value, where) => { if (!S[set].has(value)) err(`${where}: unknown ${set} "${value}"`); };
  const LV = (l) => Number(String(l).replace('L', ''));

  // Counts
  const n = ind.expectedCounts;
  const count = (label, actual, expected) => { if (actual !== expected) err(`count: ${label} = ${actual}, expected ${expected}`); };
  count('domains', dom.domains.length, n.domains); count('areas', dom.areas.length, n.areas); count('sub-areas', dom.subAreas.length, n.subAreas);
  if (dom.processes.length < n.processesMin) err(`count: processes = ${dom.processes.length}, expected at least ${n.processesMin}`);
  count('families', c.families.families.length, n.families); count('agents', agents.length, n.agents); count('data products', c.dataProducts.products.length, n.products);
  count('offerings', c.offerings.offerings.length, n.offerings); count('scenarios', c.scenarios.scenarios.length, n.scenarios); count('layers', c.layers.layers.length, n.layers);
  count('outcomes', c.outcomes.outcomes.length, n.outcomes); count('audiences', c.presenter.audiences.length, n.audiences);
  count('scripted agents', agents.filter((a) => a.script).length, n.scriptedAgents);
  ind.scriptedAgents.forEach((a) => { if (!agents.find((x) => x.id === a)?.script) err(`agent ${a}: spec §7.2 requires a hand-scripted run`); });

  // Domains
  dom.areas.forEach((a) => ref('domains', a.domainId, `area ${a.id}`));
  dom.subAreas.forEach((s) => {
    ref('areas', s.areaId, `sub-area ${s.id}`); ref('families', s.family, `sub-area ${s.id}`);
    if (!ind.subAreaTags[s.commodity]) err(`sub-area ${s.id}: unknown commodity tag ${s.commodity}`);
    s.processIds.forEach((p) => ref('processes', p, `sub-area ${s.id}`));
    if (!s.kpis?.length) err(`sub-area ${s.id}: no KPIs`);
  });
  dom.processes.forEach((p) => {
    ref('subAreas', p.subAreaId, `process ${p.id}`); ref('families', p.family, `process ${p.id}`); ref('motions', p.motion, `process ${p.id}`);
    if (!['L1', 'L2', 'L3', 'L4'].includes(p.autonomy)) err(`process ${p.id}: bad autonomy ${p.autonomy}`);
    if (!p.source || p.validated === undefined) err(`process ${p.id}: missing source/validated flags`);
  });

  // OT safety rule (spec §0): capped agents and OT-adjacent processes never exceed the cap.
  const cap = LV(ind.otSafety.capLevel);
  ind.otSafety.agentsCapped.forEach((aid) => {
    const a = agents.find((x) => x.id === aid);
    if (!a) { err(`OT cap: unknown agent ${aid}`); return; }
    if (LV(a.autonomyMax) > cap || LV(a.autonomyDefault) > cap) err(`OT cap: ${aid} autonomy ${a.autonomyDefault} → ${a.autonomyMax} exceeds ${ind.otSafety.capLevel}`);
  });
  const patterns = ind.otSafety.processPatterns.map((x) => x.toLowerCase());
  dom.processes.forEach((p) => {
    const text = `${p.process} ${p.subProcess}`.toLowerCase();
    if (patterns.some((x) => text.includes(x)) && !p.otCapped) err(`OT cap: process ${p.id} (${p.process}) matches an OT pattern but is not marked otCapped`);
    if (p.otCapped && LV(p.autonomy) > cap) err(`OT cap: process ${p.id} is OT-capped but set to ${p.autonomy}`);
  });

  // Agents
  agents.forEach((a) => {
    const w = `agent ${a.id}`;
    ref('families', a.family, w); ref('motions', a.motion, w); ref('areas', a.operatingArea, w); ref('offerings', a.offering, w);
    a.outcomes.forEach((o) => ref('outcomes', o, w));
    if (LV(a.autonomyDefault) > LV(a.autonomyMax)) err(`${w}: default autonomy above max`);
    a.dataProducts.filter((r) => /^UDP-/.test(r)).forEach((r) => ref('products', r.split(' ')[0], w));
    if (!a.qa || a.qa.length < 2) err(`${w}: needs at least 2 bespoke Q&As (3 standard ones are added at runtime)`);
    if (!a.value?.source || a.value.validated === undefined) err(`${w}: value range needs source/validated flags`);
    if (a.script) {
      if (!a.script.steps?.length || !a.script.answer) err(`${w}: script incomplete`);
      Object.keys(a.script.knockouts || {}).forEach((k) => { if (!c.agents.knockoutLabels[k]) err(`${w}: unknown knockout ${k}`); });
      (a.script.handoffs || []).forEach((h) => ref('agents', h, `${w} hand-off`));
    }
  });

  // Data products
  c.dataProducts.products.forEach((p) => {
    const w = `data product ${p.id}`;
    ref('classes', p.classification, w);
    p.agents.forEach((a) => ref('agents', a, w));
    if (!mod.generators[p.rows?.generator]) err(`${w}: unknown row generator ${p.rows?.generator}`);
  });

  // Families, outcomes, layers, motions, offerings, scenarios, presenter
  c.families.families.forEach((f) => { f.outcomes.forEach((o) => ref('outcomes', o, `family ${f.id}`)); f.dataProducts.forEach((p) => ref('products', p, `family ${f.id}`)); });
  c.outcomes.outcomes.forEach((o) => {
    const w = `outcome ${o.id}`;
    o.domains.forEach((d) => ref('domains', d, w)); o.families.forEach((f) => ref('families', f, w)); o.offerings.forEach((x) => ref('offerings', x, w));
    ref('scenarios', o.scenario, w); ref('motions', o.motion, w);
    o.kpis.forEach((k) => { if (!k.source) err(`${w}: KPI ${k.name} has no source`); });
  });
  c.layers.layers.forEach((l) => { l.offerings.forEach((x) => ref('offerings', x, `layer ${l.id}`)); l.motions.forEach((m) => ref('motions', m, `layer ${l.id}`)); ref('agents', l.failure.agent, `layer ${l.id}`); });
  c.layers.controlPlane.agents.forEach((a) => ref('agents', a, 'control plane'));
  c.motions.motions.forEach((m) => {
    const w = `motion ${m.id}`;
    m.agentIds.forEach((a) => ref('agents', a, w)); m.offeringIds.forEach((o) => ref('offerings', o, w)); ref('scenarios', m.scenarioId, w);
    (m.stages || []).forEach((s) => ref('scenarios', s.scenarioId, w));
    m.kpis.forEach((k) => { if (!k.source || k.validated === undefined) err(`${w}: KPI "${k.label}" needs source/validated flags`); });
  });
  c.motions.plan.rules.forEach((r) => ref('motions', r.start, 'acceleration plan'));
  c.offerings.offerings.forEach((o) => {
    const w = `offering ${o.id}`;
    ref('motions', o.motion, w); o.domains.forEach((d) => ref('domains', d, w)); o.areas.forEach((a) => ref('areas', a, w));
    o.agents.forEach((a) => ref('agents', a, w)); o.dataProducts.forEach((p) => ref('products', p, w)); o.scenarioIds.forEach((s) => ref('scenarios', s, w));
    o.kpis.forEach((k) => { if (!k.source || k.validated === undefined) err(`${w}: KPI "${k.label}" needs source/validated flags`); });
    c.shared.engine.engagementOptions.forEach((opt) => { if (!o.options[opt.id]) err(`${w}: missing option ${opt.id}`); else o.options[opt.id].layersInScope.forEach((l) => ref('layers', l, `${w} ${opt.id}`)); });
    o.architecture.forEach((row) => row.boxes.forEach((b) => { if (b.agentId) ref('agents', b.agentId, w); if (b.dpId) ref('products', b.dpId, w); if (b.layerId) ref('layers', b.layerId, w); }));
    c.shared.engine.checklistGroups.forEach((g) => { if (!o.checklist[g.id]?.length) err(`${w}: checklist group ${g.id} empty`); });
    const emergingRequired = Number(o.id.replace('U-O', '')) >= 4;
    if (emergingRequired && (o.maturity !== 'emerging' || o.validated !== false)) err(`${w}: spec §9 requires maturity emerging and validated false`);
  });
  c.scenarios.scenarios.forEach((s) => {
    const w = `scenario ${s.id}`;
    ref('motions', s.motion, w); ref('outcomes', s.outcome, w);
    s.agents.forEach((a) => ref('agents', a, w)); s.steps.forEach((st) => ref('agents', st.agentId, `${w} step "${st.title}"`));
    if (!s.kpis?.length) err(`${w}: no before/after KPIs`);
  });
  c.presenter.audiences.forEach((a) => {
    const w = `audience ${a.id}`;
    ref('outcomes', a.outcome, w); ref('motions', a.motion, w); ref('scenarios', a.scenario, w); a.offerings.forEach((o) => ref('offerings', o, w));
  });
  if (c.proof.cases.some((x) => x.approvedExternal)) err('proof: spec §11 starts with no approved utility case studies');

  // Routes written in content resolve to a route and to existing items.
  const checkRoute = (r, w) => {
    const path = r.replace(/^#/, '');
    const hit = ROUTES.find(([p]) => routeRe(p).test(path));
    if (!hit) { err(`${w}: route ${r} matches no route`); return; }
    const m = path.match(/^\/(outcome|domain|area|subarea|family|agent|layer|dp|offering|scenario)\/([^/]+)/);
    if (m) ref({ outcome: 'outcomes', domain: 'domains', area: 'areas', subarea: 'subAreas', family: 'families', agent: 'agents', layer: 'layers', dp: 'products', offering: 'offerings', scenario: 'scenarios' }[m[1]], m[2], w);
    const acc = path.match(/^\/accelerate\/(.+)$/);
    if (acc) ref('motions', acc[1], w);
  };
  c.presenter.runSheets.forEach((rs) => rs.steps.forEach((st) => checkRoute(st.route, `run sheet ${rs.id}`)));
  c.site.hero.ctas.forEach((x) => checkRoute(x.route, 'hero CTA'));
  c.site.proof.cards.forEach((x) => checkRoute(x.route, 'proof card'));
  checkRoute(c.site.closing.cta.route, 'closing CTA');

  // Why now: every signal cites a published source.
  c.site.why.cards.forEach((card) => card.signals.forEach((s) => {
    [s.source, s.source2].filter(Boolean).forEach((x) => { ref('sources', x, `why-now ${card.num}`); if (c.sources.sources.find((y) => y.id === x)?.type !== 'published') err(`why-now ${card.num}: source ${x} not marked published`); });
  }));

  // Calculator: formulas compile against known identifiers only (spec C2).
  const calc = c.calculator;
  const inputIds = calc.inputs.map((i) => i.id);
  const factorIds = calc.levers.map((l) => l.factor);
  const fx = c.scenarioFixtures;
  calc.levers.forEach((l) => {
    try { compile(l.formula, [...inputIds, ...factorIds]); } catch (e) { err(`calculator lever ${l.id}: ${e.message}`); }
    ref('outcomes', l.outcome, `calculator lever ${l.id}`); ref('motions', l.motion, `calculator lever ${l.id}`);
    l.agents.forEach((a) => ref('agents', a, `calculator lever ${l.id}`));
    if (!(l.conservative <= l.expected)) err(`calculator lever ${l.id}: conservative above expected`);
    if (!l.source) err(`calculator lever ${l.id}: no source`);
  });
  calc.derived.forEach((d, i) => {
    try { compile(d.formula, [...inputIds, ...factorIds, ...calc.levers.map((l) => l.id), ...calc.derived.slice(0, i).map((x) => x.id)]); } catch (e) { err(`calculator derived ${d.id}: ${e.message}`); }
  });
  if (calc.inputs.find((i) => i.id === 'stormOm')?.default * 1e6 !== fx.storm.annualStormOm) err('calculator: storm O&M default does not match the storm fixture');

  // Readiness
  const pillars = new Set(c.readiness.pillars.map((p) => p.id));
  c.readiness.questions.forEach((q) => { if (!pillars.has(q.pillar)) err(`readiness ${q.id}: unknown pillar`); if (q.blocker && !c.readiness.blockers[q.blocker]) err(`readiness ${q.id}: unknown blocker`); if (c.readiness.referenceDefaults[q.id] === undefined) err(`readiness ${q.id}: no reference default`); });
  if (c.readiness.questions.length !== 12 || c.readiness.pillars.length !== 8) err('readiness: spec §10.3 requires 12 questions over 8 pillars');

  // Tokens and placeholders
  const { shared, synthetic, scenarioFixtures, packDir, ...rest } = c;
  const missing = [];
  const resolved = resolveTokens(rest, tokenContext(c), missing);
  missing.forEach((m) => err(`unresolved token ${m}`));
  const text = JSON.stringify(resolved);
  for (const bad of [/\bTBD\b/, /lorem ipsum/i, /\bTODO\b/, /\{\{/]) if (bad.test(text)) err(`placeholder text matches ${bad}`);

  if (errors.length) { failed += errors.length; console.error(`✗ ${id}: ${errors.length} content problem(s)\n  ${errors.join('\n  ')}`); }
  else console.log(`✓ ${id}: content valid — ${dom.domains.length} domains · ${dom.areas.length} areas · ${dom.subAreas.length} sub-areas · ${dom.processes.length} processes · ${agents.length} agents (${agents.filter((a) => a.script).length} scripted, ${ind.otSafety.agentsCapped.length} OT-capped) · ${c.dataProducts.products.length} data products · ${c.offerings.offerings.length} offerings · ${c.scenarios.scenarios.length} scenarios`);
}
if (failed) process.exit(1);
