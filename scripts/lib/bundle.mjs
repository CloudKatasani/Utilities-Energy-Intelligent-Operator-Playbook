// A minimal ES-module bundler for this repository's own sources, so the build needs no npm dependency.
// It supports the subset of module syntax the sources use (and fails loudly on anything else):
//   import { a, b as c } from './x.js';      import * as ns from './x.js';
//   export function f() {} / export async function / export const x = … / export class C {}
//   export { a, b as c };
// Each module becomes a factory in a small registry; exports are getters, so values are read on use.
// Modules must not import each other in a cycle (checked).
import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

const IMPORT_RE = /^import\s+(?:\{([^}]*)\}|\*\s+as\s+([\w$]+))\s+from\s+['"]([^'"]+)['"];?\s*$/;

function transform(file, root) {
  const lines = readFileSync(file, 'utf8').split('\n');
  const deps = [];
  const exportsList = [];
  const out = lines.map((line, i) => {
    const where = `${relative(root, file)}:${i + 1}`;
    if (/^import\s/.test(line)) {
      const m = line.match(IMPORT_RE);
      if (!m) throw new Error(`${where}: unsupported import syntax: ${line}`);
      const target = resolve(dirname(file), m[3]);
      deps.push(target);
      const id = JSON.stringify(relative(root, target));
      if (m[2]) return `const ${m[2]} = __r(${id});`;
      const names = m[1].split(',').map((s) => s.trim()).filter(Boolean).map((s) => s.replace(/\s+as\s+/, ': '));
      return `const { ${names.join(', ')} } = __r(${id});`;
    }
    let m = line.match(/^export\s+(async\s+function\*?|function\*?|const|let|class)\s+([\w$]+)/);
    if (m) { exportsList.push([m[2], m[2]]); return line.replace(/^export\s+/, ''); }
    m = line.match(/^export\s*\{([^}]*)\};?\s*$/);
    if (m) {
      m[1].split(',').map((s) => s.trim()).filter(Boolean).forEach((s) => {
        const [local, as] = s.split(/\s+as\s+/);
        exportsList.push([as || local, local]);
      });
      return '';
    }
    if (/^export\s/.test(line)) throw new Error(`${where}: unsupported export syntax: ${line}`);
    return line;
  });
  const getters = exportsList.map(([name, local]) => `${JSON.stringify(name)}: { enumerable: true, get: () => ${local} }`).join(', ');
  const body = `Object.defineProperties(__e, { ${getters} });\n${out.join('\n')}`;
  return { deps, body };
}

export function bundle(entry, root) {
  const modules = new Map();
  const visiting = new Set();
  const visit = (file, chain) => {
    if (visiting.has(file)) throw new Error(`Import cycle: ${[...chain, file].map((f) => relative(root, f)).join(' → ')}`);
    if (modules.has(file)) return;
    visiting.add(file);
    const mod = transform(file, root);
    mod.deps.forEach((d) => visit(d, [...chain, file]));
    visiting.delete(file);
    modules.set(file, mod);
  };
  visit(resolve(entry), []);
  const defs = [...modules].map(([file, mod]) => `__d(${JSON.stringify(relative(root, file))}, function (__e, __r) {\n${mod.body}\n});`).join('\n');
  const runtime = 'const __m = {}, __f = {};\nconst __d = (id, fn) => { __f[id] = fn; };\nconst __r = (id) => { if (!__m[id]) { __m[id] = {}; __f[id](__m[id], __r); } return __m[id]; };';
  return `(function () {\n'use strict';\n${runtime}\n${defs}\n__r(${JSON.stringify(relative(root, resolve(entry)))});\n})();\n`;
}
