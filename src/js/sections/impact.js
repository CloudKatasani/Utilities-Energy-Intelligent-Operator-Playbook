// 04 Impact (F5): outcomes, the value calculator (formulas from calculator.json, evaluated by the safe
// expression parser) and the readiness quick check with hard blockers, tiers and the cohort band.
import { D, IDX, esc, rich, sectionHead, srcAttr, agentChip, fmt, money, $, $$ } from '../core/util.js';
import { state, set, walk } from '../core/state.js';
import { compile } from '../core/expr.js';
import { icon } from '../core/icons.js';

const C = D.calculator;
const R = D.readiness;

// ---------------------------------------------------------------- calculator
const inputIds = C.inputs.map((i) => i.id);
const factorIds = C.levers.map((l) => l.factor);
const leverFns = C.levers.map((l) => compile(l.formula, [...inputIds, ...factorIds]));
const derivedFns = C.derived.map((d, i) => compile(d.formula, [...inputIds, ...factorIds, ...C.levers.map((l) => l.id), ...C.derived.slice(0, i).map((x) => x.id)]));

export function calculate(overrides = state.calc, kase = state.calcCase) {
  const scope = Object.fromEntries(C.inputs.map((i) => [i.id, overrides[i.id] ?? i.default]));
  C.levers.forEach((l) => { scope[l.factor] = overrides[`f:${l.id}`] ?? l[kase]; });
  const levers = C.levers.map((l, i) => { const v = leverFns[i](scope); scope[l.id] = v; return { ...l, value: v, factor: scope[l.factor] }; });
  const derived = Object.fromEntries(C.derived.map((d, i) => { const v = derivedFns[i](scope); scope[d.id] = v; return [d.id, v]; }));
  const by = (key) => levers.reduce((acc, l) => ({ ...acc, [l[key]]: (acc[l[key]] || 0) + l.value }), {});
  return { levers, derived, byOutcome: by('outcome'), byMotion: by('motion'), ramp: C.ramp.map((r) => derived.total * r) };
}

function bars(map, labelOf, cls) {
  const max = Math.max(...Object.values(map), 1);
  return `<div class="bars">${Object.entries(map).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="bar-row"><span class="bar-label">${esc(labelOf(k))}</span><span class="bar-track"><span class="bar ${cls(k)}" style="width:${(v / max) * 100}%"></span></span><b>${money(v)}</b></div>`).join('')}</div>`;
}

function calcOutputs() {
  const r = calculate();
  walk('calculator', 'value', `Value calculator: ${money(r.derived.total, 0)} a year (${state.calcCase})`);
  return `<div class="calc-total" ${srcAttr('BENCH', 'Formulas in calculator.json')}><span>Total annual value at full run rate</span><b data-calc-total>${money(r.derived.total)}</b><small>${fmt(r.derived.omShare, 1)}% of O&M · $${fmt(r.derived.perCustomer, 0)} per customer a year</small></div>
    <div class="ramp">${r.ramp.map((v, i) => `<div><span>${esc(C.rampLabels[i])}</span><b>${money(v)}</b></div>`).join('')}</div>
    <h4>By outcome</h4>${bars(r.byOutcome, (k) => IDX.outcomes[k].name, (k) => `bar-o-${k}`)}
    <h4>By motion</h4>${bars(r.byMotion, (k) => IDX.motions[k].short, (k) => IDX.motions[k].cls)}
    <table class="ptable levers"><thead><tr><th>Lever</th><th>Factor</th><th>$M / yr</th><th>Agents</th></tr></thead><tbody>
    ${r.levers.map((l) => `<tr><td><span ${srcAttr(l.source, `${l.note ? `${l.note} · ` : ''}Formula: ${l.formula}`)}>${esc(l.label)}</span></td>
      <td><input class="num" type="number" step="0.5" min="0" max="100" data-factor="${l.id}" value="${+(l.factor * 100).toFixed(2)}" aria-label="${esc(l.label)} factor (%)">%</td>
      <td><b>${fmt(l.value, 1)}</b></td><td>${l.agents.map((a) => agentChip(a)).join(' ')}</td></tr>`).join('')}</tbody></table>`;
}

function calcInputs() {
  return C.inputs.map((i) => `<label class="calc-in"><span>${esc(i.label)}</span><span class="in-wrap"><input type="number" data-input="${i.id}" value="${state.calc[i.id] ?? i.default}" min="${i.min}" max="${i.max}" step="${i.step}"> <small>${esc(i.unit)}</small></span></label>`).join('');
}

// ---------------------------------------------------------------- readiness
export function readinessResult(answers) {
  const a = { ...R.referenceDefaults, ...(answers || {}) };
  const qs = R.questions;
  const raw = Math.round((qs.reduce((s, q) => s + a[q.id], 0) / (qs.length * 3)) * 100);
  const blockers = qs.filter((q) => q.blocker && a[q.id] <= q.blockerAt).map((q) => R.blockers[q.blocker]);
  const score = blockers.length ? Math.min(raw, R.blockerCap) : raw;
  const tier = D.shared.engine.readinessTiers.find((t) => score >= t.min);
  const pillars = Object.fromEntries(R.pillars.map((p) => {
    const pq = qs.filter((q) => q.pillar === p.id);
    return [p.id, Math.round((pq.reduce((s, q) => s + a[q.id], 0) / (pq.length * 3)) * 100)];
  }));
  const flags = new Set(qs.filter((q) => q.flag && a[q.id] <= q.flagAt).map((q) => q.flag));
  const rule = D.motions.plan.rules.find((r) => r.if === 'default' || flags.has(r.if));
  return { answers: a, raw, score, tier, blockers, pillars, start: rule.start, why: rule.why };
}

function radar(pillars, cohort) {
  const n = R.pillars.length, cx = 150, cy = 140, rad = 110;
  const pt = (i, v) => { const ang = -Math.PI / 2 + (i / n) * 2 * Math.PI; return [cx + Math.cos(ang) * rad * v / 100, cy + Math.sin(ang) * rad * v / 100]; };
  const poly = (vals) => vals.map((v, i) => pt(i, v).map((x) => x.toFixed(1)).join(',')).join(' ');
  const grid = [25, 50, 75, 100].map((g) => `<polygon class="radar-grid" points="${poly(R.pillars.map(() => g))}"/>`).join('');
  const labels = R.pillars.map((p, i) => { const [x, y] = pt(i, 122); return `<text class="radar-label" x="${x.toFixed(0)}" y="${y.toFixed(0)}" text-anchor="${x < cx - 5 ? 'end' : x > cx + 5 ? 'start' : 'middle'}">${esc(p.name)}</text>`; }).join('');
  return `<svg class="radar" viewBox="-90 0 480 290" role="img" aria-label="Readiness by pillar">${grid}
    <polygon class="radar-cohort" points="${poly(R.pillars.map((p) => cohort[p.id]))}"/>
    <polygon class="radar-you" points="${poly(R.pillars.map((p) => pillars[p.id]))}"/>${labels}</svg>`;
}

function readinessPanel() {
  const r = readinessResult(state.readiness);
  const coh = R.cohort;
  return `<div class="ready-grid">
    <form class="ready-qs" data-ready-form>${R.questions.map((q, i) => {
      const labels = q.answers || R.answers;
      return `<fieldset class="ready-q"><legend><span class="q-num">${i + 1}</span> ${esc(q.text)} ${q.blocker ? '<span class="blocker-tag">hard blocker if not started</span>' : ''}</legend>
        <div class="seg seg-small" role="radiogroup">${labels.map((lab, v) => `<button type="button" class="seg-btn${r.answers[q.id] === v ? ' on' : ''}" role="radio" aria-checked="${r.answers[q.id] === v}" data-q="${q.id}" data-v="${v}">${esc(lab)}</button>`).join('')}</div></fieldset>`;
    }).join('')}</form>
    <div class="ready-out" data-ready-out>
      <div class="score"><b data-ready-score>${r.score}</b><span>/ 100 · <span class="tier tier-${r.tier.id}">${esc(r.tier.name)}</span></span></div>
      <p class="cohort" ${srcAttr('synthetic', coh.note)}>${esc(coh.label)}: 25th percentile ${coh.p25} · median ${coh.median} · 75th percentile ${coh.p75}</p>
      ${radar(r.pillars, coh.pillars)}
      <p class="legend"><span class="lg lg-you"></span> ${esc(D.industry.labels.yourOrg)} <span class="lg lg-cohort"></span> ${esc(coh.label)}</p>
      ${r.blockers.length ? `<div class="blockers"><h4>${icon('lock')} Hard blockers (score capped at ${R.blockerCap})</h4><ul>${r.blockers.map((b) => `<li>${esc(b)}</li>`).join('')}</ul></div>` : '<p class="ok">No hard blockers.</p>'}
      <div class="rec"><h4>Recommended start: ${esc(IDX.motions[r.start].name)}</h4><p>${rich(r.why)}</p><p><b>First 90 days:</b> ${esc(D.motions.plan.first90[r.start])}</p><a class="btn" href="#/accelerate/${r.start}">Open in Accelerate</a></div>
      <button class="btn ghost" data-ready-reset>Reset to the reference profile</button>
    </div>
  </div>`;
}

// ---------------------------------------------------------------- section
export function renderImpact() {
  const outcomes = D.outcomes.outcomes.map((o) => `<a class="outcome-col" href="#/outcome/${o.id}">${icon(o.icon)}<b>${esc(o.name)}</b><ul>${o.kpis.slice(0, 3).map((k) => `<li>${esc(k.name)}${k.value ? ` <span ${srcAttr(k.source)}>${esc(k.value)}</span>` : ''}</li>`).join('')}</ul></a>`).join('');
  return `<section id="impact" class="section light impact-section">
    <div class="wrap">
      ${sectionHead(D.site.impact.kicker, D.site.impact.title, D.site.impact.lede)}
      <div class="outcome-cols">${outcomes}</div>
      <div class="calc" id="calculator">
        <div class="calc-head"><h3>Value calculator</h3>
          <div class="seg" role="group" aria-label="Case">${['conservative', 'expected'].map((k) => `<button class="seg-btn${state.calcCase === k ? ' on' : ''}" data-case="${k}" aria-pressed="${state.calcCase === k}">${k === 'conservative' ? 'Conservative' : 'Expected'}</button>`).join('')}</div>
          <button class="btn ghost" data-calc-reset>Reset to reference defaults</button></div>
        <div class="calc-grid"><div class="calc-inputs" data-calc-inputs>${calcInputs()}</div><div class="calc-out" data-calc-out>${calcOutputs()}</div></div>
        <p class="muted small">${esc(C._note || '')}</p>
      </div>
      <div class="readiness" id="readiness">
        <h3>${esc(D.site.impact.readinessTitle)}</h3><p class="lede">${esc(D.site.impact.readinessLede)}</p>
        <div data-ready>${readinessPanel()}</div>
      </div>
    </div>
  </section>`;
}

export function bindImpact(root, { onReadiness } = {}) {
  const sec = root.querySelector('#impact');
  const redrawCalc = () => { $('[data-calc-out]', sec).innerHTML = calcOutputs(); };
  sec.addEventListener('input', (e) => {
    const inp = e.target.closest('[data-input]');
    const f = e.target.closest('[data-factor]');
    if (!inp && !f) return;
    const v = parseFloat(e.target.value);
    if (Number.isNaN(v)) return;
    const key = inp ? inp.dataset.input : `f:${f.dataset.factor}`;
    set({ calc: { ...state.calc, [key]: inp ? v : v / 100 } }, { silent: true });
    if (inp) redrawCalc();
    else {
      const r = calculate();
      $('[data-calc-total]', sec).textContent = money(r.derived.total);
    }
  });
  sec.addEventListener('change', (e) => { if (e.target.closest('[data-factor]')) redrawCalc(); });
  sec.addEventListener('click', (e) => {
    const c = e.target.closest('[data-case]');
    if (c) {
      const calc = Object.fromEntries(Object.entries(state.calc).filter(([k]) => !k.startsWith('f:')));
      set({ calcCase: c.dataset.case, calc }, { silent: true });
      $$('[data-case]', sec).forEach((b) => { b.classList.toggle('on', b === c); b.setAttribute('aria-pressed', b === c); });
      redrawCalc();
      return;
    }
    if (e.target.closest('[data-calc-reset]')) {
      set({ calc: {}, calcCase: 'expected' }, { silent: true });
      $('[data-calc-inputs]', sec).innerHTML = calcInputs();
      $$('[data-case]', sec).forEach((b) => b.classList.toggle('on', b.dataset.case === 'expected'));
      redrawCalc();
      return;
    }
    const q = e.target.closest('[data-q]');
    if (q) {
      set({ readiness: { ...(state.readiness || R.referenceDefaults), [q.dataset.q]: Number(q.dataset.v) } }, { silent: true });
      const r = readinessResult(state.readiness);
      walk('readiness', 'readiness', `Readiness: ${r.score}/100 (${r.tier.name}), start with ${IDX.motions[r.start].name}`);
      $('[data-ready]', sec).innerHTML = readinessPanel();
      onReadiness?.();
      return;
    }
    if (e.target.closest('[data-ready-reset]')) {
      set({ readiness: null }, { silent: true });
      $('[data-ready]', sec).innerHTML = readinessPanel();
      onReadiness?.();
    }
  });
}
