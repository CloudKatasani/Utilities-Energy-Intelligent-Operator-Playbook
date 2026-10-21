# Utilities & Energy Intelligent Operator Playbook — Demo Edition

A client-neutral, fully offline demo that a utilities pursuit team can run for a CEO, COO / SVP T&D Operations, Chief Customer Officer, CFO, CIO / CDO, Chief Safety Officer, Chief Regulatory Officer or CISO / CRO. It is built from [`docs/utilities/Utilities_Energy_Playbook_Demo_Edition_Spec_v0.1.md`](docs/utilities/Utilities_Energy_Playbook_Demo_Edition_Spec_v0.1.md) and its companion seed, [`docs/utilities/utilities-content-seed.json`](docs/utilities/utilities-content-seed.json).

- **One engine, industry packs.** The engine is industry-neutral; everything about utilities lives in `content/industries/utilities/` (labels, classifications, sub-area tags, calculator formulas, sample-table generators, deny-list). See [Industry packs](#industry-packs).
- **Three motions, governed across every layer:** Engineer with AI · Operate with AI · Decide and Act with AI, with **Govern, secure and assure with AI** as the control plane.
- **The OT safety rule is built in.** No agent operates, or can be promoted to operate, grid, plant or gas control devices. UA-GO-02, UA-GO-05, UA-GM-01 and UA-GM-05, and the Volt/VAR, DER-dispatch, storage-dispatch and FLISR processes, are capped at **L2 (Propose)**. The L1–L4 selector visibly locks at L2 with an explanation, the validator fails on any content that breaks the rule, and the tests check both.
- **Five sections, no tab bars:** 01 Why now · 02 Future Utility · 03 Accelerate · 04 Impact · 05 Proof, plus a presenter menu. Three interaction patterns only: drawers, the agent full view (double-click or `Shift+Enter`) and segmented controls.
- **Fully offline:** one HTML file of about 0.6 MB. No logins, no network calls (a Content-Security-Policy blocks them), no live LLM. Agent runs are scripted and replayable.
- **Synthetic reference Utility:** 3.2M electric and 1.1M gas customers, 6 regions, 690 substations, 2,450 circuits, 9.4 GW of generation, 13.8 GW peak, SAIDI 128 min excl. MED (SAIFI 1.05, CAIDI 121.9 = SAIDI ÷ SAIFI), as of 2026-09-30, from a fixed seed. The UI says "your Utility"; the presenter can type a client name for the session (never saved). Hover any number to see its source.

## Quick start

```bash
npm install
npm run build                         # generate synthetic data, then build every pack
open dist/utilities-playbook.html     # single file: email / offline / file://
npm run serve                         # static site at http://localhost:4173 (dist/utilities/site/)
```

| Command | What it does |
|---|---|
| `npm run generate` | Seeded synthetic data → `content/industries/<id>/generated/synthetic.json`, then the pack's reconciliation checks (fails on any drift) |
| `npm run build` | `generate`, then bundle → `dist/<id>-playbook.html` and `dist/<id>/site/` |
| `npm run lint` | Design-token lint, neutrality lint and WCAG contrast check |
| `npm run validate` | Content validation: counts, references, the OT safety rule, sources and validation flags, calculator formulas, routes, tokens, placeholders |
| `npm run test:unit` | Node unit tests: expression parser, tokens, bundler, reconciliation, validator (incl. OT-cap violations) |
| `npm run check` | lint + validate + unit tests + build + 8 MB size budget |
| `npm test` | Playwright smoke suite (38 tests) on the built file with the network blocked, plus the static site over HTTP |

Every command takes `--industry=<id>` to work on one pack; without it they run every pack. CI (`.github/workflows/ci.yml`) runs a matrix over the packs on every push and writes the size line to the job summary.

The build has no npm dependencies: `scripts/lib/bundle.mjs` is a small ES-module bundler for this repository's own sources. Playwright is the only dev dependency.

## What is in it (spec cross-reference)

| Spec | Feature | Where |
|---|---|---|
| §0 | OT safety rule: L2 cap, locked selector with tooltip, runtime refuses promotion, validator and tests | `industry.json → otSafety`, `src/js/sections/agents.js`, `scripts/lib/validate.mjs` |
| §1.3 C1–C10 | Industry-neutral engine (see the table in [`docs/BUILD-NOTES.md`](docs/BUILD-NOTES.md)) | `src/js/data/core.js`, `src/js/core/expr.js`, `industry.json` |
| §2 | Industry packs, `--industry` build flag, CI matrix | `content/industries/`, `scripts/` |
| §3 | Theme (locked tokens), header "Insights & Data \| Utilities", grid hero art, Why now with sourced signals | `src/styles/app.css`, `src/js/sections/art.js`, `site.json`, `sources.json` |
| §4 | Future Utility board: 5 outcomes with KPI trees, 4 domains, 5 families, foundation, control-plane rail, motion lens | `src/js/sections/future.js`, `outcomes.json` |
| §5 | Domain explorer: 19 areas, 53 sub-areas, 160 agent processes, Electric / Gas / Electric + gas chips | `domains.json` (imported from the seed by `scripts/tools/import-seed.mjs`) |
| §6 | Accelerate: the motions, Decide & Act in two stages (consume, act), demos, acceleration plan | `src/js/sections/accelerate.js`, `motions.json` |
| §7 | 36 agents, 9 hand-scripted runs with knockouts, template replay for the rest, 5 Q&As each | `agents.json`, `src/js/sections/agents.js` |
| §8 | Layer drawers with utility specifics, nine-layer stack, 31-product shelf, sample tables regenerated in the browser | `layers.json`, `dataProducts.json`, `src/js/sections/foundation.js` |
| §9 | 13 offerings, Assess / Pilot / Scale / Run, clickable architecture, what-it-takes checklist | `offerings.json`, `src/js/sections/proof.js` |
| §10 | Calculator (formulas in JSON, evaluated by a safe parser) and readiness quick check (12 questions, 8 pillars, 4 hard blockers, Utility cohort) | `calculator.json`, `readiness.json`, `src/js/sections/impact.js` |
| §11 | 9 scenarios, 6 placeholder case studies hidden in Client mode | `scenarios.json`, `proof.json` |
| §12 | 8 audiences, 15/30/60-minute run sheets, Client/Presenter mode, notes and edits as JSON, briefing export | `presenter.json`, `src/js/sections/presenter.js` |
| §13 | Synthetic reference Utility with planted fixtures and reconciliation checks | `src/js/data/industries/utilities.js`, `scenario-fixtures.json` |
| §14 | Utilities deny-list, classification refusals (PII, CEUD, CEII, Market-Sensitive), source and validation flags, footer disclosure | `neutrality-denylist.json`, `scripts/lint-neutrality.mjs` |

## How the content works

- Every number is written once. Copy refers to fixtures and generated data through tokens such as `{{fx.feederLockout.restoredByTie}}` or `{{syn.reliability.saifi|d2}}`, resolved at build time; `npm run validate` fails on any token that does not resolve. The feeder 12-04 lockout (4,860 customers out, 3,410 restored by the tie, 1,212 AMI last-gasp messages) therefore shows the same values in the agent run, the outage communications, the scenario and the feeder sample table.
- Row-level samples (50,000 customers, AMI intervals for 500 meters × 30 days, 20,000 work orders, 920 BI reports and more) are regenerated in the browser from the seed by the same module the generator uses, so they never need embedding.
- Calculator formulas are named expressions in `calculator.json` (for example `stormOm * stormReduction`). The parser supports arithmetic and `min`, `max`, `round` and `clamp` only, and rejects unknown identifiers.
- Edit and Notes modes save JSON in the presenter's own browser, never to the DOM. Download it from the presenter menu and merge it into `content/`.

## Industry packs

A pack is a folder `content/industries/<id>/` with an `industry.json` (labels, sub-area tags, classifications with refusal text, hero art, OT safety settings, expected counts) and the content files, plus a synthetic-data module `src/js/data/industries/<id>.js` that exports `generate`, `reconcile` and the row `generators` named in `dataProducts.json`. Register the module in `src/js/data/index.js` and add the id to the CI matrix.

## Keyboard

`P` presentation mode · `Esc` closes the top layer · `←`/`→` or a clicker steps scenarios and run sheets · `Space` plays/pauses a scenario or run · `Shift+Enter` opens the full view of the focused agent or data product.

See [`docs/BUILD-NOTES.md`](docs/BUILD-NOTES.md) for decisions, deviations from the spec and what still needs owner or SME sign-off.
