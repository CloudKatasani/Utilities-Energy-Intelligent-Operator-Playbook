// Content loading for industry packs.
//   content/shared/*.json              engine-wide content (autonomy levels, source types, engagement options …)
//   content/industries/<id>/*.json     one pack per industry; file name → key (dataProducts.json → dataProducts)
//   content/industries/<id>/generated/ synthetic.json written by scripts/generate-synthetic.mjs
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const INDUSTRIES_DIR = join(ROOT, 'content/industries');

const key = (f) => f.replace(/\.json$/, '').replace(/-(\w)/g, (_, c) => c.toUpperCase());
const readJson = (p) => {
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch (e) { throw new Error(`${p}: ${e.message}`); }
};
const readDir = (d) => Object.fromEntries(readdirSync(d).filter((f) => f.endsWith('.json')).sort().map((f) => [key(f), readJson(join(d, f))]));

export const listPacks = () => readdirSync(INDUSTRIES_DIR).filter((d) => statSync(join(INDUSTRIES_DIR, d)).isDirectory() && existsSync(join(INDUSTRIES_DIR, d, 'industry.json'))).sort();

// `--industry=utilities` (or INDUSTRY=utilities) selects one pack; no flag means every pack.
export function selectedPacks(argv = process.argv) {
  const flag = argv.find((a) => a.startsWith('--industry='))?.split('=')[1] || process.env.INDUSTRY;
  const all = listPacks();
  if (!flag) return all;
  if (!all.includes(flag)) throw new Error(`Unknown industry pack "${flag}". Available: ${all.join(', ')}`);
  return [flag];
}

export function loadPack(id, { requireSynthetic = false } = {}) {
  const dir = join(INDUSTRIES_DIR, id);
  const c = { shared: readDir(join(ROOT, 'content/shared')), ...readDir(dir) };
  const gen = join(dir, 'generated/synthetic.json');
  c.synthetic = existsSync(gen) ? readJson(gen) : null;
  if (requireSynthetic && !c.synthetic) throw new Error(`Run \`npm run generate\` first (${gen} missing).`);
  c.packDir = dir;
  return c;
}
