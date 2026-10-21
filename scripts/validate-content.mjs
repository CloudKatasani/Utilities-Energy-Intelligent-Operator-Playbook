// Content validator CLI: validates every pack (or --industry=<id>) and exits non-zero on any problem.
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, loadPack, selectedPacks } from './lib/content.mjs';
import { validatePack } from './lib/validate.mjs';

let failed = 0;
for (const id of selectedPacks()) {
  const c = loadPack(id, { requireSynthetic: true });
  const mod = await import(pathToFileURL(join(ROOT, `src/js/data/industries/${id}.js`)).href);
  const errors = validatePack(c, mod);
  const dom = c.domains;
  const agents = c.agents.agents;
  if (errors.length) { failed += errors.length; console.error(`✗ ${id}: ${errors.length} content problem(s)\n  ${errors.join('\n  ')}`); }
  else console.log(`✓ ${id}: content valid — ${dom.domains.length} domains · ${dom.areas.length} areas · ${dom.subAreas.length} sub-areas · ${dom.processes.length} processes · ${agents.length} agents (${agents.filter((a) => a.script).length} scripted, ${c.industry.otSafety.agentsCapped.length} OT-capped) · ${c.dataProducts.products.length} data products · ${c.offerings.offerings.length} offerings · ${c.scenarios.scenarios.length} scenarios`);
}
if (failed) process.exit(1);
