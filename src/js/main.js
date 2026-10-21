// Bootstrap: render the story, register routes, wire the three interaction patterns (drawer, full view,
// segmented controls), keyboard, tooltips and presenter tools.
import { $, $$, relabel, toast, IDX, reducedMotion } from './core/util.js';
import { state, set, onChange } from './core/state.js';
import { route, start, apply, popTop, go, refresh, afterRoute, current } from './core/router.js';
import { ROUTES } from './core/route-table.js';
import { activePlayer } from './core/player.js';
import { renderTopbar, renderHero, renderWhy, renderClosing, renderFooter } from './sections/story.js';
import { renderBoard, bindBoard, outcomeDrawer, domainDrawer, areaDrawer, subAreaDrawer, highlight } from './sections/future.js';
import { familyDrawer, agentDrawer, fullView, bindFull } from './sections/agents.js';
import { layerDrawer, controlPlaneDrawer, dpDrawer, dpFull, bindDpFull, bindStack } from './sections/foundation.js';
import { renderAccelerate, bindAccelerate } from './sections/accelerate.js';
import { renderImpact, bindImpact } from './sections/impact.js';
import { renderProof, offeringsPage, bindOfferings, offeringPage, bindOfferingPage, boxDrawer, scenariosPage, scenarioPage, casesPage, bindCases, resetProofFilters } from './sections/proof.js';
import { bindScenario } from './sections/scenarios.js';
import { openMenu, bindMenu, runBar, runSheetStep, notesPanel, briefingPage, bindBriefing, applyEdits, armIdle, stopAttract } from './sections/presenter.js';

const main = $('#main');
let acc = null;

function renderStory() {
  main.innerHTML = relabel(`${renderHero()}${renderWhy()}${renderBoard()}${renderAccelerate()}${renderImpact()}${renderProof()}${renderClosing()}`);
  bindBoard(main);
  acc = bindAccelerate(main);
  bindImpact(main, { onReadiness: () => acc.refreshPlan() });
  applyEdits();
  highlight(current().drawer);
}

function chrome() {
  $('#topbar').innerHTML = renderTopbar();
  $('#footer').innerHTML = relabel(renderFooter());
  document.body.classList.toggle('client-mode', state.mode === 'client');
}

// ---------------------------------------------------------------- routes
const scrollTo = (id) => () => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: document.body.dataset.ready && !reducedMotion() ? 'smooth' : 'auto', block: 'start' });
};
const HANDLERS = {
  '/': () => window.scrollTo({ top: 0 }),
  '/impact/readiness': scrollTo('readiness'),
  '/accelerate/:motion': ({ motion }) => {
    const m = motion === 'build' ? 'engineer' : motion === 'consume' ? 'decide-act' : motion;
    if (IDX.motions[m] && state.motion !== m) { set({ motion: m }, { silent: true }); acc.draw(); }
    scrollTo('accelerate')();
  },
  '/outcome/:id': outcomeDrawer, '/domain/:id': domainDrawer, '/area/:id': areaDrawer, '/subarea/:id': subAreaDrawer,
  '/family/:id': familyDrawer, '/agent/:id': agentDrawer, '/layer/:id': layerDrawer, '/control-plane': controlPlaneDrawer, '/dp/:id': dpDrawer,
  '/agent/:id/full': (p) => fullView(p), '/agent/:id/run': (p) => fullView(p, { scrollToRun: true }), '/dp/:id/full': dpFull,
  '/offerings': offeringsPage, '/offering/:id': offeringPage, '/offering/:id/:opt': offeringPage, '/offering/:id/:opt/box/:box': boxDrawer,
  '/scenarios': scenariosPage, '/scenario/:id': scenarioPage, '/cases': casesPage, '/briefing': briefingPage,
};
const PARENTS = { '/offering/:id/:opt/box/:box': ({ id, opt }) => `#/offering/${id}/${opt}` };
ROUTES.forEach(([pattern, kind]) => route(pattern, kind, HANDLERS[pattern] || scrollTo(pattern.slice(1)), { parent: PARENTS[pattern] }));

let layerPlayer = null;
document.addEventListener('layer-rendered', (e) => {
  const { node, layer, refresh: isRefresh } = e.detail;
  if (layer === 'full') { layerPlayer?.destroy?.(); layerPlayer = bindFull(node) || null; bindDpFull(node); }
  if (layer === 'page') {
    bindOfferings(node); bindOfferingPage(node); bindCases(node); bindBriefing(node);
    if (node.querySelector('[data-scenario]')) {
      const player = bindScenario(node, { autoplay: !isRefresh && Boolean(state.runSheet) });
      // An audience can preselect a step (e.g. Chief Safety Officer → the crew-safety step of U-S1).
      const aud = IDX.audiences[state.audience];
      if (!isRefresh && aud?.scenarioStep && node.querySelector(`[data-scenario="${aud.scenario}"]`)) player.show(aud.scenarioStep - 1);
    }
  }
  if (layer === 'drawer') bindStack(node);
  applyEdits();
});
document.addEventListener('layer-closed', (e) => { if (e.detail.layer === 'full') { layerPlayer?.destroy?.(); layerPlayer = null; } });
afterRoute((m) => {
  highlight(current().drawer);
  $$('[data-nav]').forEach((a) => a.classList.toggle('on', m?.hash?.startsWith(`#/${a.dataset.nav}`)));
});

// ---------------------------------------------------------------- interaction grammar
// Single click on an agent (or data product) opens its drawer; double-click (or Shift+Enter) opens the
// full view. The single click waits one double-click interval so a double-click never lands on a
// re-rendered drawer.
let clickTimer = null;
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-close]')) { e.preventDefault(); popTop(); return; }
  if (e.target.closest('#menu-btn')) { openMenu($('#menu').hidden); return; }
  if (!$('#menu').hidden && !e.target.closest('#menu')) openMenu(false);
  const el = e.target.closest('[data-agent], [data-dp]');
  if (!el || e.target.closest('button, input, label, summary') || (el.tagName !== 'A' && e.target.closest('a'))) return;
  e.preventDefault();
  const target = el.tagName === 'A' ? el.getAttribute('href') : `#/agent/${el.dataset.agent}`;
  clearTimeout(clickTimer);
  clickTimer = setTimeout(() => go(target), e.detail > 1 ? 0 : 230);
  if (e.detail > 1) clearTimeout(clickTimer);
});
document.addEventListener('dblclick', (e) => {
  const a = e.target.closest('[data-agent]');
  const dp = !a && e.target.closest('[data-dp]');
  if (!a && !dp) return;
  e.preventDefault();
  clearTimeout(clickTimer);
  go(a ? `#/agent/${a.dataset.agent}/full` : `#/dp/${dp.dataset.dp}/full`);
});

const typing = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
document.addEventListener('keydown', (e) => {
  stopAttract();
  armIdle();
  if (e.key === 'Escape') {
    if (!$('#menu').hidden) { openMenu(false); $('#menu-btn').focus(); return; }
    if (!$('#notes').hidden) { notesPanel(false); return; }
    if (popTop()) e.preventDefault();
    return;
  }
  if (typing(document.activeElement)) return;
  if (e.key === 'Enter' && e.shiftKey) {
    const a = document.activeElement?.closest('[data-agent]');
    if (a) { e.preventDefault(); go(`#/agent/${a.dataset.agent}/full`); return; }
    const dp = document.activeElement?.closest('[data-dp]');
    if (dp) { e.preventDefault(); go(`#/dp/${dp.dataset.dp}/full`); }
    return;
  }
  if (e.key === 'Enter') {
    const card = document.activeElement?.closest('article[data-agent]');
    if (card) { e.preventDefault(); go(`#/agent/${card.dataset.agent}`); }
    return;
  }
  if (e.key === 'p' || e.key === 'P') { document.body.classList.toggle('presenting'); toast(document.body.classList.contains('presenting') ? 'Presentation mode — P to exit' : 'Presentation mode off'); return; }
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'PageDown' || e.key === 'PageUp') {
    const d = e.key === 'ArrowRight' || e.key === 'PageDown' ? 1 : -1;
    const p = activePlayer();
    const inView = (el) => { const r = el?.getBoundingClientRect(); return r && r.bottom > 0 && r.top < window.innerHeight; };
    const playerVisible = p && (document.querySelector('.layer.open [data-scenario], .layer.open [data-trace]') || (!current().page && !current().drawer && inView(document.querySelector('#accelerate [data-scenario]'))));
    if (state.runSheet && !(p && current().page?.startsWith('#/scenario/'))) { e.preventDefault(); runSheetStep(d); return; }
    if (playerVisible) { e.preventDefault(); if (d > 0) p.next(); else p.prev(); }
    return;
  }
  if (e.key === ' ' && activePlayer() && (current().full || current().page?.startsWith('#/scenario/'))) { e.preventDefault(); activePlayer().toggle(); }
});
['pointerdown', 'wheel', 'touchstart'].forEach((ev) => document.addEventListener(ev, () => { stopAttract(); armIdle(); }, { passive: true }));

// Tooltips: any element with data-tip, on hover and focus.
const tip = $('#tip');
function showTip(el) {
  const text = el.getAttribute('data-tip');
  if (!text) return;
  tip.textContent = text;
  tip.hidden = false;
  const r = el.getBoundingClientRect();
  const w = Math.min(360, window.innerWidth - 24);
  tip.style.maxWidth = `${w}px`;
  const left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left));
  tip.style.left = `${left}px`;
  const below = r.bottom + 8;
  tip.style.top = `${below + 80 > window.innerHeight ? Math.max(8, r.top - tip.offsetHeight - 8) : below}px`;
}
const hideTip = () => { tip.hidden = true; };
document.addEventListener('mouseover', (e) => { const el = e.target.closest('[data-tip]'); if (el) showTip(el); else hideTip(); });
document.addEventListener('focusin', (e) => { const el = e.target.closest?.('[data-tip]'); if (el) showTip(el); else hideTip(); });
document.addEventListener('scroll', hideTip, true);

// State changes (lens, mode, audience, operator name, as-of shift, reset) re-render in place.
onChange((patch) => {
  if (patch.reset) resetProofFilters();
  const y = window.scrollY;
  chrome();
  renderStory();
  observeSections();
  window.scrollTo(0, y);
  refresh();
});

// Nav highlight on scroll.
const io = new IntersectionObserver((entries) => {
  entries.forEach((en) => { if (en.isIntersecting) $$('[data-nav]').forEach((a) => a.classList.toggle('on', a.dataset.nav === en.target.id)); });
}, { rootMargin: '-45% 0px -50% 0px' });

const observeSections = () => { io.disconnect(); ['why', 'future', 'accelerate', 'impact', 'proof'].forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); }); };

chrome();
renderStory();
bindMenu();
observeSections();
runBar();
start();
document.body.dataset.ready = '1';
armIdle();
if (!state.hintDismissed) { toast('Tip: press P for presentation mode · ⋯ opens the presenter menu'); set({ hintDismissed: true }, { silent: true }); }
window.__playbook = { go, apply, state };
