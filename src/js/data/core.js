// Industry-neutral helpers for seeded synthetic data (spec C1). Runs in Node (generator) and the browser.

// mulberry32: small, fast, deterministic PRNG.
export function rng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1));
  next.pick = (arr) => arr[Math.floor(next() * arr.length)];
  next.normal = (mu = 0, sd = 1) => {
    const u = Math.max(next(), 1e-9), v = next();
    return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  next.weighted = (pairs) => {
    const total = pairs.reduce((s, [, w]) => s + w, 0);
    let r = next() * total;
    for (const [v, w] of pairs) { r -= w; if (r <= 0) return v; }
    return pairs[pairs.length - 1][0];
  };
  return next;
}

// Split an integer total by weights so the parts sum exactly to the total (largest remainder).
export function apportion(total, weights) {
  const sum = weights.reduce((s, w) => s + w, 0);
  const raw = weights.map((w) => (total * w) / sum);
  const out = raw.map(Math.floor);
  let left = total - out.reduce((s, x) => s + x, 0);
  raw.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { out[i] += 1; left -= 1; } });
  return out;
}

// n month labels ending at the as-of month, oldest first: ['2025-09', …, '2026-09'].
export function months(asOf, n) {
  const [y, m] = asOf.split('-').map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (n - 1 - i), 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  });
}

export const round = (x, d = 0) => { const p = 10 ** d; return Math.round(x * p) / p; };

// Masked identifiers: deterministic and obviously synthetic.
export const mask = (prefix, n) => `${prefix}-•••${String(n % 10000).padStart(4, '0')}`;
