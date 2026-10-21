// Shared test setup: the industry pack under test, its built file, its content, and a page that blocks
// every network request and fails on console errors.
import { test as base, expect } from 'playwright/test';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const INDUSTRY = process.env.INDUSTRY || 'utilities';
export const FILE_URL = pathToFileURL(join(ROOT, 'dist', `${INDUSTRY}-playbook.html`)).href;
const html = readFileSync(join(ROOT, 'dist', `${INDUSTRY}-playbook.html`), 'utf8');
export const DATA = JSON.parse(html.match(/window\.__PLAYBOOK__=(\{.*?\});<\/script>/s)[1]);

export const test = base.extend({
  page: async ({ page }, use) => {
    const problems = [];
    page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
    await page.route(/^(https?|wss?):/, (r) => { problems.push(`network: ${r.request().url()}`); r.abort(); });
    await page.addInitScript(() => { window.__FAST_PLAYER__ = true; });
    await use(page);
    expect(problems, 'no console errors and no network calls').toEqual([]);
  },
});
export { expect };

export async function open(page, hash = '#/') {
  await page.goto(`${FILE_URL}${hash}`);
  await page.waitForSelector('#main .hero');
}

export async function go(page, hash) {
  await page.evaluate((h) => { location.hash = h; }, hash);
}
