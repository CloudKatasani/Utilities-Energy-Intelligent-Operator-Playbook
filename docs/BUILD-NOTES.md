# Build notes: Utilities & Energy Demo Edition v0.1.0

## Status against the build plan (spec §15)

| Phase | Status | Evidence |
|---|---|---|
| U0 — Generalise the engine | Done for the new engine; the Telco pack is not ported (see deviation 1) | Industry-pack layout, `--industry` flag, CI matrix, C1–C10 addressed below |
| U1 — Pack skeleton | Done | `industry.json`, site copy and Why now (§3), board (§4), domains from the seed (§5), grid hero art; board and explorer fully interactive; neutrality lint green |
| U2 — Agents and data | Done | 36 agents, OT cap, 9 scripted runs, 5 Q&As each; 31 data products; generator and fixtures (§13) with reconciliation checks; catalogue extended to 160 processes |
| U3 — Accelerate, offerings, impact | Done | Motions and demos (§6), 13 offerings × 4 options, every architecture box opens; calculator formulas come from JSON only |
| U4 — Proof and presenter | Done | 9 scenarios, 6 case placeholders, 8 audiences, 15/30/60 run sheets, briefing export (print/PDF or HTML) |
| U5 — Hardening and SME review | Done except the human steps | 38 Playwright smoke tests and 9 unit tests green; 0.57 MB; WCAG contrast check; no horizontal scroll at 390 px. **SME review (grid operations, customer, regulatory, safety) and pursuit-team dry runs still need people.** |

### Definition of done

- [x] Same five sections and no tabs (a test asserts there are no tab roles).
- [x] Every tile, agent, layer and architecture box opens (the tests open every one).
- [x] OT safety rule enforced and tested: content validator, unit tests that try to break it, UI test that the selector cannot move past L2.
- [x] No client names or real identifiers: neutrality lint over the pack, the engine sources and the built file.
- [x] Numbers reconcile across views: fixtures + tokens + reconciliation checks in the generator, and a cross-view test.
- [x] Single offline file under 8 MB (0.57 MB).
- [ ] Telco build unchanged — not applicable in this repository (deviation 1).

## Engine changes for spec §1.3 (C1–C10)

| # | Spec change | As built |
|---|---|---|
| C1 | Split synthetic data into a core and one profile per industry | `src/js/data/core.js` (rng, apportion, months, masking) + `src/js/data/industries/utilities.js` (profile, aggregates, row generators, reconciliation) |
| C2 | Calculator formulas as named expressions with a safe parser | `calculator.json` levers and derived values; `src/js/core/expr.js`; validate fails on unknown identifiers |
| C3 | Sample tables declared in data products | `dataProducts.json → rows.generator`; rendered generically, paged, regenerated in the browser |
| C4 | Classification badges and refusals from `industry.json` | PII, PII-sensitive, CEUD, CEII, Market-Sensitive, Confidential, Internal, each with refusal text |
| C5 | Scripted traces in content | All agent runs and scenarios are in JSON; no trace is hard-coded |
| C6 | Sub-area tags, KPI map, hero art per industry | `subAreaTags` (Electric / Gas / Electric + gas), KPIs from `outcomes.json`, `heroArt: "grid"` |
| C7 | All labels from `industry.json → labels` | "your Utility", "Future Utility", "Insights & Data \| Utilities", "Utility cohort", "Ask the Utility" |
| C8 | `referenceDefaults` | `readiness.json → referenceDefaults` |
| C9 | Per-industry deny-list | `content/industries/utilities/neutrality-denylist.json` (113 terms, coordinate and docket patterns) |
| C10 | Generated size line | `scripts/check-size.mjs` prints it; CI writes it to the job summary |

## Deviations and decisions to review

1. **The Telco pack is not in this repository.** The spec builds on `CloudKatasani/Telco-Intelligent-Operator-Playbook` v2.4.0 and recommends one repository with both packs (open question 6). The Telco repository was used as the reference for behaviour, but its code and content were not copied here: this repository holds a newly written, industry-neutral engine with the Utilities pack. So the Telco golden-file test (byte-identical Telco output) does not apply yet. To bring the packs together, either port the Telco content into `content/industries/telco/` with a `src/js/data/industries/telco.js` module and add `telco` to the CI matrix, or move this engine into the Telco repository.
2. **No esbuild, no minification.** A small bundler (`scripts/lib/bundle.mjs`) supports the module syntax the sources use and rejects anything else and import cycles. The output is not minified; the file is still 0.57 MB.
3. **Typeface.** The token stack is `"Ubuntu", Arial, Helvetica, sans-serif`. The Ubuntu font files were not available in the build environment, so the build falls back to Arial/Helvetica. Drop `ubuntu-400.woff2`, `ubuntu-500.woff2` and `ubuntu-700.woff2` into `content/brand/fonts/` and the build embeds them as data URIs (the Ubuntu Font Licence permits this).
4. **No lockfile.** The only dev dependency is Playwright; CI uses `npm install`. Add a `package-lock.json` when convenient.
5. **Process catalogue extended to 160.** Spec §5 asks for a third process per sub-area, reviewed by utility SMEs. The 53 additions are drafts in `scripts/tools/extra-processes.json`, marked `phase: "U2"`, `source: "BENCH"`, `validated: false`. Nine processes are marked `otCapped` and held at L2 (the four in the spec plus emissions-aware dispatch advice, load transfer advice, switching plan checking, gas supply balancing advice and the plant set-point process UP-001).
6. **Template runs and Q&As.** The 27 agents without a hand-scripted run replay a template built from their catalogue entry, labelled "template replay". Each agent has two bespoke Q&As in `agents.json`; three standard ones (what it will not do, who approves, what data it uses) are generated from the catalogue, giving five. Data-product Q&As are generated from each product's owner, freshness, classification, KPIs, consumers and access rule.
7. **Cross-industry proof.** The 30–40% intent-to-insight and 50% fewer L1/L2 tickets proof points come from Capgemini work in another industry. They are shown as "Capgemini proof from another industry — revalidate for Utilities", `validated: false`, and are not used as Utility case studies.
8. **Client mode** hides offer teams, objections, notes, edit tools, offer mappings with `validated: false` (in sub-area drawers) and case studies not approved for external use (all six today, so the case library shows a short "available on request" note).
9. **As-of shift is a relabel.** The presenter setting moves ISO dates by whole months; numbers stay the same.
10. **Contrast exception.** The locked pair `--muted` on `--soft` measures 4.50:1 (just under AA when unrounded). It is kept because the tokens are locked, and `scripts/check-contrast.mjs` reports it.

## Content to confirm with offer owners and SMEs

- **Why now:** all figures are marked `published` and link to their reporting; re-confirm against the primary PDFs before external use (F11).
- **Impact ranges:** every process impact and calculator lever range is `BENCH`, `validated: false`.
- **Offerings U-O4–U-O13:** `maturity: emerging`, `validated: false` until owners confirm (open question 5).
- **Case studies:** six anonymised placeholders until approved utility proof is supplied (open question 4).
- **Terminology and OT framing:** SME sign-off on grid operations, customer, regulatory and safety language, and on whether any forecasting-publication agent may stay at L4 (open question 3; as built, only agents with no device control exceed L2).

## Open questions from the spec (§16), as built

1. Utility types: electric + gas combination; no water or wires-only variant yet.
2. Region framing: North American terms (NERC, ISO/RTO, IEEE 1366, PUC) as generic narrative terms only.
3. OT cap: L2 for every agent or process whose recommendation would change a device; L4 only for agents with no device control (e.g. UA-GM-03 forecasting).
4. Proof: placeholders, hidden in Client mode.
5. Offer list: 13 offerings as in §9, U-O4–U-O13 marked emerging.
6. Repository: see deviation 1.
