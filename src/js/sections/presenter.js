// Presenter menu (F10): audience lens, run sheets, Client/Presenter mode, operator name (session only),
// as-of shift, notes and edit modes (saved as JSON in this browser), presentation mode, attract mode,
// reset, and the executive briefing (print / PDF or standalone HTML).
import { D, IDX, esc, rich, attr, closeBtn, toast, download, money, reducedMotion, $, $$ } from '../core/util.js';
import { state, set, reset, store } from '../core/state.js';
import { go, current } from '../core/router.js';
import { icon } from '../core/icons.js';
import { calculate, readinessResult } from './impact.js';

const P = D.presenter;

export function menuHtml() {
  const aud = state.audience ? IDX.audiences[state.audience] : null;
  return `<div class="menu-inner" role="menu" aria-label="Presenter menu">
    <div class="menu-head"><b>Presenter menu</b><button class="close" data-menu-close aria-label="Close menu">×</button></div>
    <div class="menu-group"><h4>Audience</h4><div class="chips">${P.audiences.map((a) => `<button class="chip-btn${state.audience === a.id ? ' on' : ''}" data-audience="${a.id}" aria-pressed="${state.audience === a.id}">${esc(a.name)}</button>`).join('')}</div>
      ${aud ? `<p class="small">${esc(aud.emphasis)}</p>` : ''}</div>
    <div class="menu-group"><h4>Run sheets</h4><div class="chips">${P.runSheets.map((r) => `<button class="chip-btn" data-runsheet="${r.id}">${esc(r.name)}</button>`).join('')}</div></div>
    <div class="menu-group"><h4>Mode</h4><div class="seg seg-small" role="group" aria-label="Mode">${['presenter', 'client'].map((m) => `<button class="seg-btn${state.mode === m ? ' on' : ''}" data-mode="${m}" aria-pressed="${state.mode === m}">${m === 'client' ? 'Client' : 'Presenter'}</button>`).join('')}</div>
      <p class="small muted">Client mode hides offer teams, objections, notes, unvalidated offer mappings and unapproved case studies.</p></div>
    <div class="menu-group"><h4>Operator name <small class="muted">(this session only, never saved)</small></h4>
      <input type="text" data-opname value="${attr(state.operatorName)}" placeholder="${attr(D.industry.labels.yourOrg)}" aria-label="Operator name"></div>
    <div class="menu-group"><h4>As-of date shift</h4><div class="seg seg-small" role="group" aria-label="As-of shift">${[-3, 0, 3, 6].map((k) => `<button class="seg-btn${state.anchorShift === k ? ' on' : ''}" data-shift="${k}">${k > 0 ? `+${k}` : k} mo</button>`).join('')}</div></div>
    <div class="menu-group menu-actions">
      <button class="btn" data-act="present">${icon('play')} Presentation mode (P)</button>
      <button class="btn" data-act="notes">Notes</button>
      <button class="btn" data-act="edit">${document.body.classList.contains('editing') ? 'Stop editing' : 'Edit copy'}</button>
      <button class="btn" data-act="download">Download notes & edits (JSON)</button>
      <button class="btn" data-act="attract">Attract mode</button>
      <a class="btn" href="#/briefing" data-act="briefing">Executive briefing</a>
      <button class="btn ghost" data-act="reset">Reset demo</button>
    </div></div>`;
}

export function openMenu(open = true) {
  const m = $('#menu');
  m.hidden = !open;
  if (open) { m.innerHTML = menuHtml(); $('[data-menu-close]', m).focus(); }
  $('#menu-btn')?.setAttribute('aria-expanded', open);
}

function applyAudience(id) {
  const a = IDX.audiences[id];
  set({ audience: id, motion: a.motion, lens: a.motion });
  toast(`Audience: ${a.name} — preselected ${IDX.outcomes[a.outcome].name}, ${IDX.motions[a.motion].short}, ${a.scenario}`);
}

// ---------------------------------------------------------------- run sheets
export function runBar() {
  const bar = $('#runbar');
  const rs = state.runSheet;
  if (!rs) { bar.hidden = true; bar.innerHTML = ''; document.body.classList.remove('has-runbar'); return; }
  const sheet = P.runSheets.find((r) => r.id === rs.id);
  const step = sheet.steps[rs.step];
  const elapsed = Math.floor((Date.now() - rs.startedAt) / 60000);
  const planned = sheet.steps.slice(0, rs.step + 1).reduce((s, x) => s + x.minutes, 0);
  bar.hidden = false;
  document.body.classList.add('has-runbar');
  bar.innerHTML = `<span class="rb-name">${esc(sheet.name)}</span><button class="btn" data-rb="-1" aria-label="Previous step">${icon('prev')}</button>
    <span class="rb-step"><b>${rs.step + 1}/${sheet.steps.length} · ${esc(step.title)}</b> <span class="rb-talk">${esc(step.talk)}</span></span>
    <span class="rb-timer" title="Elapsed / planned">${elapsed} / ${planned} min</span><button class="btn" data-rb="1" aria-label="Next step">${icon('next')}</button><button class="close" data-rb="stop" aria-label="End run sheet">×</button>`;
}

export function runSheetStep(delta) {
  const rs = state.runSheet;
  if (!rs) return false;
  const sheet = P.runSheets.find((r) => r.id === rs.id);
  const i = Math.max(0, Math.min(sheet.steps.length - 1, rs.step + delta));
  set({ runSheet: { ...rs, step: i } }, { silent: true });
  go(sheet.steps[i].route);
  runBar();
  return true;
}

function startRunSheet(id) {
  const sheet = P.runSheets.find((r) => r.id === id);
  set({ runSheet: { id, step: 0, startedAt: Date.now() } }, { silent: true });
  openMenu(false);
  go(sheet.steps[0].route);
  runBar();
}

// ---------------------------------------------------------------- notes and edits
const noteKey = () => (current().full || current().drawer || current().page || current().base || '#/');
export function notesPanel(show) {
  const n = $('#notes');
  if (show === false || (show === undefined && !n.hidden)) { n.hidden = true; return; }
  if (state.mode === 'client') { toast('Notes are hidden in Client mode'); return; }
  const notes = store.get('notes', {});
  const key = noteKey();
  n.hidden = false;
  n.innerHTML = `<div class="notes-head"><b>Notes · ${esc(key)}</b><button class="close" data-notes-close aria-label="Close notes">×</button></div>
    <textarea data-note="${attr(key)}" aria-label="Presenter notes">${esc(notes[key] || '')}</textarea><p class="small muted">${esc(P.notesTemplate)}</p>`;
}

export function applyEdits() {
  const edits = store.get('edits', {});
  $$('[data-edit]').forEach((el) => { if (edits[el.dataset.edit] !== undefined) el.textContent = edits[el.dataset.edit]; });
}

function toggleEdit() {
  const on = !document.body.classList.contains('editing');
  document.body.classList.toggle('editing', on);
  $$('[data-edit]').forEach((el) => { el.contentEditable = on ? 'true' : 'false'; });
  toast(on ? 'Edit mode: click highlighted copy to change it. Changes are saved as JSON in this browser.' : 'Edit mode off');
}

// ---------------------------------------------------------------- briefing
export function briefingPage() {
  const r = readinessResult(state.readiness);
  const calc = calculate();
  const path = state.path;
  const agents = path.filter((x) => x.kind === 'agent' || x.kind === 'run');
  const offerings = path.filter((x) => x.kind === 'offering');
  const outcome = path.filter((x) => x.kind === 'outcome').pop();
  const aud = state.audience ? IDX.audiences[state.audience] : null;
  const org = state.operatorName || D.industry.labels.yourOrg;
  return `<div class="page briefing" data-briefing>
    <header class="pg-head">${closeBtn()}<p class="kicker">Executive briefing</p><h1 data-autofocus>${esc(D.site.meta.title.split(' — ')[0])}: briefing for ${esc(org)}</h1>
      <p class="lede">${aud ? `Prepared for the ${esc(aud.name)}. ` : ''}${esc(D.industry.synthetic.disclosure)}.</p>
      <div class="no-print"><button class="btn primary" data-print>Print / Save as PDF</button> <button class="btn" data-brief-html>Download HTML</button></div></header>
    <section><h2>Outcome in focus</h2><p>${outcome ? esc(outcome.label) : esc(IDX.outcomes[aud?.outcome || 'reliability'].name)}</p></section>
    <section><h2>Where to start</h2><p><b>${esc(IDX.motions[r.start].name)}.</b> ${rich(r.why)}</p><p>Readiness ${r.score}/100 (${esc(r.tier.name)})${r.blockers.length ? ` · hard blockers: ${r.blockers.map(esc).join('; ')}` : ''}. First 90 days: ${esc(D.motions.plan.first90[r.start])}. Throughout: ${esc(D.layers.controlPlane.name)}, with the OT safety rule.</p></section>
    <section><h2>Value</h2><p>${money(calc.derived.total)} a year at full run rate (${esc(state.calcCase)} case); ${rampText(calc)}. Ranges are benchmarks pending validation.</p></section>
    <section><h2>Agents seen</h2>${agents.length ? `<ul>${[...new Map(agents.map((a) => [a.id, a])).values()].map((a) => `<li>${esc(IDX.agents[a.id]?.name || a.label)} (${esc(a.id)})</li>`).join('')}</ul>` : '<p>None yet — open any agent to add it.</p>'}</section>
    <section><h2>Offerings and options</h2>${offerings.length ? `<ul>${offerings.map((o) => `<li>${esc(o.label)}</li>`).join('')}</ul>` : '<p>None yet.</p>'}</section>
    <section><h2>Path walked</h2><ol>${path.map((p) => `<li>${esc(p.label)}</li>`).join('') || '<li>Nothing yet.</li>'}</ol></section>
    <section><h2>Safety</h2><p>${esc(D.industry.otSafety.rule)}</p></section>
  </div>`;
}

const rampText = (calc) => calc.ramp.map((v, i) => `${D.calculator.rampLabels[i]} ${money(v)}`).join(', ');

export function bindBriefing(node) {
  const root = node.querySelector('[data-briefing]');
  if (!root) return;
  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-print]')) { document.body.classList.add('printing-briefing'); window.print(); setTimeout(() => document.body.classList.remove('printing-briefing'), 500); }
    if (e.target.closest('[data-brief-html]')) {
      const clone = root.cloneNode(true);
      clone.querySelectorAll('.no-print, .close').forEach((x) => x.remove());
      const doc = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Executive briefing</title><style>body{max-width:860px;margin:40px auto;line-height:1.55;padding:0 20px}h1{font-size:28px}h2{font-size:18px;margin-top:28px}.kicker{text-transform:uppercase;letter-spacing:.15em;font-size:12px}</style></head><body>${clone.innerHTML}</body></html>`;
      download('executive-briefing.html', doc, 'text/html');
    }
  });
}

// ---------------------------------------------------------------- attract and presentation modes
let idle = null;
let attractTimer = null;
export function stopAttract() {
  if (!document.body.classList.contains('attract')) return;
  document.body.classList.remove('attract');
  clearInterval(attractTimer);
}
function startAttract() {
  openMenu(false);
  document.body.classList.add('attract');
  const stops = ['why', 'future', 'accelerate', 'impact', 'proof'];
  let i = 0;
  clearInterval(attractTimer);
  attractTimer = setInterval(() => { i = (i + 1) % stops.length; document.getElementById(stops[i])?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' }); }, 6000);
}
export function armIdle() {
  clearTimeout(idle);
  if (state.mode === 'presenter') idle = setTimeout(startAttract, 5 * 60 * 1000);
}

export function bindMenu() {
  const m = $('#menu');
  m.addEventListener('click', (e) => {
    if (e.target.closest('[data-menu-close]')) { openMenu(false); return; }
    const a = e.target.closest('[data-audience]');
    if (a) { applyAudience(a.dataset.audience); m.innerHTML = menuHtml(); return; }
    const rs = e.target.closest('[data-runsheet]');
    if (rs) { startRunSheet(rs.dataset.runsheet); return; }
    const md = e.target.closest('[data-mode]');
    if (md) { set({ mode: md.dataset.mode }); m.innerHTML = menuHtml(); toast(md.dataset.mode === 'client' ? 'Client mode' : 'Presenter mode'); return; }
    const sh = e.target.closest('[data-shift]');
    if (sh) { set({ anchorShift: Number(sh.dataset.shift) }); m.innerHTML = menuHtml(); return; }
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act) return;
    if (act === 'present') { document.body.classList.toggle('presenting'); openMenu(false); }
    if (act === 'notes') { openMenu(false); notesPanel(true); }
    if (act === 'edit') { if (state.mode === 'client') { toast('Edit tools are hidden in Client mode'); return; } toggleEdit(); m.innerHTML = menuHtml(); }
    if (act === 'download') download('playbook-notes-and-edits.json', JSON.stringify({ industry: D.build.industry, notes: store.get('notes', {}), edits: store.get('edits', {}) }, null, 2));
    if (act === 'attract') startAttract();
    if (act === 'briefing') openMenu(false);
    if (act === 'reset') { reset(); store.put('edits', {}); openMenu(false); runBar(); go('#/', { replace: true }); window.scrollTo(0, 0); toast('Demo reset'); }
  });
  m.addEventListener('input', (e) => {
    if (e.target.matches('[data-opname]')) { state.operatorName = e.target.value.slice(0, 60); clearTimeout(bindMenu.t); bindMenu.t = setTimeout(() => set({}), 250); }
  });
  $('#runbar').addEventListener('click', (e) => {
    const b = e.target.closest('[data-rb]');
    if (!b) return;
    if (b.dataset.rb === 'stop') { set({ runSheet: null }, { silent: true }); runBar(); return; }
    runSheetStep(Number(b.dataset.rb));
  });
  $('#notes').addEventListener('input', (e) => {
    const t = e.target.closest('[data-note]');
    if (!t) return;
    const notes = store.get('notes', {});
    notes[t.dataset.note] = t.value;
    store.put('notes', notes);
  });
  $('#notes').addEventListener('click', (e) => { if (e.target.closest('[data-notes-close]')) notesPanel(false); });
  document.addEventListener('focusout', (e) => {
    const el = e.target.closest?.('[data-edit]');
    if (!el || !document.body.classList.contains('editing')) return;
    const edits = store.get('edits', {});
    edits[el.dataset.edit] = el.textContent.trim();
    store.put('edits', edits);
  });
}
