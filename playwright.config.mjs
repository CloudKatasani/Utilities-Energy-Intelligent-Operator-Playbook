import { defineConfig } from 'playwright/test';

// Runs against the single-file build from file:// (the offline/email artifact) and, for one spec,
// against the static-site build served locally. Build first: `npm run build`.
const industry = process.env.INDUSTRY || 'utilities';
export default defineConfig({
  testDir: 'tests',
  testMatch: '*.spec.mjs',
  timeout: 120_000,
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' },
  webServer: { command: `node scripts/serve.mjs --industry=${industry}`, port: 4173, reuseExistingServer: !process.env.CI },
});
