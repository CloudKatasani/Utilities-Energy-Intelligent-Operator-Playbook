// Agent families (F3), agent drawers and the agent full view (F4): what it does, Watch it run
// (trace + knockouts), guardrails and autonomy (with the OT safety lock), what it takes, Ask the agent.
import { D, IDX, OT, esc, rich, attr, closeBtn, autonomyBadge, motionBadge, dpRef, offeringLink, srcAttr, agentChip, isOtCapped, maxLevel, LEVELS, levelNum, fmt, pct, familyCls, relabel, reducedMotion, $, $$ } from '../core/util.js';
import { state, set, walk } from '../core/state.js';
import { Player } from '../core/player.js';
import { icon } from '../core/icons.js';
import { autonomyMix, notFound } from './future.js';

const KO = D.agents.knockoutLabels;
const tel = (id) => D.synthetic.telemetry[id] || {};

// ---------------------------------------------------------------- scripts
// Nine agents carry a hand-scripted run; the others replay a template built from their catalog entry.
export function scriptFor(a) {
  if (a.script) return { ...a.script, template: false };
  const restricted = [...new Set(a.dataProducts.map((r) => IDX.products[String(r).split(' ')[0]]?.classification).filter((c) => IDX.classes[c]?.restricted))];
  return {
    template: true,
    prompt: a.demoPrompt,
    steps: [
      { title: 'Understand', layer: 'Glossary', text: `Terms resolved to certified KPIs: ${a.kpis.join(' · ')}`, ms: 160 },
      { title: 'Context', layer: 'Context', text: a.guardrails.join('; '), ms: 200 },
      { title: 'Correlate', layer: 'Data products', text: a.dataProducts.map((r) => (IDX.products[String(r).split(' ')[0]] ? `${String(r).split(' ')[0]} ${IDX.products[String(r).split(' ')[0]].name}` : r)).join(' · '), ms: 520 },
      { title: 'Reason', layer: 'AI/ML', text: a.mission, ms: 420 },
      { title: 'Access', layer: 'Governance', text: restricted.length ? `${restricted.join(', ')} handled by policy for the requesting role; restricted detail masked` : 'Internal data; role permitted', ms: 80 },
      { title: 'Act', layer: 'Control plane', text: `${a.actions.map((x) => x.replace(/_/g, ' ')).join(' · ')} at ${state.autonomy[a.id] || a.autonomyDefault} → ${a.approver}${isOtCapped(a.id) ? ' — the agent does not operate devices (OT cap L2)' : ''}`, ms: 240 },
    ],
    answer: a.qa[0]?.a || a.mission,
    outcome: `${state.autonomy[a.id] || a.autonomyDefault} · ${a.approver}`,
    handoffs: [],
    knockouts: {
      context: { answer: '(answer produced without operating rules)', wrong: `Without the context layer the agent ignored “${a.guardrails[0]}”. The control plane blocks the result before anyone acts on it.` },
      governance: { answer: '(answer produced without access policies)', wrong: restricted.length ? `${restricted.join(', ')} detail was shown to a role that is not cleared for it.` : 'The action was not written to the Agent Evidence Trail, so it cannot be audited or rolled back.' },
    },
  };
}

// ---------------------------------------------------------------- cards and drawers
export function agentCard(a, { compact = false } = {}) {
  const t = tel(a.id);
  const capped = isOtCapped(a.id);
  const eligible = t.acceptance30d >= 0.9 && !capped && levelNum(a.autonomyDefault) < levelNum(a.autonomyMax);
  return `<article class="agent-card ${familyCls(a.family)}" data-agent="${a.id}" tabindex="0" role="link" aria-label="${attr(a.name)}">
    <header><b>${esc(a.name)}</b> <small>${a.id}</small> ${autonomyBadge(a.autonomyDefault, { capped, title: capped ? OT.tooltip : '' })} ${motionBadge(a.motion)}</header>
    <p>${esc(a.mission)}</p>
    ${compact ? '' : `<dl><dt>Trigger</dt><dd>${esc(a.trigger)}</dd><dt>Uses</dt><dd>${a.dataProducts.map((r) => esc(String(r).replace(/^UDP-\S+ /, ''))).join(' · ')}</dd><dt>Approver</dt><dd>${esc(a.approver)}</dd><dt>Will not</dt><dd>${esc(a.willNot[0])}</dd></dl>`}
    <footer><span ${srcAttr('synthetic')}>Acceptance 30d ${pct(t.acceptance30d || 0)}${eligible ? ' · promotion eligible' : ''}${capped ? ' · locked at L2' : ''}</span><a class="open-link" href="#/agent/${a.id}">Open ▸</a></footer>
  </article>`;
}

export function familyDrawer({ id }) {
  const f = IDX.families[id];
  if (!f) return notFound(id);
  walk('family', f.id, f.name);
  const agents = D.agents.agents.filter((a) => a.family === f.id);
  const procs = D.domains.processes.filter((p) => p.family === f.id);
  const byMotion = D.motions.motions.map((m) => [m, agents.filter((a) => a.motion === m.id)]).filter(([, l]) => l.length);
  return `<header class="dr-head ${f.cls}">${closeBtn()}<p class="kicker">Agent family</p><h2 data-autofocus>${esc(f.name)}</h2><p class="dr-sub">${esc(f.mission)}</p></header>
    <section class="dr-block"><h3>Outcomes moved</h3><div class="chips">${f.outcomes.map((o) => `<a class="chip" href="#/outcome/${o}">${esc(IDX.outcomes[o].name)}</a>`).join('')}</div></section>
    <section class="dr-block"><h3>Autonomy mix (${procs.length} agent processes)</h3>${autonomyMix(procs)}</section>
    ${byMotion.map(([m, list]) => `<section class="dr-block"><h3>${motionBadge(m.id)} ${esc(m.name)} (${list.length})</h3><div class="agent-cards">${list.map((a) => agentCard(a)).join('')}</div></section>`).join('')}
    <section class="dr-block"><h3>How the agents work together</h3>
      <div class="orch"><div class="orch-box">Orchestrator<small>routes the request</small></div><span class="orch-arrow">→</span>
      <div class="orch-box">Specialist agents<small>${agents.length} in this family</small></div><span class="orch-arrow">→</span>
      <div class="orch-box orch-cp">Agent control plane<small>policy & guardrails · tool catalog · arbitration · human approval · cost & risk · OT safety rule</small></div></div></section>
    <section class="dr-block"><h3>Data products consumed</h3><div class="chips">${f.dataProducts.map(dpRef).join('')}</div></section>`;
}

export function agentDrawer({ id }) {
  const a = IDX.agents[id];
  if (!a) return notFound(id);
  walk('agent', a.id, a.name);
  const capped = isOtCapped(a.id);
  return `<header class="dr-head ${familyCls(a.family)}">${closeBtn()}<p class="kicker">${esc(IDX.families[a.family].short)} · ${a.id}</p><h2 data-autofocus>${esc(a.name)}</h2>
      <p class="dr-sub">${autonomyBadge(a.autonomyDefault, { capped })} → max ${autonomyBadge(maxLevel(a), { capped })} ${motionBadge(a.motion)}</p></header>
    ${agentCard(a)}
    ${capped ? `<p class="ot-note">${icon('lock')} ${esc(OT.tooltip)}</p>` : ''}
    <div class="dr-actions"><a class="btn primary" href="#/agent/${a.id}/full">Open full view</a><a class="btn" href="#/agent/${a.id}/run">▶ Watch it run</a></div>
    <section class="dr-block"><h3>Demo prompt</h3><p class="prompt">“${esc(a.demoPrompt)}”</p></section>
    <section class="dr-block"><h3>Data products</h3><div class="chips">${a.dataProducts.map(dpRef).join('')}</div></section>`;
}

// ---------------------------------------------------------------- full view
function guardrails(a) {
  const capped = isOtCapped(a.id);
  const max = maxLevel(a);
  const cur = state.autonomy[a.id] || a.autonomyDefault;
  const lv = D.shared.engine.autonomyLevels.find((x) => x.level === cur);
  const t = tel(a.id);
  const buttons = LEVELS.map((l) => {
    const over = levelNum(l) > levelNum(max);
    const why = over ? (capped && levelNum(l) > 2 ? OT.tooltip : `This agent's maximum autonomy is ${a.autonomyMax}.`) : '';
    return `<button class="seg-btn${cur === l ? ' on' : ''}${over ? ' locked' : ''}" data-level="${l}" aria-pressed="${cur === l}" ${over ? `aria-disabled="true" data-tip="${attr(why)}"` : ''}>${over && capped ? icon('lock') : ''}${l}</button>`;
  }).join('');
  return `<section class="fv-sec" id="fv-guardrails"><h3>3 · Guardrails & autonomy</h3>
    <div class="autonomy-row"><div class="seg" role="group" aria-label="Autonomy level" data-autonomy="${a.id}">${buttons}</div>
      ${capped ? `<span class="ot-lock" data-tip="${attr(OT.tooltip)}" tabindex="0">${icon('lock')} Locked at ${OT.capLevel} — OT safety rule</span>` : ''}</div>
    <div class="lvl-explain"><b>${esc(lv.level)} · ${esc(lv.name)}.</b> ${esc(lv.who)} <span class="muted">Executes: ${esc(lv.executes)}.</span> Approver: <b>${esc(a.approver)}</b>.</div>
    <div class="cols2"><div><h4>Guardrails</h4><ul class="ticks">${a.guardrails.map((g) => `<li>${esc(g)}</li>`).join('')}</ul></div>
      <div><h4>Will not</h4><ul class="crosses">${a.willNot.map((g) => `<li>${esc(g)}</li>`).join('')}${capped ? '<li>Operate, or be promoted to operate, any grid, plant, storage or gas control device</li>' : ''}</ul></div></div>
    <p><b>Kill switch and rollback:</b> the owner can stop the agent instantly; every action is catalogued and reversible, and written to the Agent Evidence Trail.</p>
    <p><b>Promotion rule:</b> ${esc(D.shared.engine.promotionRule)}${capped ? ` <b>This agent is capped at ${OT.capLevel}.</b>` : ''}</p>
    <div class="telemetry" ${srcAttr('synthetic')}>
      <div><b>${pct(t.evalScore || 0)}</b><span>evaluation score</span></div><div><b>${pct(t.acceptance30d || 0)}</b><span>acceptance (30 days)</span></div>
      <div><b>${pct(t.refusalRate || 0, 1)}</b><span>refusal rate</span></div><div><b>$${fmt(t.costPerRun || 0, 2)}</b><span>cost per run</span></div>
      <div><b>${fmt(t.runs90d || 0)}</b><span>runs (90 days)</span></div><div class="spark-cell">${spark(t.trend || [])}<span>acceptance trend (13 weeks)</span></div>
    </div></section>`;
}

export function spark(values) {
  if (!values.length) return '';
  const lo = Math.min(...values) - 0.01, hi = Math.max(...values) + 0.01;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 120},${30 - ((v - lo) / (hi - lo)) * 28}`).join(' ');
  return `<svg class="spark" viewBox="0 0 120 32" aria-hidden="true"><polyline points="${pts}"/></svg>`;
}

function qaBlock(a) {
  const std = [
    { q: 'What will you not do?', a: `${a.willNot.join('. ')}.${isOtCapped(a.id) ? ' I never operate grid, plant, storage or gas devices.' : ''}` },
    { q: 'Who approves your actions?', a: `${a.approver}. I start at ${a.autonomyDefault}; my maximum is ${maxLevel(a)}${isOtCapped(a.id) ? ' (OT safety rule)' : ''}.` },
    { q: 'What data do you use?', a: `${a.dataProducts.map((r) => String(r).replace(/^(UDP-\S+) /, '$1 ')).join('; ')}. Every answer cites its sources.` },
  ];
  return [...a.qa, ...std].map((x, i) => `<details class="qa"${i === 0 ? ' open' : ''}><summary>${esc(x.q)}</summary><p>${rich(x.a)}</p></details>`).join('');
}

export function fullView({ id }, { scrollToRun = false } = {}) {
  const a = IDX.agents[id];
  if (!a) return `<div class="fv">${closeBtn()}<h2 data-autofocus>Not found</h2></div>`;
  walk('agent', a.id, a.name);
  const s = scriptFor(a);
  const fam = IDX.families[a.family];
  const area = IDX.areas[a.operatingArea];
  const capped = isOtCapped(a.id);
  const kos = Object.keys(s.knockouts || {});
  return `<div class="fv ${fam.cls}" data-fv="${a.id}" ${scrollToRun ? 'data-scroll-run' : ''}>
    <header class="fv-head">${closeBtn()}<div><p class="kicker">${esc(fam.short)} · ${a.id} · Agent full view</p><h2 data-autofocus>${esc(a.name)}</h2></div>
      <div class="fv-badges">${motionBadge(a.motion)} <span data-cur-level>${autonomyBadge(state.autonomy[a.id] || a.autonomyDefault, { capped })}</span></div>
      <nav class="fv-nav" aria-label="Sections"><a href="#fv-what" data-jump>What it does</a><a href="#fv-run" data-jump>Watch it run</a><a href="#fv-guardrails" data-jump>Guardrails</a><a href="#fv-takes" data-jump>What it takes</a><a href="#fv-ask" data-jump>Ask the agent</a></nav></header>
    <section class="fv-sec" id="fv-what"><h3>1 · What it does</h3><p class="fv-mission">${esc(a.mission)}</p>
      <dl class="facts"><dt>Trigger</dt><dd>${esc(a.trigger)}</dd><dt>Outcomes moved</dt><dd>${a.outcomes.map((o) => `<a href="#/outcome/${o}">${esc(IDX.outcomes[o].name)}</a>`).join(' · ')}</dd>
      <dt>KPIs</dt><dd>${a.kpis.map(esc).join(' · ')}</dd><dt>Operating area</dt><dd>${area ? `<a href="#/area/${area.id}">${esc(area.name)}</a>` : esc(a.operatingArea)}</dd>
      <dt>Offering</dt><dd>${offeringLink(a.offering)}</dd><dt>Actions</dt><dd>${a.actions.map((x) => `<code>${esc(x)}</code>`).join(' ')}</dd></dl></section>
    <section class="fv-sec" id="fv-run"><h3>2 · Watch it run ${s.template ? '<span class="pill">template replay</span>' : '<span class="pill pill-on">scripted run</span>'}</h3>
      <p class="prompt">“${esc(s.prompt)}”</p>
      <div class="run-ctl"><button class="btn primary" data-run="play">${icon('play')} Play</button><button class="btn" data-run="prev" aria-label="Previous step">${icon('prev')}</button><button class="btn" data-run="next" aria-label="Next step">${icon('next')}</button>
        <span class="ko-label">Knockouts:</span>${kos.map((k) => `<label class="ko"><input type="checkbox" data-ko="${k}" checked> ${esc(KO[k] || k)}</label>`).join('')}</div>
      <ol class="trace" data-trace>${s.steps.map((st, i) => `<li class="trace-step" data-step="${i}"><span class="trace-layer">${esc(st.layer)}</span><b>${esc(st.title)}</b><span class="trace-text">${rich(st.text)}</span><span class="trace-ms">${st.ms} ms</span></li>`).join('')}</ol>
      <div class="answer" data-answer hidden><h4>Answer</h4><div data-answer-text>${rich(s.answer)}</div><p class="answer-outcome">${icon('check')} ${esc(s.outcome)}</p>
        ${s.handoffs?.length ? `<p>Hand-offs: ${s.handoffs.map((h) => agentChip(h)).join(' ')}</p>` : ''}${capped ? `<p class="ot-note">${icon('lock')} The agent operates nothing. A qualified person reviews and executes.</p>` : ''}</div>
      <div class="wrong" data-wrong hidden></div></section>
    ${guardrails(a)}
    <section class="fv-sec" id="fv-takes"><h3>4 · What it takes</h3>
      <div class="cols2"><div><h4>Data products</h4><div class="chips">${a.dataProducts.map(dpRef).join('')}</div><h4>Systems</h4><p>${a.systems.map(esc).join(' · ')}</p></div>
      <div><h4>Roles</h4><p>${a.roles.map(esc).join(' · ')}</p><h4>Typical pilot</h4><p>${esc(a.pilotWeeks)} at ${capped ? 'L2 (OT cap)' : 'L2/L3'}</p>
      <h4>Value range</h4><p><span ${srcAttr(a.value.source)}>${esc(a.value.range)}</span> <span class="validate">validate</span></p><h4>Shipped by</h4><p>${offeringLink(a.offering)}</p></div></div></section>
    <section class="fv-sec" id="fv-ask"><h3>5 · Ask the agent</h3>${qaBlock(a)}</section>
  </div>`;
}

export function bindFull(node) {
  const root = node.querySelector('[data-fv]');
  if (!root) return;
  const a = IDX.agents[root.dataset.fv];
  const s = scriptFor(a);
  const steps = $$('.trace-step', root);
  const answer = $('[data-answer]', root);
  const wrong = $('[data-wrong]', root);
  const off = () => $$('[data-ko]', root).filter((x) => !x.checked).map((x) => x.dataset.ko);
  const finish = () => {
    const kos = off();
    answer.hidden = false;
    if (kos.length) {
      const ko = s.knockouts[kos[0]];
      $('[data-answer-text]', root).innerHTML = rich(ko.answer);
      wrong.hidden = false;
      wrong.innerHTML = `<h4>What went wrong — ${esc(KO[kos[0]] || kos[0])} off</h4><p>${rich(ko.wrong)}</p>`;
      answer.classList.add('degraded');
    } else {
      $('[data-answer-text]', root).innerHTML = rich(s.answer);
      wrong.hidden = true;
      answer.classList.remove('degraded');
    }
    walk('run', a.id, `Watched ${a.name} run`);
  };
  const player = new Player({
    count: steps.length,
    delay: (i) => Math.max(500, s.steps[i].ms * 2.2),
    onStep: (i) => {
      steps.forEach((el, k) => { el.classList.toggle('shown', k <= i); el.classList.toggle('current', k === i); });
      if (i < steps.length - 1) { answer.hidden = true; wrong.hidden = true; }
    },
    onDone: finish,
  });
  root.addEventListener('click', (e) => {
    const r = e.target.closest('[data-run]');
    if (r) { player[r.dataset.run](); return; }
    const lv = e.target.closest('[data-level]');
    if (lv) {
      if (lv.getAttribute('aria-disabled') === 'true') { lv.classList.add('shake'); setTimeout(() => lv.classList.remove('shake'), 400); return; }
      set({ autonomy: { ...state.autonomy, [a.id]: lv.dataset.level } }, { silent: true });
      const sec = $('#fv-guardrails', root);
      sec.outerHTML = relabel(guardrails(a));
      $('[data-cur-level]', root).innerHTML = autonomyBadge(lv.dataset.level, { capped: isOtCapped(a.id) });
      return;
    }
    const j = e.target.closest('[data-jump]');
    if (j) { e.preventDefault(); $(j.getAttribute('href'), root)?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' }); }
  });
  root.addEventListener('change', (e) => { if (e.target.matches('[data-ko]')) { player.show(-1); player.play(); } });
  if (root.hasAttribute('data-scroll-run')) {
    $('#fv-run', root).scrollIntoView({ block: 'start' });
    player.play();
  }
  return player;
}
