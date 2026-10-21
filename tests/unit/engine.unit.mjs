// Unit tests (node --test): the safe expression parser, fixture tokens, the bundler, the synthetic
// generator's reconciliation checks and the content validator — including the OT safety rule.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { compile, parse } from '../../src/js/core/expr.js';
import { resolveTokens } from '../../scripts/lib/tokens.mjs';
import { bundle } from '../../scripts/lib/bundle.mjs';
import { loadPack, ROOT } from '../../scripts/lib/content.mjs';
import { validatePack } from '../../scripts/lib/validate.mjs';
import * as utilities from '../../src/js/data/industries/utilities.js';

const clone = (x) => JSON.parse(JSON.stringify(x));

test('expressions: precedence, functions and division by zero', () => {
  assert.equal(compile('1 + 2 * 3 ^ 2')({}), 19);
  assert.equal(compile('(a + b) / 2')({ a: 3, b: 5 }), 4);
  assert.equal(compile('-x * 2')({ x: 4 }), -8);
  assert.equal(compile('min(a, b) + max(a, b) + round(2.345, 2) + clamp(9, 0, 5)')({ a: 1, b: 2 }), 1 + 2 + 2.35 + 5);
  assert.equal(compile('a / 0')({ a: 1 }), 0);
  assert.equal(compile('1.5e3 * 2')({}), 3000);
});

test('expressions: unknown identifiers and unsafe syntax are rejected', () => {
  assert.throws(() => compile('a + b', ['a']), /Unknown identifier/);
  assert.throws(() => compile('a + 1')({}), /Unknown identifier "a"/);
  assert.throws(() => parse('window.alert(1)'), /Unexpected/);
  assert.throws(() => parse('a = 1'), /Unexpected/);
  assert.throws(() => parse('"x"'), /Unexpected/);
  assert.throws(() => parse('eval(1)'), /Unknown function/);
  assert.throws(() => compile('constructor')({}), /Unknown identifier/);
});

test('tokens: resolve with formats and report missing ones', () => {
  const missing = [];
  const out = resolveTokens({ a: '{{fx.n}} · {{fx.p|pct}} · {{fx.m|M}} · {{fx.d|d2}}', b: ['{{fx.nope}}'] }, { fx: { n: 4860, p: 0.86, m: 3200000, d: 1.05 } }, missing);
  assert.equal(out.a, '4,860 · 86% · 3.2M · 1.05');
  assert.equal(missing.length, 1);
});

test('bundler: wraps modules and rejects import cycles', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bundle-'));
  writeFileSync(join(dir, 'a.js'), "import { b } from './b.js';\nexport const a = () => b + 1;\n");
  writeFileSync(join(dir, 'b.js'), 'export const b = 41;\n');
  writeFileSync(join(dir, 'main.js'), "import { a } from './a.js';\nglobalThis.__out = a();\n");
  new Function(bundle(join(dir, 'main.js'), dir))();
  assert.equal(globalThis.__out, 42);
  writeFileSync(join(dir, 'b.js'), "import { a } from './a.js';\nexport const b = 1;\n");
  assert.throws(() => bundle(join(dir, 'main.js'), dir), /Import cycle/);
});

test('synthetic data: deterministic, and reconciliation fails when a fixture drifts', () => {
  const c = loadPack('utilities');
  const fx = c.scenarioFixtures;
  const agents = c.agents.agents.map((a) => ({ id: a.id }));
  const syn = utilities.generate(fx, { agents });
  assert.deepEqual(utilities.generate(fx, { agents }), syn, 'same seed, same data');
  assert.deepEqual(utilities.reconcile(syn, fx, c), []);
  assert.equal(syn.reliability.caidi, Math.round((syn.reliability.saidiExMed / syn.reliability.saifi) * 10) / 10);
  const drift = clone(fx);
  drift.feederLockout.restoredByTie = 3400;
  assert.ok(utilities.reconcile(syn, drift, c).some((e) => e.includes('CKT-12-04')));
  const storm = clone(fx);
  storm.storm.peakCustomersOut += 1;
  assert.ok(utilities.reconcile(syn, storm, c).some((e) => e.startsWith('storm')));
});

test('validator: the shipped pack is valid', () => {
  const c = loadPack('utilities', { requireSynthetic: true });
  assert.deepEqual(validatePack(c, utilities), []);
});

test('validator: the OT safety rule cannot be broken in content', () => {
  const base = loadPack('utilities', { requireSynthetic: true });
  const c1 = clone(base);
  c1.agents.agents.find((a) => a.id === 'UA-GO-02').autonomyMax = 'L3';
  assert.ok(validatePack(c1, utilities).some((e) => e.includes('OT cap: UA-GO-02')));
  const c2 = clone(base);
  c2.domains.processes.find((p) => p.otCapped).autonomy = 'L4';
  assert.ok(validatePack(c2, utilities).some((e) => e.includes('is OT-capped but set to L4')));
  const c3 = clone(base);
  const p = c3.domains.processes.find((x) => x.process === 'Volt/VAR optimisation');
  delete p.otCapped;
  assert.ok(validatePack(c3, utilities).some((e) => e.includes('matches an OT pattern')));
});

test('validator: calculator formulas may use only known identifiers', () => {
  const c = clone(loadPack('utilities', { requireSynthetic: true }));
  c.calculator.levers[0].formula = 'electricCustomers * mobileSubs';
  assert.ok(validatePack(c, utilities).some((e) => e.includes('Unknown identifier(s) mobileSubs')));
});

test('validator: broken references and routes are reported', () => {
  const c = clone(loadPack('utilities', { requireSynthetic: true }));
  c.scenarios.scenarios[0].steps[0].agentId = 'UA-XX-99';
  c.presenter.runSheets[0].steps[0].route = '#/nowhere';
  const errors = validatePack(c, utilities);
  assert.ok(errors.some((e) => e.includes('UA-XX-99')));
  assert.ok(errors.some((e) => e.includes('#/nowhere')));
  assert.ok(ROOT);
});
