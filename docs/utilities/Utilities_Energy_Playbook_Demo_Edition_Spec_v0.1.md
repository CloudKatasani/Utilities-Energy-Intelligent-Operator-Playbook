# Utilities & Energy Intelligent Operator Playbook — Demo Edition
## Specification v0.1 (DRAFT)

| | |
|---|---|
| **Built on** | `CloudKatasani/Telco-Intelligent-Operator-Playbook` v2.4.0 (commit `c4fa403`), reviewed 2026-10-20 |
| **Goal** | A production-grade, offline, client-neutral demo for **electric, gas and combination utilities** (vertically integrated or wires-only), on fully synthetic data, reusing the Telco engine |
| **Audience** | Utilities pursuit teams, offer owners, the build agent (Claude Code) |
| **Companion file** | `docs/utilities/utilities-content-seed.json` — 4 domains, 19 operating areas, 53 sub-areas, 107 agent processes, 5 agent families, 36 flagship agents, 31 data products |
| **Status** | Draft for offer-owner review. Every impact range in the seed is tagged `[validate]` / `source: BENCH` until confirmed |

---

## 0. How to use this spec

Build it in the order in §15, one feature at a time. It assumes the Telco repo's engine, motion model and quality gates, and lists only what changes for Utilities. Anything not mentioned here behaves exactly as in the Telco Demo Edition (`docs/Telco_Playbook_Demo_Edition_Specs v2.md` and `docs/BUILD-NOTES.md`).

**Design rules (unchanged from Telco):** client-neutral; simple (five sections, drawers, one agent full view, segmented controls, no tab bars); every click goes somewhere; every number traceable; agents act and humans decide; fully offline.

**One new rule for Utilities — OT safety:**
> No agent operates, or can be promoted to operate, grid, plant or gas control devices: switching, breakers, reclosers, set-points, valves or de-energisation. Any agent or process whose recommendation would change a grid, plant, storage or gas device is capped at **L2 (Propose)** (in this draft: UA-GO-02, UA-GO-05, UA-GM-01, UA-GM-05, plus the Volt/VAR, DER-dispatch, storage-dispatch and FLISR processes). Agents that only inform, plan, schedule crews or write to IT systems follow the normal L1–L4 rules. Every switching plan, PSPS decision and hazardous-leak response is made and executed by qualified people. The L1–L4 selector visibly locks at L2 for these agents, with a tooltip explaining why.

---

## 1. Review of the Telco repository

### 1.1 What is there

| Area | State |
|---|---|
| Engine | Vanilla JS (esbuild), hash router, drawers, agent full view, scripted player, seeded synthetic data (`src/js/data/synthetic.js`), one stylesheet with locked tokens |
| Content | All in `content/*.json`: site copy, 4 domains / 15 areas / 60 sub-areas, 182 processes, 35 agents, 21 data products, 5 layers, 12 offerings, 9 scenarios, calculator, readiness, presenter audiences and run sheets, sources, neutrality deny-list |
| Motion model | **Engineer with AI · Operate with AI · Decide and Act with AI** (consume trusted answers, then act), with **Govern, secure and assure with AI** as a control plane across every layer (v2.3) |
| Brand | Ubuntu typeface embedded; "Insights & Data \| Telco" header; Capgemini logo top right; generic "your Telco" operator |
| Quality gates | Token lint, neutrality lint, WCAG contrast check, content validator, 8 MB budget, Playwright smoke suite, CI |

**Verified in this review:** `npm run check` passes (lint, validate, build) and **all 58 Playwright tests pass**. The single-file build is **0.97 MB**.

### 1.2 Strengths to carry over unchanged
- Content-driven design: most of a new industry is new JSON, not new code.
- Fixture-token model (`{{fx.…}}`, `{{syn.…}}`): a number is written once and matches everywhere.
- Strong quality gates, including network-blocked tests and a deterministic seed.
- The control-plane rail and the OT-appropriate autonomy model (L1–L4 with promotion rules).

### 1.3 Telco coupling to remove before adding Utilities

| # | Where | What is Telco-specific | Change |
|---|---|---|---|
| C1 | `src/js/data/synthetic.js` | `PROFILE` (mobile subs, ARPU segments, cell sites) and generators for subscribers, sites, alarms, orders | Split into `src/js/data/core.js` (rng, apportion, months) plus one profile module per industry: `industries/telco.js`, `industries/utilities.js` |
| C2 | `src/js/sections/impact.js` | Revenue formula hard-coded (`mobileSubs * arpu + broadbandHomes * 68.9`) and lever formulas | Move every formula into `calculator.json` as a named expression evaluated by a small safe expression parser; fail on unknown identifiers |
| C3 | `src/js/sections/foundation.js` | Sample tables for `subscribers`, `sites` and `alarms`, with MSISDN/IMEI columns | Sample tables declared in `dataProducts.json` (`rows.generator`, `rows.columns`) and rendered generically |
| C4 | `qa.js`, `foundation.js` | `classification === 'CPNI'` badge and refusal text | Classification badges from `industry.json → classifications[]` (Utilities: **PII, CEUD, CEII, Market-Sensitive**) with refusal text per class |
| C5 | `src/js/sections/scenarios.js` | `arpuTrace()` hard-codes the CFO ARPU trace | Trace steps live in `scenarios.json` like the other scripted runs |
| C6 | `future.js` | Network-type chips (`wireless`/`wireline`), the KPI map, hero line-art (towers, satellite) | `industry.json → subAreaTags` (Utilities: **Electric / Gas / Both**); KPI map from outcomes; hero art chosen per industry |
| C7 | Copy in code | "your Telco", "Future Telco", "Insights & Data \| Telco", "Telecom cohort", "Ask the Telco agent" | All labels from `industry.json → labels` (`org`, `orgPossessive`, `boardName`, `practiceLabel`, `cohortLabel`) |
| C8 | `readiness.json` | Key `altairDefaults` (leftover of the removed fictional operator) | Rename to `referenceDefaults` |
| C9 | `neutrality-denylist.json` | Telco brands only | Per-industry deny-list (§14) |
| C10 | `README.md` | States a 0.7 MB file; the build is now 0.97 MB | Update; generate the size line in CI |

---

## 2. Approach: one engine, two industry packs

### 2.1 Repository layout

```
content/
  shared/                 sources types, autonomy levels, motions, presenter primitives, brand
  industries/
    telco/                all current content/*.json moved here (unchanged)
    utilities/            new pack (this spec)
      industry.json       labels, tags, classifications, imagery, header text
      site.json  domains.json  families.json  agents.json  dataProducts.json
      layers.json  offerings.json  scenarios.json  scenario-fixtures.json
      calculator.json  readiness.json  outcomes.json  motions.json
      presenter.json  proof.json  sources.json  neutrality-denylist.json
src/js/data/industries/{telco,utilities}.js
```

### 2.2 Build and CI

| Command | Output |
|---|---|
| `npm run build -- --industry=utilities` | `dist/utilities-playbook.html` + `dist/utilities/site/` |
| `npm run build` (no flag) | builds every pack |
| `npm test -- --industry=utilities` | same smoke suite, parameterised by pack |

CI runs a matrix over `[telco, utilities]`. **Telco output must stay byte-identical** after the refactor (C1–C10), and a golden-file test enforces it.

### 2.3 `industry.json` (Utilities)

```jsonc
{
  "id": "utilities",
  "labels": { "org": "Utility", "orgLower": "utility", "yourOrg": "your Utility",
              "boardName": "Future Utility", "practiceLabel": "Insights & Data | Utilities",
              "cohortLabel": "Utility cohort", "askAgent": "Ask the Utility" },
  "subAreaTags": { "electric": "Electric", "gas": "Gas", "both": "Electric + gas" },
  "classifications": [
    { "id": "PII", "label": "PII", "refusal": "Customer-level records need a cleared role and a declared purpose." },
    { "id": "CEUD", "label": "Customer energy usage data", "refusal": "Interval usage is shown only in aggregate unless the customer consented or the role is cleared." },
    { "id": "CEII", "label": "Critical infrastructure info", "refusal": "Grid and plant topology, capacity and SCADA detail are restricted to cleared operations and engineering roles." },
    { "id": "Market-Sensitive", "label": "Market-sensitive", "refusal": "Bids and positions are restricted to the trading desk and its risk officers." }
  ],
  "heroArt": "grid",          // transmission towers, substation, wind turbines, solar array, gas line, horizon
  "otSafety": { "capLevel": "L2", "rule": "any agent or process whose action would change a grid, plant, storage or gas device", "agentsCapped": ["UA-GO-02","UA-GO-05","UA-GM-01","UA-GM-05"] }
}
```

---

## 3. Experience, copy and theme

### 3.1 Structure — unchanged
Five sections, one presenter menu: **01 Why now · 02 Future Utility · 03 Accelerate · 04 Impact · 05 Proof**. Same three interaction patterns. No new tabs.

### 3.2 Theme — identical tokens, new imagery
- Same `:root` tokens, Ubuntu typeface, radii, shadows, light/dark rhythm. The token lint must pass unchanged.
- Header: two-bar practice mark + **"Insights & Data | Utilities"** on the left, Capgemini logo on the right.
- Hero art (inline SVG, same line-art style): lattice transmission towers with conductor catenaries, a substation outline, wind turbines, a solar array and a buried gas line on the horizon, with a dashed "power-flow" network overlay.
- Family colours reuse existing tokens: Grid & asset operations `--network`; Generation & energy markets `--oss`; Customer & commercial `--customer`; Data & intelligence `--sky`; Enterprise, safety & regulatory `--bss`.

### 3.3 Hero copy (draft)
- **Kicker:** UTILITIES & ENERGY INTELLIGENT OPERATOR PLAYBOOK
- **Title:** From regulated utility to intelligent energy orchestrator
- **Lede:** How a utility meets record demand, keeps the lights on and stays affordable: engineer with AI, operate with AI, decide and act with AI — governed, secured and assured by one control plane across every layer, with people in command of the grid.
- **Meta line:** Demo operator: **your Utility** — a generic, synthetic reference profile · 3.2M electric customers, 1.1M gas customers, 9.4 GW generation, 690 substations (synthetic).

### 3.4 01 Why now — market signals (sourced)

**Headline:** *The grid is becoming the platform for growth, electrification and resilience — and it has to change faster than it ever has.*

Three illustrated rows: **The world it powers** (data centres, electrification and EVs bring demand growth back) · **The pressure on the system** (reliability, wildfire and storms, affordability and regulation) · **Inside the utility** (record capital plans, ageing assets, a retiring workforce, data spread across CIS, MDMS, OMS, GIS, EAM and OT).

| Card | Statistic | Source (date) |
|---|---|---|
| **01 The Demand** | **+224 GW** summer and **+246 GW** winter peak-demand growth forecast over 10 years in North America | NERC 2025 Long-Term Reliability Assessment (Jan 2026) |
| | Global electricity demand grew about **3%** in 2025, with data centres **+17%** and EVs **+38%** | IEA Global Energy Review (Apr 2026) |
| | AI data-centre power demand: **4 GW (2024) → 123 GW (2035)**; **72%** of executives call grid capacity constraints very or extremely challenging | Deloitte (Jul 2025) |
| **02 The Response** | US investor-owned utilities plan about **$208 bn** of capex in 2025 and **more than $1.1 tn** over five years | EEI (Oct 2025) |
| | **More than 2,060 GW** of generation and storage waiting in interconnection queues at end-2025 | Berkeley Lab, *Queued Up* 2026 edition (Jul 2026) |
| **03 The Execution Gap** | US customers averaged about **11 hours** without power in 2024, nearly double the prior-decade average; about 9 hours from major events vs about 4 hours a year in 2014–2023 | US EIA (Dec 2025) |
| | Agentic AI is integrated in **27%** of energy firms; system integration, **data quality** and **data access** are the top technical challenges, and **54%** of firms with data-access problems say they materially hurt timelines, scope or performance | 451 Research / S&P Global (Mar 2026) |

**Closing panel:** *Utilities modernised for reliability in a world of steady demand. Now they are entering a world of growth, electrification and autonomous operations — where trusted data decides how fast they can move.*

All figures were checked against the cited publications or their reporting on 2026-10-20 and are marked `published`. Re-confirm against the primary PDFs before external use (F11).

---

## 4. 02 Future Utility board

| Band | Content |
|---|---|
| **Business outcomes (5)** | Reliability & resilience · Affordability & cost to serve · Safety & compliance · Customer trust & experience · Growth & energy transition (large load, DER, electrification) |
| **Value-stream domains (4)** | 01 Generation & Energy Supply · 02 Grid & Asset Operations · 03 Customer & Commercial · 04 Enterprise & Enablement |
| **Agent families (5)** | Customer & commercial · Grid & asset operations · Generation & energy markets · Data & intelligence · Enterprise, safety & regulatory |
| **Foundation (4 + security)** | Integration & OT/IT fabric · Data platform (incl. semantic & network model) · AI/ML foundation · Trust & governance · Security, privacy & critical-infrastructure protection |
| **Control-plane rail** | Govern, secure and assure with AI — as in Telco, plus the OT safety rule |

**Outcome KPI trees (examples):**

| Outcome | KPIs |
|---|---|
| Reliability & resilience | SAIDI, SAIFI, CAIDI (IEEE 1366, with and without major event days), customer minutes interrupted, ETR accuracy, restoration time in major events |
| Affordability & cost to serve | O&M per customer, cost per contact, bad debt % of revenue, storm cost per customer, capex execution % |
| Safety & compliance | SIF and SIF-precursor events, recordable incident rate, ignitions, hazardous-leak response time, potential non-compliance findings |
| Customer trust & experience | Self-service containment, first-contact resolution, high-bill complaints, regulator escalations, estimated bills % |
| Growth & transition | MW of large load connected, time to feasibility answer, interconnection queue time, DER hosting capacity, program MW enrolled |

---

## 5. Domain explorer (F2) — utility operating model

Seed: `utilities-content-seed.json → areas, subAreas, processCatalog`. Sub-area chips show **Electric / Gas / Electric + gas** instead of wireless/wireline.

| Domain | Operating areas (sub-areas) |
|---|---|
| **01 Generation & Energy Supply** | Fleet operations & performance (3) · Maintenance & reliability (3) · Energy trading, fuel & market operations (3) · Portfolio & energy transition (2) |
| **02 Grid & Asset Operations** | Grid planning & interconnection (3) · Grid & control-centre operations (3) · Asset management & inspection (3) · Vegetation, wildfire & storm resilience (3) · Field operations & work management (3) · Gas network operations & integrity (3) |
| **03 Customer & Commercial** | Metering, billing & revenue (3) · Customer service & experience (3) · Energy programs, DER & electrification (2) · New connections & large load (2) |
| **04 Enterprise & Enablement** | Health, safety & environment (3) · Regulatory, rate case & compliance (3) · Supply chain & procurement (2) · Finance, capital planning & workforce (3) · IT/OT, data platforms & cybersecurity (3) |

The totals are 19 areas, 53 sub-areas and 107 agent processes (two per sub-area, three on outage management). The Telco pack has about 180. **Phase U2 extends the catalogue to about 160** with a third process for each sub-area, reviewed by utility SMEs.

---

## 6. 03 Accelerate with AI — utility content

| | **Engineer with AI** | **Operate with AI** | **Decide and Act with AI** | **Govern, secure and assure** (control plane) |
|---|---|---|---|---|
| **Promise** | AI builds the utility's data products, network model quality, semantic layer and agents | AI runs, heals and optimises grid, plant, gas, data and agent operations, with operators in command | Trusted answers first, then decisions and actions for customers, crews, planners and executives | Every agent, dataset and action is safe, compliant, evidenced and reversible |
| **What AI accelerates** | Intent → data-product backlog from BI and KPI lineage; CIS/MDMS/OMS/GIS/EAM/historian mapping to a CIM-aligned model; DQ rules on CDEs; GIS connectivity fixes; semantic views for IEEE 1366 metrics; agents from templates | Outage prediction and storm staging; fault location advice; asset health; drone inspection; work bundling; gas leak triage; plant performance; forecasting; DataOps and FinOps | Outage communications and ETR; high-bill explanations; payment assistance; program targeting; large-load feasibility; capital portfolio; executive briefings; Ask the Utility | OT safety cap; consent and customer-data sharing; critical-infrastructure evidence; rate-case data requests; access to CEII; agent evaluation and promotion |
| **Agents** | UA-DI-01…06 | UA-GO-01…04, 06, 07 · UA-GM-01…03, 05 · UA-DI-07, 08 · UA-EE-04 | UA-CC-01…05 · UA-GO-05 · UA-GM-04 · UA-DI-09…11 · UA-EE-01, 05 | UA-DI-12, 13 · UA-EE-02, 03, 06 |
| **Headline KPIs** | Intent-to-insight 30–40% faster *(Capgemini proof, Telco — revalidate for Utilities)* · GIS connectivity errors down *(synthetic)* | Customer minutes interrupted down · forced outage rate down · L1/L2 data tickets down *(synthetic until proof)* | Self-service containment up · high-bill escalations down · time to large-load answer *(synthetic)* | Evidence-collection effort down · zero protected-customer disconnections · zero OT actions by agents *(synthetic)* |
| **What it takes** | Canonical utility model (CIM-aligned); CDE register; BI and KPI lineage extracts; human-approved merges | Historian and SCADA access in OT security zones; catalogued runbooks; evaluation suites; approval matrix | Certified products and semantic layer; consent propagation; channel integration (IVR, app, field mobile, BI) | Policy engine; CEII and critical-infrastructure information handling; audit trail; kill switches |
| **Demo** | U-S5 "From SAIDI goal to certified data product" | U-S7 "Overnight at the Utility" | U-S6 "A CFO question" (consume) · U-S2 "Heat-wave high bill" (act) | U-S9 "Assured by design" |

**Acceleration plan rules:** a governance or OT-security hard blocker puts the control plane first. A low-quality network model (GIS connectivity) leads to **Engineer**. Manual control-room and field processes lead to **Operate**. Otherwise the plan starts with **Decide & Act**.

---

## 7. Agents

### 7.1 Families and flagship agents (36)

| Family | Flagship agents | Processes mapped |
|---|---|---|
| Customer & commercial | 5 | 20 |
| Grid & asset operations | 7 | 31 |
| Generation & energy markets | 5 | 20 |
| Data & intelligence | 13 | 10 |
| Enterprise, safety & regulatory | 6 | 26 |

| ID | Agent | Motion | Default → max | Approver |
|---|---|---|---|---|
| UA-CC-01 | Outage Communication & ETR Agent | Decide & Act | L3 → L4 | Customer communications lead |
| UA-CC-02 | High-Bill & Usage Explainer Agent | Decide & Act | L2 → L3 | Billing supervisor |
| UA-CC-03 | Payment Assistance & Affordability Agent | Decide & Act | L3 → L3 | Credit & collections lead |
| UA-CC-04 | Energy Program & EV Advisor Agent | Decide & Act | L3 → L4 | Programs manager |
| UA-CC-05 | Large Load & New Connection Agent | Decide & Act | L2 → L3 | Large-load account manager |
| UA-GO-01 | Outage Prediction & Storm Staging Agent | Operate | L2 → L3 | Emergency operations director |
| UA-GO-02 | Fault Location & Restoration Advisor | Operate | **L2 → L2 (OT cap)** | Distribution system operator |
| UA-GO-03 | Asset Health & Risk Agent | Operate | L3 → L4 | Asset management lead |
| UA-GO-04 | Drone & Visual Inspection Agent | Operate | L3 → L3 | Inspection supervisor |
| UA-GO-05 | Vegetation & Wildfire Risk Agent | Decide & Act | **L2 → L2 (OT cap)** | Wildfire mitigation officer |
| UA-GO-06 | Work Bundling & Crew Dispatch Agent | Operate | L3 → L4 | Work management supervisor |
| UA-GO-07 | Gas Leak & Integrity Agent | Operate | L2 → L3 | Gas operations supervisor |
| UA-GM-01 | Plant Performance & Heat Rate Agent | Operate | **L2 → L2 (OT cap)** — advice only; set-points by operators | Plant operations manager |
| UA-GM-02 | Generation Predictive Maintenance Agent | Operate | L3 → L3 | Plant maintenance manager |
| UA-GM-03 | Load & Renewables Forecasting Agent | Operate | L4 → L4 | Forecasting lead |
| UA-GM-04 | Market Bidding & Settlement Agent | Decide & Act | L3 → L3 | Trading desk lead |
| UA-GM-05 | Battery Storage Dispatch Agent | Operate | **L2 → L2 (OT cap)** — proposes schedules; EMS/operator executes | Storage portfolio manager |
| UA-DI-01 | Data Product Discovery Agent | Engineer | L2 → L2 | Data product portfolio lead |
| UA-DI-02 | Source-to-Target Mapping Agent | Engineer | L2 → L3 | Data architect |
| UA-DI-03 | Data Quality Rules Agent | Engineer | L2 → L3 | Data steward |
| UA-DI-04 | Pipeline & Code Generation Agent | Engineer | L2 → L3 | Data engineering lead |
| UA-DI-05 | Semantic Model Builder Agent | Engineer | L2 → L3 | Semantic steward |
| UA-DI-06 | GIS & Network Model Quality Agent | Engineer | L3 → L3 | GIS manager |
| UA-DI-07 | Data Quality & Healing Agent | Operate | L3 → L4 | Data product owner |
| UA-DI-08 | Platform FinOps Agent | Operate | L2 → L3 | Platform owner |
| UA-DI-09 | Ask the Utility Agent | Decide & Act | L1 → L2 | n/a (read-only) |
| UA-DI-10 | Marketplace Concierge Agent | Decide & Act | L2 → L3 | n/a (self-service) |
| UA-DI-11 | Executive Insight Briefing Agent | Decide & Act | L2 → L3 | Chief of staff |
| UA-DI-12 | Agent Evaluation & Promotion Agent | Govern | L2 → L2 | AI governance board |
| UA-DI-13 | Access Request Agent | Govern | L3 → L4 | Data product owner |
| UA-EE-01 | Field Safety Briefing Agent | Decide & Act | L1 → L2 | Crew leader |
| UA-EE-02 | Rate Case & Data Request Agent | Govern | L2 → L3 | Regulatory affairs lead |
| UA-EE-03 | Critical-Infrastructure Compliance Evidence Agent | Govern | L3 → L3 | Compliance officer |
| UA-EE-04 | Long-Lead Materials Agent | Operate | L2 → L3 | Supply chain planner |
| UA-EE-05 | Capital Plan Optimisation Agent | Decide & Act | L2 → L2 | Capital planning director |
| UA-EE-06 | Customer Data Privacy & Consent Agent | Govern | L3 → L3 | Privacy officer |

Missions, triggers, data products, actions, guardrails, "Will not" lists, KPIs and demo prompts are in the seed JSON.

### 7.2 Hand-scripted runs (v1)
UA-GO-02, UA-GO-01, UA-CC-01, UA-CC-02, UA-CC-05, UA-GO-05, UA-DI-01, UA-DI-09, UA-EE-01. The other 27 use the engine's template replay plus five "Ask an agent" Q&As each, as in Telco.

### 7.3 Worked example — UA-GO-02 "Watch it run"

**Prompt:** "Feeder 12-04 locked out — where is the fault and how do we restore most customers fastest?"

| Step | Layer | Trace (scripted) | ms |
|---|---|---|---|
| Understand | Glossary | "locked out" → breaker lockout event; "Feeder 12-04" → circuit CKT-12-04, Metro region | 180 |
| Context | Context | OP-07: every switching plan is checked against the as-operated model, including tags and holds; OP-11: critical-care and medical-baseline customers are restored first where options are equal | 240 |
| Correlate | Data products | Lockout at 14:02 (SCADA); 3 faulted-circuit indicators tripped; 1,212 AMI last-gasp messages between switches SW-1204-B and SW-1204-C | 620 |
| Locate | AI/ML | Fault on the segment between SW-1204-B and SW-1204-C (0.86) · lateral fuse L-1204-17 (0.09) · other (0.05) | 540 |
| Impact | Semantic | 4,860 customers out, including 14 medical-baseline and 1 hospital on an automatic alternate feed; about 4,860 customer minutes interrupted per minute | 380 |
| Plan | Network model | Open SW-1204-B and SW-1204-C; close tie SW-1207-T from feeder 12-07 → restores 3,410 customers; feeder 12-07 loading goes from 71% to 89% of rating, within limits | 460 |
| Access | Governance | Role DSO_OPERATOR: CEII permitted; customer names masked, medical-baseline shown as a count | 90 |
| Hand-off | Control plane | **Plan sent to the operator to review and execute — the agent does not operate devices (OT cap L2)**. Patrol crew requested via UA-GO-06; outage notices and ETR 17:30 via UA-CC-01 | 280 |

**Knockouts:**
- *Context off:* the plan closes SW-1207-T, which is tagged out for maintenance. A red banner reads "Plan would operate a tagged device."
- *Network model / DQ off:* 380 customers are mis-assigned to the wrong segment, so the isolation leaves them out unnecessarily.
- *Governance off:* customer names appear to the operations role.

---

## 8. Foundation layers and data products

### 8.1 Utility specifics per layer (added to each layer drawer)

| Layer | Utility specifics |
|---|---|
| **Integration & OT/IT fabric** | CIS, MDMS, AMI head-end, OMS, ADMS/DERMS, EMS, SCADA, historian, GIS, EAM, mobile workforce, ISO/RTO market interfaces; OT data crosses security zones one way through data diodes or brokers; IEC 61968/61970 (CIM) message patterns; Green Button for customer data sharing |
| **Data platform** | Medallion layers on open tables; **network connectivity model as a governed data product**; AMI interval data at 15-minute grain; historian time series; IEEE 1366 reliability calculations with major-event-day flags; semantic views for reliability, cost per customer and bad debt |
| **AI / ML foundation** | Forecasting (load, renewables, outages), computer vision (drone, LiDAR, thermal), asset-health models, retrieval over standards and procedures, agent runtime with the OT cap |
| **Trust & governance** | Customer energy usage data consent and sharing rules; disconnection protections; rate-case evidence lineage; model risk tiers; human approval for every OT-adjacent recommendation |
| **Security & critical-infrastructure protection** | Classification and handling of CEII and BES Cyber System Information; least-privilege agent identities; no agent credentials in OT zones; evidence for reliability and cyber standards |

**Nine-layer stack sample objects:** `SV_RELIABILITY` (SAIDI/SAIFI/CAIDI by region, cause and major-event-day flag), `SV_CUSTOMER_360`, `SV_BILLING_ARREARS`, `SV_ASSET_RISK`, `SV_FEEDER_CAPACITY`. Sources: CIS, MDMS, OMS, GIS, EAM, historian, documents.

### 8.2 Data-product shelf (31)
Customer (8): Customer 360 · AMI Interval Usage · Billing & Payments · Rates & Tariffs · Contact Preferences & Consent · Assistance & Protections · Programs & Enrolment · Connection Requests.
Grid (9): Outage & Reliability 360 · Network Connectivity Model · Grid Events & SCADA · Feeder Capacity & Hosting · Transmission Capacity · Weather & Fire Risk · Asset Registry & Health · Inspection Imagery & Findings · Vegetation Spans.
Gas (3): Gas Leaks & Surveys · Pipe Segments & Integrity · One-Call Tickets.
Generation & markets (5): Unit Performance · Plant Historian · Storage Assets · Load & Weather · Market Bids & Settlements.
Enterprise & platform (6): Work Orders · Workforce & Crews · Materials & Inventory · Safety Observations & Incidents · Capital & O&M · Agent Evidence Trail.

Each card shows its classification badge (PII / CEUD / CEII / Market-Sensitive / Internal / Confidential). Sample tables: customers (50,000 rows, masked account and meter IDs), feeders (400-feeder sample), AMI intervals (sample of 500 meters × 30 days, regenerated in the browser), outage events, work orders.

---

## 9. Offerings (13)

| # | Offering | Motion | Promise |
|---|---|---|---|
| U-O1 | Grid Reliability & Outage Intelligence | Operate | Predict, locate and restore faster, and tell customers the truth about restoration times |
| U-O2 | Agent Data Fabric for Utilities | Engineer | One trusted, reusable intelligence layer across CIS, MDMS, OMS, GIS, EAM and OT |
| U-O3 | Asset Health & Inspection AI | Operate | Inspect by drone and sensor, rank risk, replace by condition |
| U-O4 | AI-Ready Utility Data Foundation | Engineer | Governed layers, a CIM-aligned model and the network model as a data product |
| U-O5 | Utility AI Readiness Assessment | Govern | Score readiness, find hard blockers (network model, OT security, consent) and sequence the fix in 4–6 weeks |
| U-O6 | Data Product Factory (with BI rationalisation and KPI-lineage accelerators) | Engineer | From the existing BI estate and business intent to certified data products |
| U-O7 | Enterprise Data & Agent Marketplace | Decide & Act | Discover, try, request and consume data products and agents |
| U-O8 | AI Architecture Office & Control Plane | Govern | AI risk tiering, the OT safety cap, evidence and agent oversight |
| U-O9 | Customer Experience & Affordability Intelligence | Decide & Act | Explain every bill, help customers who struggle and contain more contacts |
| U-O10 | Wildfire & Storm Resilience AI | Decide & Act | Risk-based vegetation, fire-weather decision support and storm staging |
| U-O11 | Large Load & Interconnection Acceleration | Decide & Act | Faster answers for data centres, DER and generation interconnection |
| U-O12 | Generation Performance & Energy Markets AI | Operate | Heat rate, predictive maintenance, forecasting, bidding and storage |
| U-O13 | Connected Worker & Field Safety AI | Decide & Act | Job-specific briefings, SIF-precursor insight and field knowledge on mobile |

Each uses the Telco offering template unchanged: Assess / Pilot / Scale / Run segmented control, clickable architecture with the control-plane rail, a "What it takes" checklist, demo link and proof. Mark U-O4–U-O13 as `maturity: emerging` and `validated: false` until owners confirm them.

---

## 10. 04 Impact — calculator and readiness

### 10.1 Calculator inputs (reference defaults, synthetic)
Electric customers 3.2M · gas customers 1.1M · annual revenue $11.8bn · O&M $2.9bn · SAIDI excluding major event days 128 min · storm O&M $260M/yr · contacts per customer per year 1.6 · cost per contact $6.80 · truck rolls/month 38,000 · vegetation spend $310M/yr · bad debt 0.9% of revenue · estimated bills 2.4% · forced outage rate 6.5% · imbalance cost $45M/yr.

### 10.2 Levers (conservative / expected, all `[validate]`)
Customer minutes interrupted reduced (and its value) · storm O&M avoided · contact containment · truck rolls avoided · vegetation spend optimised · bad debt reduced · estimated bills reduced · forced outages avoided · imbalance cost reduced · capex deferred by targeted replacement · inspection cost per mile · data and compliance evidence effort. Output by outcome and by motion, 3-year ramp. Formulas live in `calculator.json` (see C2).

### 10.3 Readiness quick check — utility adaptations
Same 8 pillars and 12 questions. The questions change to cover: network model (GIS) accuracy, AMI data quality and latency, OT/IT data access in security zones, consent for customer energy usage data, critical-infrastructure information handling, IEEE 1366 metric lineage, BI estate rationalisation and agent evaluation.

**Hard blockers (cap the score):**
- No governed route for OT data into analytics.
- No consent propagation for customer energy usage data.
- GIS connectivity accuracy unknown.
- No evidence trail for agent actions.

Comparison band: an anonymised synthetic **"Utility cohort"**.

---

## 11. 05 Proof — scenarios and case studies

| # | Scenario | Motion | Agents |
|---|---|---|---|
| U-S1 | **Storm night:** damage prediction → staging → fault location → restoration plan to the operator → ETR notices | Operate → Decide & Act | UA-GO-01 → 02 → 06 → UA-CC-01 |
| U-S2 | **Heat-wave high bill:** explanation with interval and weather evidence → payment arrangement → program offer | Decide & Act | UA-CC-02 → 03 → 04 |
| U-S3 | **A 300 MW data-centre request:** feasibility screen → capacity and timeline → draft agreement terms, with engineering sign-off | Decide & Act | UA-CC-05 → UA-EE-05 |
| U-S4 | **Summer transformer risk:** health scoring → replacement ranking → long-lead materials re-plan | Operate | UA-GO-03 → UA-EE-04 → UA-GO-06 |
| U-S5 | **From SAIDI goal to certified data product:** finds 3 conflicting SAIDI definitions (with and without major event days) across 900+ legacy reports, then maps, adds rules, builds the semantic view and certifies | Engineer | UA-DI-01 → 02 → 03 → 04 → 05 |
| U-S6 | **A CFO question:** "Why did O&M per customer rise in the Valley region?" — traced answer; refuses customer-level usage; access auto-approved for an aggregate product | Decide & Act (consume) | UA-DI-11 / 09 → 10 → 13 |
| U-S7 | **Overnight at the Utility:** AMI feed late and auto-healed; gas leak indications triaged; historian tags flat-lined; FinOps saving; an agent eligible for promotion | Operate | UA-DI-07, UA-GO-07, UA-DI-08, UA-DI-12 |
| U-S8 | **Red-flag day:** span and circuit fire-risk tiers → PSPS decision pack for the officer → medical-baseline-first notifications after a human decision | Decide & Act | UA-GO-05 → UA-CC-01 |
| U-S9 | **Assured by design:** critical-infrastructure evidence pack, a CEII access request refused, a consent gap closed, an agent demoted, an OT-cap block shown | Govern | UA-EE-03, UA-DI-13, UA-EE-06, UA-DI-12 |

**Case studies:** start with **no approved utility case studies**. Seed 6 anonymised placeholders (`approvedExternal: false`), hidden in Client mode until offer owners supply approved proof. Do not reuse Telco proof points as Utility proof.

---

## 12. Presenter menu — audiences and run sheets

Audiences: **CEO · COO / SVP T&D Operations · Chief Customer Officer · CFO · CIO / CDO · Chief Safety Officer · Chief Regulatory Officer · CISO / CRO**. Each preselects an outcome, motion, scenario and offerings (e.g. Chief Safety Officer → Safety & compliance, Decide & Act, U-S1 crew safety step, U-O13). The 15-, 30- and 60-minute run sheets are rebuilt with utility routes.

---

## 13. Synthetic reference Utility

**Profile (generic, synthetic; the UI says "your Utility"):**

| Item | Value |
|---|---|
| Electric customers | 3.2M (residential 88%, commercial 11%, industrial 1%) |
| Gas customers | 1.1M |
| Regions | 6 (Northern, Coastal, Metro, Central, Valley, Mountain) |
| Network | 690 substations · 2,450 distribution circuits · 52,000 distribution line-miles · 11,800 transmission line-miles · 28,000 miles of gas main |
| Generation | 9.4 GW: gas 4.1 · coal 1.2 · hydro 0.6 · wind 2.1 · solar 1.0 · storage 0.4 |
| Peak load | 13.8 GW |
| AMI | 3.05M electric meters (95%) |
| Reliability baseline | SAIDI excluding MED 128 min · SAIFI 1.05 · CAIDI 122 min (CAIDI = SAIDI ÷ SAIFI, reconciled) · SAIDI including MED 395 min |
| As-of | 2026-09-30; 13 months of monthly KPIs |

**Datasets:** monthly KPIs (13 months × 6 regions × customer classes); 50,000-customer sample with masked IDs, arrears, program and consent flags, medical-baseline flag; 400-feeder sample with loading, hosting capacity and reliability; outage events (30 days, including the planted storm and the CKT-12-04 lockout); AMI intervals for 500 meters × 30 days (in-browser); 20,000 work orders; 2,000 asset health scores; gas leak indications; report and KPI lineage (920 reports, 260 KPIs, 3 conflicting SAIDI definitions, broken lineage, missing stewards); agent telemetry (36 agents × 90 days); readiness baseline.

**Reconciliation checks (generator fails the build on any of these):**
- Regions sum to the total customer count.
- CAIDI = SAIDI ÷ SAIFI.
- The CKT-12-04 fixture: 4,860 customers out, 3,410 restored by the tie, 1,212 AMI last-gasp messages.
- The 900+-report lineage (920 reports) contains exactly 3 SAIDI definitions.
- The storm fixture totals match U-S1 and the calculator.

All names of people are fictional and roles are generic. There are no real substation names, feeder IDs, coordinates, rates or tariffs.

---

## 14. Neutrality and governance

- **Utilities deny-list:** names and brands of investor-owned utilities, cooperatives, municipal utilities, generation companies, ISOs and RTOs, and state commissions as organisation names. ISO/RTO and NERC appear only as generic terms in narrative text, never as a client.
- Deny real identifiers: substation and plant names, feeder and circuit IDs in real formats, lat/long coordinates, docket numbers.
- **Classification refusals** come from `industry.json` (PII, CEUD, CEII, Market-Sensitive).
- Every metric has `source` and `validated` flags; Why-now figures are `published`; seed impact ranges are `BENCH`, `validated: false`.
- The footer keeps the synthetic disclosure: "Synthetic data · generic reference Utility · seed … · as of …".

---

## 15. Build plan

| Phase | Scope | Exit criteria |
|---|---|---|
| **U0 — Generalise the engine (1 wk)** | C1–C10, `content/industries/`, `industry.json`, build flag, CI matrix, golden-file test for Telco | Telco output byte-identical; 58 Telco tests green |
| **U1 — Utilities pack skeleton (1 wk)** | `industry.json`, site copy and Why now (§3), board (§4), domains from the seed (§5), hero art | Board and explorer fully interactive; neutrality lint green for both packs |
| **U2 — Agents and data (2 wks)** | 36 agents, OT cap, 9 scripted runs, Q&As; 31 data products; synthetic generator and fixtures (§13); process catalogue extended to about 160 | Every agent opens; OT-capped agents cannot move past L2; reconciliation checks pass |
| **U3 — Accelerate, offerings, impact (2 wks)** | §6 motions and demos, 13 offerings, calculator and readiness | Every architecture box opens; calculator formulas come from JSON only |
| **U4 — Proof and presenter (1 wk)** | 9 scenarios, case placeholders, audiences and run sheets, briefing export | 30-minute utility run sheet presented end to end offline |
| **U5 — Hardening and SME review (1 wk)** | Smoke suite parameterised for Utilities; size; accessibility; review by utility SMEs (grid operations, customer, regulatory, safety) | Both packs green in CI; SME sign-off on terminology and the OT safety framing |

**Definition of done:**
- Same five sections and no tabs.
- Every tile, agent, layer and architecture box opens.
- OT safety rule enforced and tested.
- No client names or real identifiers.
- Numbers reconcile across views.
- Single offline file under 8 MB.
- Telco build unchanged.

---

## 16. Open questions

1. **Scope of utility types:** electric + gas combination by default. Do we also need water/wastewater, or a wires-only (no generation) variant toggled per session?
2. **Region framing:** keep North American terms (NERC, ISO/RTO, IEEE 1366, PUC), or add a European variant (DSO/TSO, ENTSO-E, regulator-neutral)?
3. **OT cap:** is L2 the right ceiling for all OT-facing agents, or may some (e.g. forecasting publication) stay at L4? The current draft allows L4 only for agents with no device control.
4. **Proof:** which approved Capgemini utility case studies can replace the placeholders?
5. **Offer list:** confirm the 13 offerings and their owners, especially U-O13 Connected Worker & Field Safety AI and U-O6 with the BI rationalisation accelerators.
6. **Repository:** keep both packs in one repo (recommended), or fork into `Utilities-Intelligent-Operator-Playbook`?

---

## Sources

- [NERC warns reliability risk is rising as load growth outpaces infrastructure — Power Engineering (Jan 2026)](https://www.power-eng.com/business/policy-and-regulation/nerc-warns-reliability-risk-is-rising-as-load-growth-outpaces-infrastructure/)
- [Global 2025 power demand rose as EV, data centers grew, IEA says — Bloomberg Law (Apr 2026)](https://news.bloomberglaw.com/environment-and-energy/global-2025-power-demand-rose-as-ev-data-centers-grew-iea-says)
- [Deloitte: AI data center power demand to surge 30x by 2035 — T&D World (Jul 2025)](https://www.tdworld.com/utility-business/news/55301471/deloitte-report-ai-data-center-power-demand-to-surge-30x-by-2035)
- [Investor-owned utilities to spend $1.1T in grid boost — POWER (Oct 2025)](https://www.powermag.com/investor-owned-utilities-to-spend-1-1t-in-grid-boost-as-power-demand-spirals/)
- [EEI: Electric companies to invest nearly $208B in 2025](https://www.eei.org/News/news/All/electric-companies-to-invest-nearly-$208b-in-2025-to-strengthen-grid-and-drive-economic-growth)
- [Berkeley Lab — Queued Up 2026 Edition](https://emp.lbl.gov/queued-2026-edition-characteristics-power-plants-seeking-transmission-interconnection-end-2025)
- [US EIA — Today in Energy: hours without power in 2024 (Dec 2025)](https://www.eia.gov/todayinenergy/detail.php?id=66744)
- [S&P Global / 451 Research — Energy and utilities firms investing aggressively in AI despite mixed returns (Mar 2026)](https://www.spglobal.com/market-intelligence/en/news-insights/research/2026/03/energy-and-utilities-firms-investing-aggressively-in-ai-despite-mixed-returns)
- [Capgemini — World Energy Markets Outlook](https://capgemini.com/in-en/23rd-edition-world-energy-markets-observatory) (background; cites roughly 40% grid utilisation)
