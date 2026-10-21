// Seeded synthetic data → content/industries/<id>/generated/synthetic.json, then the pack's reconciliation
// checks (spec §13). Any failed check fails the build.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, loadPack, selectedPacks } from './lib/content.mjs';

let failed = false;
for (const id of selectedPacks()) {
  const c = loadPack(id);
  const mod = await import(pathToFileURL(join(ROOT, `src/js/data/industries/${id}.js`)).href);
  const fx = c.scenarioFixtures;
  const otCapped = new Set(c.industry.otSafety?.agentsCapped || []);
  const agents = (c.agents?.agents || []).map((a) => ({ id: a.id, otCapped: otCapped.has(a.id) }));
  const syn = mod.generate(fx, { agents });
  const errors = mod.reconcile ? mod.reconcile(syn, fx, c) : [];
  mkdirSync(join(c.packDir, 'generated'), { recursive: true });
  writeFileSync(join(c.packDir, 'generated/synthetic.json'), `${JSON.stringify(syn)}\n`);
  if (errors.length) { failed = true; console.error(`✗ ${id}: ${errors.length} reconciliation check(s) failed\n  ${errors.join('\n  ')}`); }
  else console.log(`✓ ${id}: synthetic data generated (seed ${fx.seed}, as of ${fx.asOf}); reconciliation checks pass`);
}
if (failed) process.exit(1);
