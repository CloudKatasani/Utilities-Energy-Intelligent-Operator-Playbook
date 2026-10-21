// 03 Accelerate with AI: Engineer · Operate · Decide and Act, with the control plane beneath, one
// "Watch it" demo per motion, and the acceleration plan.
import { D, IDX, esc, rich, sectionHead, offeringLink, srcAttr, relabel, $ } from '../core/util.js';
import { state, set, walk } from '../core/state.js';
import { icon } from '../core/icons.js';
import { agentCard } from './agents.js';
import { scenarioView, bindScenario } from './scenarios.js';
import { readinessResult } from './impact.js';

const MOTIONS = D.motions.motions;
const FLOW = MOTIONS.filter((m) => !m.controlPlane);
const CP = MOTIONS.find((m) => m.controlPlane);
let stage = 'act';

function panel(m) {
  const stages = m.stages ? `<div class="seg seg-dark seg-small" role="group" aria-label="Stage">${m.stages.map((s) => `<button class="seg-btn${stage === s.id ? ' on' : ''}" data-dstage="${s.id}" aria-pressed="${stage === s.id}">${esc(s.name)}</button>`).join('')}</div>
    <p class="stage-text">${esc(m.stages.find((s) => s.id === stage).text)}</p>` : '';
  const scenarioId = m.stages ? m.stages.find((s) => s.id === stage).scenarioId : m.scenarioId;
  const sc = IDX.scenarios[scenarioId];
  return `<div class="acc-panel ${m.cls}" data-motion-panel="${m.id}">
    <p class="acc-promise">${esc(m.promise)}</p>
    <div class="acc-grid">
      <div class="acc-left">
        <h3>What AI accelerates</h3><ul class="ticks on-dark">${m.accelerates.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        <h3>Agents at work (${m.agentIds.length})</h3><div class="agent-cards compact">${m.agentIds.map((id) => agentCard(IDX.agents[id], { compact: true })).join('')}</div>
        <h3>What it takes</h3><ul class="ticks on-dark">${m.whatItTakes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        <h3>Human checkpoints</h3><ul class="ticks on-dark">${m.checkpoints.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      </div>
      <div class="acc-right">
        <h3>Headline KPIs</h3><div class="acc-kpis">${m.kpis.map((k) => `<div class="acc-kpi" ${srcAttr(k.source, k.note || '')}><b>${esc(k.value)}</b><span>${esc(k.label)}</span>${k.note ? `<small>${esc(k.note)}</small>` : ''}</div>`).join('')}</div>
        <h3>▶ Watch it — ${esc(sc.id)} ${esc(sc.title)}</h3>${stages}<div class="acc-demo">${scenarioView(sc, { compact: true })}</div>
        <h3>Offerings that deliver it</h3><div class="chips">${m.offeringIds.map(offeringLink).join('')}</div>
      </div>
    </div>
  </div>`;
}

export function planCard() {
  const r = readinessResult(state.readiness);
  const order = [r.start, ...FLOW.map((m) => m.id).filter((x) => x !== r.start)].filter((x) => x !== 'govern').slice(0, 3);
  if (r.start === 'govern') order.unshift('govern');
  const labels = ['Now', 'Next', 'Later'];
  return `<div class="plan" id="plan">
    <h3>${esc(D.site.accelerate.planTitle)}</h3>
    <p class="plan-why">${rich(r.why)} ${state.readiness ? '' : '<span class="muted">(Based on the reference profile — run the quick check for your answers.)</span>'}</p>
    <ol class="roadmap">${order.slice(0, 3).map((id, i) => `<li><span class="road-when">${labels[i]}</span><b>${esc(IDX.motions[id].name)}</b>${i === 0 ? `<small>First 90 days: ${esc(D.motions.plan.first90[id])}</small>` : ''}</li>`).join('')}
      <li class="road-cp"><span class="road-when">Throughout</span><b>${esc(CP.name)}</b><small>Control plane, the OT safety rule and evidence from day one</small></li></ol>
    <a class="btn primary" href="#/impact/readiness">${esc(D.site.accelerate.planCta)}</a>
  </div>`;
}

export function renderAccelerate() {
  const cur = IDX.motions[state.motion] || FLOW[0];
  return `<section id="accelerate" class="section dark acc-section">
    <div class="wrap">
      ${sectionHead(D.site.accelerate.kicker, D.site.accelerate.title, D.motions.message, { dark: true })}
      <div class="motion-flow" role="group" aria-label="Motions">
        ${FLOW.map((m, i) => `${i ? '<span class="flow-arrow" aria-hidden="true">→</span>' : ''}<button class="motion-btn ${m.cls}${cur.id === m.id ? ' on' : ''}" data-motion="${m.id}" aria-pressed="${cur.id === m.id}">${esc(m.name)}</button>`).join('')}
        <span class="flow-loop" aria-hidden="true">↺ ${esc(D.site.accelerate.loop)}</span>
      </div>
      <button class="cp-band${cur.id === CP.id ? ' on' : ''}" data-motion="${CP.id}" aria-pressed="${cur.id === CP.id}">${icon('lock')} ${esc(CP.name)} <small>— control plane across every layer, with the OT safety rule</small></button>
      <div data-acc-panel>${panel(cur)}</div>
      <div data-plan>${planCard()}</div>
    </div>
  </section>`;
}

let demo = null;
export function bindAccelerate(root) {
  const sec = root.querySelector('#accelerate');
  const draw = () => {
    demo?.destroy();
    const m = IDX.motions[state.motion] || FLOW[0];
    $('[data-acc-panel]', sec).innerHTML = relabel(panel(m));
    sec.querySelectorAll('[data-motion]').forEach((b) => { const on = b.dataset.motion === m.id; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    demo = bindScenario($('[data-acc-panel]', sec));
  };
  sec.addEventListener('click', (e) => {
    const b = e.target.closest('[data-motion]');
    if (b) {
      set({ motion: b.dataset.motion }, { silent: true });
      walk('motion', b.dataset.motion, IDX.motions[b.dataset.motion].name);
      history.replaceState(null, '', `#/accelerate/${b.dataset.motion}`);
      draw();
      return;
    }
    const s = e.target.closest('[data-dstage]');
    if (s) { stage = s.dataset.dstage; draw(); }
  });
  demo = bindScenario($('[data-acc-panel]', sec));
  return { draw, refreshPlan: () => { $('[data-plan]', sec).innerHTML = relabel(planCard()); } };
}
