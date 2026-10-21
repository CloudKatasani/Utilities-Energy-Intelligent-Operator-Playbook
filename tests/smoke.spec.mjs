// Smoke suite, parameterised by industry pack (INDUSTRY env, default utilities). Runs on the single-file
// build from file:// with the network blocked; one test runs the static-site build over HTTP.
import { test as plainTest } from 'playwright/test';
import { test, expect, open, go, DATA, INDUSTRY } from './fixtures.mjs';

const agents = DATA.agents.agents;
const capped = DATA.industry.otSafety.agentsCapped;
const L = DATA.industry.labels;

test.describe('structure', () => {
  test('five sections, one presenter menu and no tab bars', async ({ page }) => {
    await open(page);
    await expect(page.locator('.nav a')).toHaveCount(5);
    for (const id of ['why', 'future', 'accelerate', 'impact', 'proof']) await expect(page.locator(`section#${id}`)).toHaveCount(1);
    await expect(page.locator('[role="tab"], [role="tablist"]')).toHaveCount(0);
    await expect(page.locator('#menu-btn')).toBeVisible();
  });

  test('header, hero copy, labels and footer disclosure come from the pack', async ({ page }) => {
    await open(page);
    await expect(page.locator('.practice')).toContainText(L.practiceLabel);
    await expect(page.locator('.hero h1')).toHaveText(DATA.site.hero.title);
    await expect(page.locator('.nav')).toContainText(L.boardName);
    await expect(page.locator('.footer')).toContainText('Synthetic data');
    await expect(page.locator('.footer')).toContainText(DATA.build.asOf);
    expect(await page.locator('body').innerText()).not.toMatch(/\bTelco\b|subscriber|ARPU/i);
  });

  test('why now: every market signal cites a published source', async ({ page }) => {
    await open(page, '#/why');
    const n = DATA.site.why.cards.reduce((s, c) => s + c.signals.length, 0);
    await expect(page.locator('.signal')).toHaveCount(n);
    await expect(page.locator('.signal .cite').first()).toHaveAttribute('data-tip', /Checked 2026-10-20/);
  });
});

test.describe('future board', () => {
  test('every board tile and the control-plane rail opens a drawer quickly, and highlights clear on close', async ({ page }) => {
    await open(page, '#/future');
    const timings = [];
    await page.exposeFunction('__t', (ms) => timings.push(ms));
    await page.evaluate(() => document.addEventListener('layer-rendered', (e) => window.__t(e.detail.ms)));
    const tiles = page.locator('#future .board a.tile, #future .board a.rail');
    const count = await tiles.count();
    expect(count).toBe(5 + 4 + 5 + 5 + 1);
    for (let i = 0; i < count; i += 1) {
      await tiles.nth(i).click();
      await expect(page.locator('#drawer-layer.open .dr-head h2')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('#drawer-layer')).not.toHaveClass(/open/);
    }
    await expect(page.locator('#future .hl')).toHaveCount(0);
    expect(Math.max(...timings)).toBeLessThan(150);
  });

  test('motion lens dims tiles that do not serve the motion', async ({ page }) => {
    await open(page, '#/future');
    await page.click('[data-lens="govern"]');
    await expect(page.locator('#future .tile.dim').first()).toBeVisible();
    await page.click('[data-lens="all"]');
    await expect(page.locator('#future .tile.dim')).toHaveCount(0);
  });

  test('all sub-areas render KPIs, agent processes and offer mappings', async ({ page }) => {
    await open(page);
    for (const s of DATA.domains.subAreas) {
      await go(page, `#/subarea/${s.id}`);
      const d = page.locator(`#drawer-content[data-route="#/subarea/${s.id}"]`);
      await expect(d.locator('h2')).toHaveText(s.name);
      await expect(d.locator('.kpi-chip')).toHaveCount(s.kpis.length);
      await expect(d.locator('tr[data-process]')).toHaveCount(s.processIds.length);
      await expect(d.locator('.tag').first()).toHaveText(DATA.industry.subAreaTags[s.commodity]);
      await expect(d.getByRole('heading', { name: 'How we help' })).toBeVisible();
    }
  });

  test('domain, area and outcome drawers', async ({ page }) => {
    await open(page);
    for (const d of DATA.domains.domains) { await go(page, `#/domain/${d.id}`); await expect(page.locator('#drawer-content h2')).toHaveText(d.name); }
    for (const a of DATA.domains.areas) { await go(page, `#/area/${a.id}`); await expect(page.locator('#drawer-content .stat-row')).toBeVisible(); }
    for (const o of DATA.outcomes.outcomes) { await go(page, `#/outcome/${o.id}`); await expect(page.locator('#drawer-content .kpi-tree li')).toHaveCount(o.kpis.length); }
  });
});

test.describe('agents', () => {
  test('every agent opens its drawer and its full view', async ({ page }) => {
    await open(page);
    for (const a of agents) {
      await go(page, `#/agent/${a.id}`);
      await expect(page.locator('#drawer-content h2')).toHaveText(a.name);
      await go(page, `#/agent/${a.id}/full`);
      const fv = page.locator(`#full-content [data-fv="${a.id}"]`);
      await expect(fv.locator('h2')).toHaveText(a.name);
      await expect(fv.locator('.qa')).toHaveCount(5);
      await expect(fv.locator('.trace-step').first()).toBeVisible();
    }
  });

  test('double-click and Shift+Enter open the full view', async ({ page }) => {
    await open(page, '#/family/grid-operations');
    await page.locator('#drawer-content article[data-agent="UA-GO-03"]').dblclick();
    await expect(page.locator('#full-layer.open [data-fv="UA-GO-03"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.locator('#drawer-content article[data-agent="UA-GO-04"]').focus();
    await page.keyboard.press('Shift+Enter');
    await expect(page.locator('#full-layer.open [data-fv="UA-GO-04"]')).toBeVisible();
  });

  test('hand-scripted runs play to the answer and each knockout explains what went wrong', async ({ page }) => {
    await open(page);
    for (const a of agents.filter((x) => x.script)) {
      await go(page, `#/agent/${a.id}/run`);
      const fv = page.locator(`#full-content [data-fv="${a.id}"]`);
      await expect(fv.locator('[data-answer]')).toBeVisible();
      await expect(fv.locator('.trace-step.shown')).toHaveCount(a.script.steps.length);
      await expect(fv.locator('.pill-on')).toHaveText('scripted run');
      const ko = Object.keys(a.script.knockouts)[0];
      await fv.locator(`[data-ko="${ko}"]`).uncheck();
      await expect(fv.locator('[data-wrong]')).toBeVisible();
      await expect(fv.locator('[data-wrong]')).toContainText('What went wrong');
    }
  });

  test('template replays run for the other agents', async ({ page }) => {
    await open(page);
    const a = agents.find((x) => !x.script);
    await go(page, `#/agent/${a.id}/run`);
    await expect(page.locator('#full-content .pill')).toContainText('template replay');
    await expect(page.locator('#full-content [data-answer]')).toBeVisible();
  });

  test('worked example UA-GO-02: numbers match the fixture and the operator executes', async ({ page }) => {
    const fx = DATA.fixtures.feederLockout;
    await open(page, '#/agent/UA-GO-02/run');
    const fv = page.locator('#full-content');
    await expect(fv.locator('[data-answer]')).toContainText(fx.restoredByTie.toLocaleString('en-US'));
    await expect(fv.locator('[data-answer]')).toContainText('operator reviews and executes');
    await expect(fv.locator('.trace')).toContainText(`${fx.lastGasp.toLocaleString('en-US')} AMI last-gasp`);
    await fv.locator('[data-ko="context"]').uncheck();
    await expect(fv.locator('[data-wrong]')).toContainText('Plan would operate a tagged device');
  });
});

test.describe('OT safety rule', () => {
  test('OT-capped agents cannot move past L2; the selector is visibly locked with an explanation', async ({ page }) => {
    await open(page);
    for (const id of capped) {
      await go(page, `#/agent/${id}/full`);
      const fv = page.locator(`#full-content [data-fv="${id}"]`);
      for (const l of ['L3', 'L4']) {
        const b = fv.locator(`[data-level="${l}"]`);
        await expect(b).toHaveAttribute('aria-disabled', 'true');
        await expect(b).toHaveAttribute('data-tip', /OT safety rule/);
        await b.click({ force: true });
      }
      await expect(fv.locator('[data-level].on')).toHaveText('L2');
      await expect(fv.locator('.ot-lock')).toContainText('Locked at L2');
      await expect(fv.locator('.crosses')).toContainText('Operate, or be promoted to operate');
    }
  });

  test('agents without device control follow normal L1–L4 rules', async ({ page }) => {
    const a = agents.find((x) => x.autonomyMax === 'L4' && !capped.includes(x.id));
    await open(page, `#/agent/${a.id}/full`);
    const fv = page.locator(`#full-content [data-fv="${a.id}"]`);
    await fv.locator('[data-level="L4"]').click();
    await expect(fv.locator('[data-level].on')).toHaveText('L4');
    await expect(fv.locator('.ot-lock')).toHaveCount(0);
  });

  test('OT-adjacent processes are shown capped at L2', async ({ page }) => {
    await open(page, '#/subarea/adms-derms');
    await expect(page.locator('#drawer-content .lvl-capped').first()).toBeVisible();
    await expect(page.locator('#drawer-content .ot-note')).toContainText('No agent operates control devices');
  });
});

test.describe('foundation and data products', () => {
  test('every layer drawer and the data platform stack and shelf', async ({ page }) => {
    await open(page);
    for (const l of DATA.layers.layers) {
      await go(page, `#/layer/${l.id}`);
      await expect(page.locator('#drawer-content h2')).toHaveText(l.name);
      await expect(page.locator('#drawer-content .cp-block')).toBeVisible();
    }
    await go(page, '#/layer/data');
    await expect(page.locator('#drawer-content .stack-l')).toHaveCount(9);
    await expect(page.locator('#drawer-content .dp-card')).toHaveCount(DATA.dataProducts.products.length);
    await page.click('[data-replay-flow]');
    await expect(page.locator('#drawer-content .stack-l.lit').first()).toBeVisible();
  });

  test('every data product opens, with masked sample rows and five Q&As', async ({ page }) => {
    await open(page);
    for (const p of DATA.dataProducts.products) {
      await go(page, `#/dp/${p.id}/full`);
      const fv = page.locator(`#full-content [data-dpfull="${p.id}"]`);
      await expect(fv.locator('h2')).toHaveText(p.name);
      expect(await fv.locator('table.sample tbody tr').count()).toBeGreaterThan(0);
      await expect(fv.locator('.qa')).toHaveCount(5);
      if (DATA.industry.classifications.find((c) => c.id === p.classification)?.restricted) await expect(fv.locator('.mask-note')).toBeVisible();
    }
    await go(page, '#/dp/UDP-CUS-01/full');
    const first = await page.locator('table.sample tbody tr').first().innerText();
    await page.click('[data-page="1"]');
    expect(await page.locator('table.sample tbody tr').first().innerText()).not.toBe(first);
    expect(await page.locator('table.sample').innerText()).toMatch(/ACCT-•••/);
  });

  test('control plane drawer states the OT safety rule', async ({ page }) => {
    await open(page, '#/control-plane');
    await expect(page.locator('#drawer-content .ot-rule')).toContainText('No agent operates');
  });
});

test.describe('accelerate', () => {
  test('each motion swaps in place, with agents, KPIs and a playable demo', async ({ page }) => {
    await open(page);
    for (const m of DATA.motions.motions) {
      await go(page, `#/accelerate/${m.id}`);
      const panel = page.locator(`[data-motion-panel="${m.id}"]`);
      await expect(panel).toBeVisible();
      await expect(panel.locator('.agent-card')).toHaveCount(m.agentIds.length);
      await panel.locator('[data-sc="play"]').click();
      await expect(panel.locator('[data-sc-end]')).toBeVisible();
    }
    await expect(page.locator('#plan .roadmap li')).toHaveCount(4);
  });

  test('old motion links still resolve', async ({ page }) => {
    await open(page, '#/accelerate/build');
    await expect(page.locator('[data-motion-panel="engineer"]')).toBeVisible();
  });
});

test.describe('impact', () => {
  test('calculator: formulas from JSON, inputs and cases change the result', async ({ page }) => {
    await open(page, '#/impact');
    const total = async () => Number((await page.locator('[data-calc-total]').innerText()).replace(/[^0-9.]/g, ''));
    const expected = await total();
    expect(expected).toBeGreaterThan(50);
    await page.click('[data-case="conservative"]');
    expect(await total()).toBeLessThan(expected);
    await page.click('[data-case="expected"]');
    await page.fill('[data-input="stormOm"]', '520');
    expect(await total()).toBeGreaterThan(expected);
    await page.click('[data-calc-reset]');
    expect(await total()).toBe(expected);
    await expect(page.locator('.levers tbody tr')).toHaveCount(DATA.calculator.levers.length);
  });

  test('readiness: a hard blocker caps the score and puts the control plane first', async ({ page }) => {
    await open(page, '#/impact/readiness');
    await expect(page.locator('.ready-q')).toHaveCount(12);
    await expect(page.locator('.rec h4')).toContainText('Engineer with AI');
    await page.click('[data-q="q5"][data-v="0"]');
    await expect(page.locator('.blockers')).toContainText('No consent propagation');
    expect(Number(await page.locator('[data-ready-score]').innerText())).toBeLessThanOrEqual(DATA.readiness.blockerCap);
    await expect(page.locator('.rec h4')).toContainText('Govern');
    await expect(page.locator('#plan .roadmap li').first()).toContainText('Govern');
    await page.click('[data-ready-reset]');
    await expect(page.locator('.rec h4')).toContainText('Engineer with AI');
  });
});

test.describe('proof', () => {
  test('all offerings × 4 options, and every architecture box opens', async ({ page }) => {
    test.setTimeout(240_000);
    await open(page, '#/offerings');
    await expect(page.locator('.off-card')).toHaveCount(DATA.offerings.offerings.length);
    for (const o of DATA.offerings.offerings) {
      for (const opt of ['assess', 'pilot', 'scale', 'run']) {
        await go(page, `#/offering/${o.id}/${opt}`);
        await expect(page.locator(`#page-content [data-offering-page="${o.id}"] .seg-btn.on`)).toHaveAttribute('data-opt', opt);
      }
      const boxes = o.architecture.flatMap((r) => r.boxes);
      for (const b of boxes) {
        await go(page, `#/offering/${o.id}/run/box/${b.id}`);
        await expect(page.locator(`#drawer-content[data-route="#/offering/${o.id}/run/box/${b.id}"] h2`)).toBeVisible();
      }
    }
  });

  test('offering filters and checklist status', async ({ page }) => {
    await open(page, '#/offerings');
    await page.click('[data-filter="motion"][data-value="govern"]');
    await expect(page.locator('.off-card')).toHaveCount(DATA.offerings.offerings.filter((o) => o.motion === 'govern').length);
    await go(page, '#/offering/U-O1/pilot');
    await page.locator('[data-status="Gap"]').first().click();
    await expect(page.locator('.sub-h small').nth(1)).toContainText('1 gap');
  });

  test('all scenarios play to completion with before/after KPIs', async ({ page }) => {
    await open(page);
    for (const s of DATA.scenarios.scenarios) {
      await go(page, `#/scenario/${s.id}`);
      await expect(page.locator('#page-content h1')).toHaveText(s.title);
      await page.locator('#page-content [data-sc="play"]').click();
      await expect(page.locator('#page-content [data-sc-end]')).toBeVisible();
      await expect(page.locator('#page-content .tl-step.shown')).toHaveCount(s.steps.length);
      await expect(page.locator('#page-content .kpi-ba tbody tr')).toHaveCount(s.kpis.length);
    }
  });

  test('scenario steps with arrow keys', async ({ page }) => {
    await open(page, '#/scenario/U-S2');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#page-content .tl-step.shown')).toHaveCount(2);
  });

  test('case studies are placeholders and hidden in Client mode', async ({ page }) => {
    await open(page, '#/cases');
    await expect(page.locator('.case-card')).toHaveCount(DATA.proof.cases.length);
    await page.evaluate(() => window.__playbook.state.mode);
    await page.click('#menu-btn');
    await page.click('[data-mode="client"]');
    await expect(page.locator('.case-card')).toHaveCount(0);
    await expect(page.locator('.empty-note')).toBeVisible();
  });
});

test.describe('presenter', () => {
  test('client mode hides the offer team and objections', async ({ page }) => {
    await open(page, '#/offering/U-O1');
    await expect(page.locator('.presenter-only')).toBeVisible();
    await page.click('#menu-btn');
    await page.click('[data-mode="client"]');
    await expect(page.locator('.presenter-only')).toHaveCount(0);
  });

  test('operator name relabels the session and is never saved', async ({ page }) => {
    await open(page);
    await page.click('#menu-btn');
    await page.fill('[data-opname]', 'Northwind Power');
    await expect(page.locator('.hero-meta')).toContainText('Northwind Power');
    expect(await page.evaluate(() => sessionStorage.getItem('uiop.session.v1'))).not.toContain('Northwind');
  });

  test('audience preselects a motion', async ({ page }) => {
    await open(page);
    await page.click('#menu-btn');
    await page.click('[data-audience="cio"]');
    await expect(page.locator('.motion-btn.on')).toHaveText('Engineer with AI');
  });

  test('every run sheet walks end to end', async ({ page }) => {
    await open(page);
    for (const rs of DATA.presenter.runSheets) {
      await page.click('#menu-btn');
      await page.click(`[data-runsheet="${rs.id}"]`);
      for (let i = 0; i < rs.steps.length; i += 1) {
        await expect(page.locator('#runbar .rb-step')).toContainText(`${i + 1}/${rs.steps.length}`);
        if (i < rs.steps.length - 1) await page.click('#runbar [data-rb="1"]');
      }
      await page.click('#runbar [data-rb="stop"]');
      await expect(page.locator('#runbar')).toBeHidden();
    }
  });

  test('executive briefing reflects the path walked', async ({ page }) => {
    await open(page, '#/agent/UA-GO-02/full');
    await go(page, '#/offering/U-O1/pilot');
    await go(page, '#/briefing');
    await expect(page.locator('[data-briefing]')).toContainText('Fault Location & Restoration Advisor');
    await expect(page.locator('[data-briefing]')).toContainText('Grid Reliability & Outage Intelligence — Pilot');
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('[data-brief-html]')]);
    expect(download.suggestedFilename()).toBe('executive-briefing.html');
  });

  test('reset restores the initial state', async ({ page }) => {
    await open(page, '#/impact');
    await page.fill('[data-input="stormOm"]', '999');
    await page.click('#menu-btn');
    await page.click('[data-act="reset"]');
    await expect(page.locator('[data-input="stormOm"]')).toHaveValue('260');
  });
});

test.describe('quality bar', () => {
  test('deep links survive a reload', async ({ page }) => {
    for (const h of ['#/agent/UA-GO-02/run', '#/offering/U-O11/scale', '#/subarea/wildfire', '#/dp/UDP-GRD-02/full', '#/scenario/U-S8']) {
      await open(page, h);
      await page.reload();
      await expect(page.locator('.layer.open')).toHaveCount(1);
    }
  });

  test('Escape closes the top layer and restores the one beneath', async ({ page }) => {
    await open(page, '#/family/customer-commercial');
    await go(page, '#/agent/UA-CC-01/full');
    await expect(page.locator('#full-layer.open')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#full-layer')).not.toHaveClass(/open/);
    await expect(page.locator('#drawer-layer.open')).toBeVisible();
  });

  test('numbers reconcile across views (CKT-12-04 fixture)', async ({ page }) => {
    const fx = DATA.fixtures.feederLockout;
    const out = fx.customersOut.toLocaleString('en-US');
    await open(page, '#/agent/UA-CC-01/run');
    await expect(page.locator('#full-content .trace')).toContainText(out);
    await go(page, '#/agent/UA-GO-02/full');
    await expect(page.locator('#full-content .qa').first()).toContainText(fx.isolateA);
    await go(page, '#/dp/UDP-GRD-04/full');
    await expect(page.locator('table.sample tbody tr').first()).toContainText(fx.circuit);
    await expect(page.locator('table.sample tbody tr').first()).toContainText(out);
  });
});

plainTest('static site build serves the same app over HTTP', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:4173/#/agent/UA-GO-02/full');
  await expect(page.locator(`#full-content [data-fv="UA-GO-02"] h2`)).toBeVisible();
  expect(errors).toEqual([]);
  expect(INDUSTRY).toBe(DATA.build.industry);
});
