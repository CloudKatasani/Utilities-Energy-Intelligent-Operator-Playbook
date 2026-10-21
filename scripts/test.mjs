// Runs the Playwright smoke suite for each pack (`npm test -- --industry=utilities` for one).
// The suite reads INDUSTRY from the environment; the build must exist (npm run build).
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { selectedPacks } from './lib/content.mjs';

const cli = join(dirname(createRequire(import.meta.url).resolve('playwright/package.json')), 'cli.js');
const extra = process.argv.slice(2).filter((a) => !a.startsWith('--industry='));
let status = 0;
for (const id of selectedPacks()) {
  console.log(`▶ smoke suite: ${id}`);
  const r = spawnSync(process.execPath, [cli, 'test', ...extra], { stdio: 'inherit', env: { ...process.env, INDUSTRY: id } });
  status ||= r.status ?? 1;
}
process.exit(status);
