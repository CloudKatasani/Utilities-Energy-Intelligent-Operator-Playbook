// One-off import: docs/utilities/utilities-content-seed.json (+ the U2 process extension) →
// content/industries/utilities/domains.json. Re-run after the seed changes:
//   node scripts/tools/import-seed.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../lib/content.mjs';

const seed = JSON.parse(readFileSync(join(ROOT, 'docs/utilities/utilities-content-seed.json'), 'utf8'));
const extra = JSON.parse(readFileSync(join(ROOT, 'scripts/tools/extra-processes.json'), 'utf8'));
const industry = JSON.parse(readFileSync(join(ROOT, 'content/industries/utilities/industry.json'), 'utf8'));
const otPatterns = industry.otSafety.processPatterns.map((p) => p.toLowerCase());
const OT_EXTRA = ['Load transfer advisory', 'Gas supply balancing advice', 'Emissions-aware dispatch advice', 'Switching plan checking'];
const isOt = (p) => OT_EXTRA.includes(p.process) || otPatterns.some((x) => `${p.process} ${p.subProcess}`.toLowerCase().includes(x.toLowerCase()));

const processes = seed.processCatalog.map((p) => ({ ...p, operatingArea: undefined, subArea: undefined, areaId: seed.subAreas.find((s) => s.name === p.subArea).areaId, subAreaId: seed.subAreas.find((s) => s.name === p.subArea).id }));
let n = processes.length;
const subAreas = seed.subAreas.map((s) => {
  const e = extra[s.id];
  if (!e) throw new Error(`No third process for ${s.id}`);
  n += 1;
  const id = `UP-${String(n).padStart(3, '0')}`;
  const [process, subProcess, agentPattern, trigger, autonomy, valueLever, impact, readiness, motion] = e;
  processes.push({ id, family: s.family, domainId: s.domainId, areaId: s.areaId, subAreaId: s.id, commodity: s.commodity, process, subProcess, agentPattern, trigger, autonomy, valueLever, estimatedImpact: `${impact} [validate]`, readiness, motion, kpis: s.kpis, source: 'BENCH', validated: false, phase: 'U2' });
  return { ...s, processIds: [...s.processIds, id] };
});
processes.forEach((p) => {
  if (isOt(p)) { p.otCapped = true; if (p.autonomy > 'L2') throw new Error(`${p.id} is OT-adjacent but set to ${p.autonomy}`); }
  delete p.operatingArea; delete p.subArea;
});

const ICONS = { generation: 'turbine', grid: 'tower', customer: 'meter', enterprise: 'shield' };
const out = {
  _note: 'Imported from docs/utilities/utilities-content-seed.json by scripts/tools/import-seed.mjs, plus the U2 third process per sub-area (scripts/tools/extra-processes.json). Impact ranges are BENCH and need validation.',
  domains: seed.domains.map((d) => ({ ...d, icon: ICONS[d.id] })),
  areas: seed.areas,
  subAreas,
  processes,
};
writeFileSync(join(ROOT, 'content/industries/utilities/domains.json'), `${JSON.stringify(out, null, 1)}\n`);
console.log(`✓ domains.json: ${out.domains.length} domains, ${out.areas.length} areas, ${subAreas.length} sub-areas, ${processes.length} processes (${processes.filter((p) => p.otCapped).length} OT-capped)`);
