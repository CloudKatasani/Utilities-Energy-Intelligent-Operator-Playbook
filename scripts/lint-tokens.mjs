// Design-token lint (spec §3.2: identical tokens). Colour literals may appear only inside the first :root
// block of app.css and only from the locked palette (or alpha variants of it). The only font stack is
// "Ubuntu", Arial, Helvetica, sans-serif. Scripts may not contain colour literals or set fonts.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT } from './lib/content.mjs';

const PALETTE = ['#121A38', '#0D1833', '#0E1833', '#0058AB', '#1DB8F2', '#00D5D0', '#15233F', '#60758A', '#D8E5EE', '#F5F9FC',
  '#17244A', '#1B2340', '#20B8FF', '#FFB800', '#FF7F6C', '#1268C8', '#5FD6F3', '#FFFFFF'];
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',');
const RGB = new Set([...PALETTE.map(hexRgb), '91,193,255', '7,30,70', '7,22,55', '13,24,51']);
const FONT = '"Ubuntu", Arial, Helvetica, sans-serif';
const COLOR = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g;
const errors = [];

const cssFile = join(ROOT, 'src/styles/app.css');
const css = readFileSync(cssFile, 'utf8').replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
const root = css.match(/:root\s*\{[\s\S]*?\n\}/);
if (!root) errors.push('app.css: no :root token block');
const [from, to] = root ? [root.index, root.index + root[0].length] : [0, 0];
const lineOf = (i) => css.slice(0, i).split('\n').length;
for (const m of css.matchAll(COLOR)) {
  const where = `src/styles/app.css:${lineOf(m.index)}`;
  if (m.index < from || m.index > to) { errors.push(`${where}: colour literal ${m[0]} outside :root — use a token`); continue; }
  if (m[0].startsWith('#')) { if (!PALETTE.includes(m[0].toUpperCase())) errors.push(`${where}: ${m[0]} is not a palette token`); continue; }
  if (m[0].startsWith('hsl')) { errors.push(`${where}: hsl() is not allowed`); continue; }
  const rgb = m[0].replace(/rgba?\(|\)/g, '').split(',').slice(0, 3).map((x) => x.trim()).join(',');
  if (!RGB.has(rgb)) errors.push(`${where}: ${m[0]} is not derived from a palette token`);
}
for (const m of css.matchAll(/font-family\s*:\s*([^;}]+)/g)) if (m[1].trim() !== 'var(--font)' && m[1].trim() !== 'inherit') errors.push(`src/styles/app.css:${lineOf(m.index)}: font-family must be var(--font)`);
if (css.match(/--font\s*:\s*([^;]+);/)?.[1].trim() !== FONT) errors.push(`app.css: --font must be ${FONT}`);
if (/@import|@font-face|url\(\s*['"]?https?:/i.test(css)) errors.push('app.css: @import, @font-face or remote URLs are not allowed (fonts are embedded by the build)');

const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : []; });
for (const f of walk(join(ROOT, 'src/js'))) {
  readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
    for (const m of l.matchAll(/(['"`])#[0-9a-fA-F]{3,8}\1|rgba?\(\s*\d|hsla?\(/g)) errors.push(`${relative(ROOT, f)}:${i + 1}: colour literal in script (${m[0]})`);
    if (/font-family/.test(l)) errors.push(`${relative(ROOT, f)}:${i + 1}: font set from script`);
  });
}

if (errors.length) { console.error(`✗ design-token lint: ${errors.length} problem(s)\n  ${errors.join('\n  ')}`); process.exit(1); }
console.log('✓ design-token lint: every colour and font comes from the locked tokens');
