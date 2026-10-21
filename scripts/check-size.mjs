// Size budget (spec §15): every single-file build stays under 8 MB. Prints the size line used in the README.
import { statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, selectedPacks } from './lib/content.mjs';

const BUDGET = 8 * 1024 * 1024;
let failed = false;
for (const id of selectedPacks()) {
  const f = join(ROOT, 'dist', `${id}-playbook.html`);
  if (!existsSync(f)) { console.error(`✗ size: ${f} missing — run npm run build`); failed = true; continue; }
  const bytes = statSync(f).size;
  const mb = (bytes / 1024 / 1024).toFixed(2);
  if (bytes > BUDGET) { console.error(`✗ size: dist/${id}-playbook.html is ${mb} MB (budget 8 MB)`); failed = true; }
  else console.log(`✓ size: dist/${id}-playbook.html is ${mb} MB (budget 8 MB)`);
}
if (failed) process.exit(1);
