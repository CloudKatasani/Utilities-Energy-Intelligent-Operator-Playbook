// Build: one engine + one industry pack → two outputs per pack.
//   dist/<id>-playbook.html   single self-contained file (email / offline, opens from file://)
//   dist/<id>/site/           static site (index.html + app.js + app.css + data.js) for hosting
// `node scripts/build.mjs --industry=utilities` builds one pack; no flag builds every pack.
import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadPack, selectedPacks } from './lib/content.mjs';
import { resolveTokens, tokenContext } from './lib/tokens.mjs';
import { bundle } from './lib/bundle.mjs';

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const js = bundle(join(ROOT, 'src/js/main.js'), ROOT);
const tpl = readFileSync(join(ROOT, 'src/index.html'), 'utf8');

// Brand typeface: any content/brand/fonts/<family>-<weight>.woff2 is embedded as a data URI (Ubuntu Font
// Licence permits embedding). Without font files the token stack falls back to Arial / Helvetica.
const FONT_DIR = join(ROOT, 'content/brand/fonts');
const fontFace = existsSync(FONT_DIR) ? readdirSync(FONT_DIR).filter((f) => /^ubuntu-\d{3}\.woff2$/i.test(f)).map((f) => {
  const w = f.match(/(\d{3})/)[1];
  return `@font-face{font-family:"Ubuntu";font-style:normal;font-weight:${w};font-display:swap;src:url(data:font/woff2;base64,${readFileSync(join(FONT_DIR, f)).toString('base64')}) format("woff2")}`;
}).join('') : '';
const css = fontFace + readFileSync(join(ROOT, 'src/styles/app.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n\s*\n/g, '\n');

const LOGOS = [['logo.svg', 'image/svg+xml'], ['logo.png', 'image/png']].map(([f, type]) => [join(ROOT, 'content/brand', f), type]);
const logo = LOGOS.find(([f]) => existsSync(f));
const IMG_TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', svg: 'image/svg+xml' };
const LS = String.fromCharCode(0x2028), PS = String.fromCharCode(0x2029);
const safe = (s) => s.replace(/<\/script/gi, '<\\/script');
const kb = (s) => `${(Buffer.byteLength(s) / 1024).toFixed(0)} KB`;

export function buildPack(id) {
  const c = loadPack(id, { requireSynthetic: true });
  const missing = [];
  const { shared, synthetic, scenarioFixtures, packDir, neutralityDenylist, ...rest } = c;
  const resolved = resolveTokens(rest, tokenContext(c), missing);
  if (missing.length) throw new Error(`Unresolved tokens in ${id}:\n  ${missing.slice(0, 20).join('\n  ')}`);
  const imgDir = join(packDir, 'images');
  const data = {
    ...resolved, shared, synthetic, fixtures: scenarioFixtures,
    build: { version: pkg.version, industry: id, asOf: synthetic.asOf, seed: synthetic.seed },
    brand: { ...(resolved.site.brand || {}), logo: logo ? `data:${logo[1]};base64,${readFileSync(logo[0]).toString('base64')}` : null },
    images: existsSync(imgDir) ? Object.fromEntries(readdirSync(imgDir).filter((f) => IMG_TYPES[f.split('.').pop()]).map((f) => [f.replace(/\.[^.]+$/, ''), `data:${IMG_TYPES[f.split('.').pop()]};base64,${readFileSync(join(imgDir, f)).toString('base64')}`])) : {},
  };
  const json = JSON.stringify(data).replace(/</g, '\\u003c').split(LS).join('\\u2028').split(PS).join('\\u2029');
  const dataJs = `window.__PLAYBOOK__=${json};`;
  const title = resolved.site.meta.title;
  const page = tpl.replace(/<!--TITLE-->/g, title).replace('<!--DESCRIPTION-->', resolved.site.meta.description);
  const single = page.replace('<!--CSS-->', () => `<style>${css}</style>`).replace('<!--DATA-->', () => `<script>${safe(dataJs)}</script>`).replace('<!--JS-->', () => `<script>${safe(js)}</script>`);
  const site = page.replace('<!--CSS-->', '<link rel="stylesheet" href="app.css">').replace('<!--DATA-->', '<script src="data.js"></script>').replace('<!--JS-->', '<script src="app.js"></script>');
  const siteDir = join(ROOT, 'dist', id, 'site');
  rmSync(join(ROOT, 'dist', id), { recursive: true, force: true });
  mkdirSync(siteDir, { recursive: true });
  writeFileSync(join(ROOT, 'dist', `${id}-playbook.html`), single);
  writeFileSync(join(siteDir, 'index.html'), site);
  writeFileSync(join(siteDir, 'app.css'), css);
  writeFileSync(join(siteDir, 'app.js'), js);
  writeFileSync(join(siteDir, 'data.js'), dataJs);
  console.log(`✓ built ${id} v${pkg.version}: dist/${id}-playbook.html (${kb(single)}) · dist/${id}/site/ (js ${kb(js)}, css ${kb(css)}, data ${kb(dataJs)})`);
}

for (const id of selectedPacks()) buildPack(id);
