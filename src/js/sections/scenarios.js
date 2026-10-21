// Scripted scenarios (F8). One renderer serves the Demo theater pages and the Accelerate "Watch it"
// demos, so each script is written once and plays the same everywhere.
import { D, IDX, esc, rich, agentChip, motionBadge, $, $$ } from '../core/util.js';
import { walk } from '../core/state.js';
import { Player } from '../core/player.js';
import { icon } from '../core/icons.js';

export function scenarioView(sc, { compact = false } = {}) {
  const lifecycle = sc.lifecycle ? `<ol class="lifecycle big" data-lifecycle>${sc.lifecycle.map((s) => `<li data-stage="${esc(s)}">${esc(s)}</li>`).join('')}</ol>` : '';
  return `<div class="scenario" data-scenario="${sc.id}">
    ${compact ? '' : `<p class="sc-meta">${motionBadge(sc.motion)} <span>${esc(sc.motionLabel)}</span> · Persona: <b>${esc(sc.persona)}</b> · Outcome: <a href="#/outcome/${sc.outcome}">${esc(IDX.outcomes[sc.outcome].name)}</a></p>`}
    <p class="sc-summary">${rich(sc.summary)}</p>
    <div class="run-ctl"><button class="btn primary" data-sc="play">${icon('play')} Play</button><button class="btn" data-sc="toggle" aria-label="Pause or resume">${icon('pause')}</button><button class="btn" data-sc="prev" aria-label="Previous step">${icon('prev')}</button><button class="btn" data-sc="next" aria-label="Next step">${icon('next')}</button><span class="sc-progress" data-sc-progress>Step 0 of ${sc.steps.length}</span></div>
    ${lifecycle}
    <ol class="timeline">${sc.steps.map((st, i) => {
      const a = IDX.agents[st.agentId];
      return `<li class="tl-step" data-tl="${i}"${st.stage ? ` data-stage="${esc(st.stage)}"` : ''}><span class="tl-time">${esc(st.time)}</span>
        <div class="tl-body"><b>${esc(st.title)}</b> ${a ? agentChip(a.id) : ''}<p>${rich(st.narration)}</p>
        ${st.approval ? `<span class="approval approval-${esc(st.approval.status.replace(/\s+/g, '-'))}">${icon('check')} ${esc(st.approval.role)}: ${esc(st.approval.status)}</span>` : ''}</div></li>`;
    }).join('')}</ol>
    <div class="sc-end" data-sc-end hidden>
      ${sc.summaryCard ? `<p class="summary-card">${rich(sc.summaryCard)}</p>` : ''}
      <table class="ptable kpi-ba"><thead><tr><th>KPI</th><th>Before</th><th>After</th></tr></thead><tbody>${sc.kpis.map((k) => `<tr><td>${esc(k.label)}</td><td>${esc(k.before)}</td><td><b>${esc(k.after)}</b></td></tr>`).join('')}</tbody></table>
      <p class="muted small">${esc(D.industry.synthetic.disclosure)}</p>
    </div>
  </div>`;
}

export function bindScenario(node, { autoplay = false } = {}) {
  const root = node.querySelector('[data-scenario]');
  if (!root) return null;
  const sc = IDX.scenarios[root.dataset.scenario];
  const steps = $$('[data-tl]', root);
  const end = $('[data-sc-end]', root);
  const prog = $('[data-sc-progress]', root);
  const player = new Player({
    count: steps.length,
    delay: () => 2600,
    onStep: (i) => {
      steps.forEach((el, k) => { el.classList.toggle('shown', k <= i); el.classList.toggle('current', k === i); });
      prog.textContent = `Step ${i + 1} of ${steps.length}`;
      if (i < steps.length - 1) end.hidden = true;
      const stage = sc.steps[i]?.stage;
      $$('[data-lifecycle] li', root).forEach((li) => {
        const idx = sc.lifecycle.indexOf(li.dataset.stage);
        li.classList.toggle('on', stage && idx <= sc.lifecycle.indexOf(stage));
      });
      if (i >= 0) steps[i].scrollIntoView({ block: 'nearest' });
    },
    onDone: () => { end.hidden = false; walk('scenario', sc.id, `${sc.id} ${sc.title}`); },
  });
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sc]');
    if (b) player[b.dataset.sc]();
  });
  if (autoplay) player.play();
  return player;
}
