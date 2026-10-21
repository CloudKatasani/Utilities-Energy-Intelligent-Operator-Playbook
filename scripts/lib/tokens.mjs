// Fixture tokens: a number is written once (scenario-fixtures.json or the synthetic generator) and every
// piece of copy refers to it, e.g. "{{fx.feederLockout.customersOut}}" or "{{syn.profile.substations|int}}".
// Formats: int (default for numbers, 1,234) · d1 · d2 · pct (0.123 → 12%) · pct1 · M (1,234,000 → 1.2M) · bn · raw
const FORMATS = {
  int: (v) => Math.round(v).toLocaleString('en-US'),
  d1: (v) => v.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
  d2: (v) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  pct: (v) => `${Math.round(v * 100)}%`,
  pct1: (v) => `${(v * 100).toFixed(1)}%`,
  M: (v) => `${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace(/\.0$/, '')}M`,
  bn: (v) => `${(v / 1e9).toFixed(1).replace(/\.0$/, '')}bn`,
  raw: (v) => String(v),
};

export const TOKEN_RE = /\{\{\s*((?:fx|syn|label)\.[\w.-]+)(?:\|(\w+))?\s*\}\}/g;

export function lookup(ctx, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), ctx);
}

export function formatValue(v, fmt) {
  if (typeof v === 'number') return (FORMATS[fmt || 'int'] || FORMATS.int)(v);
  return String(v);
}

// Resolve every token in a content tree. Unresolved tokens are collected (validate fails on them).
export function resolveTokens(node, ctx, missing = [], where = '') {
  if (typeof node === 'string') {
    return node.replace(TOKEN_RE, (m, path, fmt) => {
      const v = lookup(ctx, path);
      if (v === undefined || v === null || typeof v === 'object') { missing.push(`${where}: ${m}`); return m; }
      if (fmt && !FORMATS[fmt]) { missing.push(`${where}: unknown format in ${m}`); return m; }
      return formatValue(v, fmt);
    });
  }
  if (Array.isArray(node)) return node.map((x, i) => resolveTokens(x, ctx, missing, `${where}[${i}]`));
  if (node && typeof node === 'object') return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, resolveTokens(v, ctx, missing, where ? `${where}.${k}` : k)]));
  return node;
}

export const tokenContext = (c) => ({ fx: c.scenarioFixtures, syn: c.synthetic, label: c.industry?.labels });
