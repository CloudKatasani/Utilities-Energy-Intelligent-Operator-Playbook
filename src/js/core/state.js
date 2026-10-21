// Demo state. Session-scoped so a refresh keeps the presenter's place; "Reset demo" clears it.
// The operator name is memory-only and never saved (neutrality rule). Notes and edits are saved
// per browser in localStorage and can be downloaded as JSON from the presenter menu.

const KEY = 'uiop.session.v1';
const defaults = () => ({
  mode: 'presenter',
  audience: null,
  lens: 'all',
  motion: 'engineer',
  calc: {},
  calcCase: 'expected',
  readiness: null,
  offeringOption: {},
  checklist: {},
  autonomy: {},
  path: [],
  runSheet: null,
  anchorShift: 0,
  hintDismissed: false,
});

function load() {
  try { return { ...defaults(), ...JSON.parse(sessionStorage.getItem(KEY) || '{}') }; } catch { return defaults(); }
}

export const state = load();
state.operatorName = '';

const listeners = new Set();
export const onChange = (fn) => listeners.add(fn);

function persist() {
  const { operatorName, ...rest } = state;
  try { sessionStorage.setItem(KEY, JSON.stringify(rest)); } catch { /* storage unavailable */ }
}

export function set(patch, { silent = false } = {}) {
  Object.assign(state, patch);
  persist();
  if (!silent) listeners.forEach((fn) => fn(patch));
}

export function reset() {
  Object.keys(state).forEach((k) => delete state[k]);
  Object.assign(state, defaults(), { operatorName: '' });
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
  listeners.forEach((fn) => fn({ reset: true }));
}

// The path the presenter walks, for the executive briefing.
export function walk(kind, id, label) {
  const path = state.path.filter((x) => !(x.kind === kind && x.id === id));
  path.push({ kind, id, label });
  set({ path: path.slice(-40) }, { silent: true });
}

// Per-browser stores (notes, content edits).
export const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(`uiop.${key}`)) ?? fallback; } catch { return fallback; }
  },
  put(key, value) {
    try { localStorage.setItem(`uiop.${key}`, JSON.stringify(value)); } catch { /* ignore */ }
  },
};
