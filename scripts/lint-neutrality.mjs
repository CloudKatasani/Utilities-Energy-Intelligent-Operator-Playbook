// Neutrality lint (spec §14). For each pack, fails on any deny-listed organisation or brand name, or a
// real-looking identifier (coordinates, docket numbers), in the pack content and in the built output.
// Source citations (sources.json) and _note fields are allowed to name publishers.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT, loadPack, selectedPacks } from './lib/content.mjs';

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let failed = 0;

function strings(node, path, out, allowed) {
  if (typeof node === 'string') { out.push([path, node]); return out; }
  if (Array.isArray(node)) node.forEach((x, i) => strings(x, `${path}[${i}]`, out, allowed));
  else if (node && typeof node === 'object') Object.entries(node).forEach(([k, v]) => { if (!allowed.includes(k)) strings(v, path ? `${path}.${k}` : k, out, allowed); });
  return out;
}

for (const id of selectedPacks()) {
  const c = loadPack(id);
  const deny = c.neutralityDenylist;
  const res = deny.terms.map((t) => [t, new RegExp(`(^|[^A-Za-z0-9])${escRe(t)}([^A-Za-z0-9]|$)`, 'i')]);
  const pats = deny.patterns.map((p) => [p.why, new RegExp(p.re)]);
  const errors = [];
  const scan = (where, text) => {
    for (const [t, re] of res) if (re.test(text)) errors.push(`${where}: "${t}"`);
    for (const [why, re] of pats) if (re.test(text)) errors.push(`${where}: ${why}`);
  };
  const { shared, synthetic, packDir, neutralityDenylist, sources, ...rest } = c;
  strings(rest, '', [], deny.allowedContexts).forEach(([p, s]) => scan(`content/industries/${id} ${p}`, s));
  // Engine sources must stay industry-neutral too.
  const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
  walk(join(ROOT, 'src')).filter((f) => /\.(js|html|css)$/.test(f)).forEach((f) => scan(relative(ROOT, f), readFileSync(f, 'utf8').replace(/^\s*\/\/.*$/gm, '')));
  // Built output (when present): visible text only, without the embedded source citations.
  const built = join(ROOT, 'dist', `${id}-playbook.html`);
  if (existsSync(built)) {
    const data = JSON.parse(readFileSync(built, 'utf8').match(/window\.__PLAYBOOK__=(\{.*?\});<\/script>/s)[1]);
    delete data.sources; delete data.brand; delete data.images;
    strings(data, '', [], deny.allowedContexts).forEach(([p, s]) => scan(`dist/${id}-playbook.html ${p}`, s));
  }
  if (errors.length) { failed += errors.length; console.error(`✗ neutrality lint (${id}): ${errors.length} problem(s)\n  ${[...new Set(errors)].slice(0, 50).join('\n  ')}`); }
  else console.log(`✓ neutrality lint (${id}): no deny-listed names or real identifiers (${deny.terms.length} terms, ${deny.patterns.length} patterns)`);
}
if (failed) process.exit(1);
