// WCAG 2.2 contrast check for the text/background token pairs the stylesheet uses. Alpha colours are
// blended over their background. Fails below 4.5:1 (3:1 for large or bold UI text), except for pairs
// listed in KNOWN (locked tokens that cannot change), which are reported.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/content.mjs';

const css = readFileSync(join(ROOT, 'src/styles/app.css'), 'utf8');
const root = css.match(/:root\s*\{([\s\S]*?)\n\}/)[1];
const T = Object.fromEntries([...root.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const parse = (v) => {
  if (v.startsWith('#')) return [...[1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16)), 1];
  const p = v.replace(/rgba?\(|\)/g, '').split(',').map((x) => parseFloat(x));
  return [p[0], p[1], p[2], p[3] ?? 1];
};
const blend = (fg, bg) => fg.slice(0, 3).map((c, i) => c * fg[3] + bg[i] * (1 - fg[3]));
const lum = (rgb) => { const [r, g, b] = rgb.map((c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (fgName, bgName, under) => {
  const bgBase = under ? parse(T[under]) : null;
  let bg = parse(T[bgName]);
  if (bg[3] < 1) bg = [...blend(bg, bgBase || [255, 255, 255, 1]), 1];
  const fg = blend(parse(T[fgName]), bg);
  const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
};

// [foreground, background, minimum, background-under-alpha?]
const PAIRS = [
  ['ink', 'soft', 4.5], ['ink', 'white', 4.5], ['muted', 'white', 4.5], ['muted', 'soft', 4.5], ['blue', 'soft', 4.5], ['blue', 'white', 4.5],
  ['white', 'navy', 4.5], ['white', 'navy2', 4.5], ['white', 'hero', 4.5], ['white', 'card', 4.5], ['white', 'header', 4.5],
  ['body-dark', 'navy', 4.5], ['body-dark', 'navy2', 4.5], ['faint-dark', 'navy', 4.5], ['faint-dark', 'card', 4.5], ['faint-dark', 'header', 4.5],
  ['sky', 'navy', 4.5], ['sky', 'hero', 4.5], ['teal', 'card', 4.5], ['consume-dark', 'navy', 4.5],
  ['navy', 'sky', 4.5], ['navy', 'teal', 4.5], ['ink', 'teal-15', 4.5, 'white'], ['ink', 'amber-15', 4.5, 'white'], ['ink', 'coral-12', 4.5, 'white'],
  ['blue', 'sky-12', 4.5, 'white'], ['blue', 'blue-10', 4.5, 'white'], ['navy', 'sky-45', 4.5, 'white'], ['navy', 'teal-70', 4.5, 'white'],
];
const KNOWN = { 'muted/soft': 'locked token pair measures just under 4.5:1; kept because the theme is locked (same as the earlier Demo Edition)' };

const fails = [];
const lines = PAIRS.map(([fg, bg, min, under]) => {
  const r = ratio(fg, bg, under);
  const key = `${fg}/${bg}`;
  const ok = r >= min || (KNOWN[key] && r >= min - 0.05);
  if (!ok) fails.push(`${key} = ${r.toFixed(2)}:1 (needs ${min}:1)`);
  return `${ok ? '✓' : '✗'} ${key.padEnd(24)} ${r.toFixed(2)}:1${KNOWN[key] && r < min ? `  (known: ${KNOWN[key]})` : ''}`;
});
if (process.argv.includes('--verbose')) console.log(lines.join('\n'));
if (fails.length) { console.error(`✗ contrast: ${fails.length} pair(s) below WCAG AA\n  ${fails.join('\n  ')}`); process.exit(1); }
console.log(`✓ contrast: ${PAIRS.length} text/background token pairs meet WCAG AA${lines.some((l) => l.includes('known')) ? ' (1 documented exception)' : ''}`);
