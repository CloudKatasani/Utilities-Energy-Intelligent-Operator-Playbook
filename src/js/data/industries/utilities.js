// Synthetic reference Utility (spec §13). Generic, fictional and seeded: the same seed gives the same data
// in Node (scripts/generate-synthetic.mjs embeds the aggregates) and in the browser (row-level samples
// are regenerated on demand by row(i), so 50,000 customers never have to be embedded).
import { rng, apportion, months, round, mask } from '../core.js';

export const PROFILE = {
  electricCustomers: 3200000,
  classMix: { residential: 0.88, commercial: 0.11, industrial: 0.01 },
  gasCustomers: 1100000,
  regions: [
    { id: 'northern', name: 'Northern', weight: 12, gasWeight: 16 },
    { id: 'coastal', name: 'Coastal', weight: 18, gasWeight: 14 },
    { id: 'metro', name: 'Metro', weight: 30, gasWeight: 34 },
    { id: 'central', name: 'Central', weight: 16, gasWeight: 15 },
    { id: 'valley', name: 'Valley', weight: 14, gasWeight: 13 },
    { id: 'mountain', name: 'Mountain', weight: 10, gasWeight: 8 },
  ],
  substations: 690,
  circuits: 2450,
  distLineMiles: 52000,
  transLineMiles: 11800,
  gasMainMiles: 28000,
  generationGw: 9.4,
  generationMix: { gas: 4.1, coal: 1.2, hydro: 0.6, wind: 2.1, solar: 1.0, storage: 0.4 },
  peakLoadGw: 13.8,
  amiMeters: 3050000,
  saidiExMed: 128,
  saifi: 1.05,
  saidiInclMed: 395,
  revenue: 11.8e9,
  om: 2.9e9,
  stormOm: 260e6,
  contactsPerCustomer: 1.6,
  costPerContact: 6.8,
  truckRollsPerMonth: 38000,
  vegetationSpend: 310e6,
  badDebtPct: 0.009,
  estimatedBillsPct: 0.024,
  forcedOutageRate: 0.065,
  imbalanceCost: 45e6,
  sampleCustomers: 50000,
  sampleFeeders: 400,
  sampleMeters: 500,
  amiDays: 30,
  workOrders: 20000,
  assetScores: 2000,
};

const REGION_CODE = { northern: 'N', coastal: 'C', metro: 'M', central: 'R', valley: 'V', mountain: 'T' };
const REGION_NUM = { northern: 10, coastal: 11, metro: 12, central: 13, valley: 14, mountain: 15 };

// ---------------------------------------------------------------- aggregates (embedded at build time)
export function generate(fx, { agents = [] } = {}) {
  const r = rng(fx.seed);
  const P = PROFILE;
  const custParts = apportion(P.electricCustomers, P.regions.map((x) => x.weight));
  const gasParts = apportion(P.gasCustomers, P.regions.map((x) => x.gasWeight));
  const meterParts = apportion(P.amiMeters, P.regions.map((x) => x.weight));
  const subParts = apportion(P.substations, P.regions.map((x) => x.weight));
  const circParts = apportion(P.circuits, P.regions.map((x) => x.weight));
  const classKeys = Object.keys(P.classMix);

  const regions = P.regions.map((g, i) => {
    const cls = apportion(custParts[i], classKeys.map((k) => P.classMix[k] * 1000));
    const omPrior = g.id === 'valley' ? fx.cfoQuestion.omBefore : Math.round(r.normal(452, 18));
    const omCurrent = g.id === 'valley' ? fx.cfoQuestion.omAfter : Math.round(omPrior * (1 + r.normal(0.025, 0.012)));
    return {
      id: g.id, name: g.name, code: REGION_CODE[g.id],
      electricCustomers: custParts[i], gasCustomers: gasParts[i], amiMeters: meterParts[i],
      substations: subParts[i], circuits: circParts[i],
      byClass: Object.fromEntries(classKeys.map((k, j) => [k, cls[j]])),
      omPerCustomer: { prior: omPrior, current: omCurrent },
    };
  });

  // Monthly KPIs: 13 months × 6 regions. Reliability is scaled so the trailing 12 months reconcile
  // exactly to the profile (SAIDI ex-MED, SAIFI, SAIDI incl. MED).
  const mos = months(fx.asOf, 13);
  const season = (m) => [1.0, 0.9, 0.9, 0.8, 0.9, 1.1, 1.4, 1.5, 1.3, 1.0, 0.9, 1.0][Number(m.slice(5)) - 1];
  const raw = mos.map((m) => regions.map((g) => ({
    saidi: season(m) * r.normal(1, 0.12) * (g.id === 'mountain' ? 1.3 : g.id === 'metro' ? 0.8 : 1),
    saifi: season(m) * r.normal(1, 0.1),
    med: (m === fx.storm.date.slice(0, 7) && ['coastal', 'northern'].includes(g.id)) ? 6 : 0,
  })));
  const last12 = raw.slice(1);
  const wsum = (key) => last12.reduce((s, row) => s + row.reduce((t, x, i) => t + x[key] * regions[i].electricCustomers, 0), 0) / P.electricCustomers;
  const kSaidi = P.saidiExMed / wsum('saidi');
  const kSaifi = P.saifi / wsum('saifi');
  const medTotal = wsum('med');
  const kMed = (P.saidiInclMed - P.saidiExMed) / medTotal;
  const monthly = mos.map((m, mi) => ({
    month: m,
    regions: regions.map((g, gi) => {
      const x = raw[mi][gi];
      const contacts = Math.round(g.electricCustomers * P.contactsPerCustomer / 12 * season(m) * r.normal(1, 0.05));
      return {
        region: g.id,
        saidiExMed: round(x.saidi * kSaidi, 2),
        saidiMed: round(x.med * kMed, 2),
        saifi: round(x.saifi * kSaifi, 4),
        contacts,
        estimatedBillsPct: round(P.estimatedBillsPct * r.normal(1, 0.08), 4),
        badDebtPct: round(P.badDebtPct * r.normal(1, 0.1), 4),
        highBillComplaints: Math.round(g.electricCustomers / 10000 * season(m) ** 2 * r.normal(1.2, 0.2)),
      };
    }),
  }));
  const trailing = (key) => round(monthly.slice(1).reduce((s, mo) => s + mo.regions.reduce((t, x, i) => t + x[key] * regions[i].electricCustomers, 0), 0) / P.electricCustomers, 2);
  const reliability = {
    saidiExMed: trailing('saidiExMed'),
    saifi: round(trailing('saifi'), 2),
    saidiInclMed: round(trailing('saidiExMed') + trailing('saidiMed'), 0),
  };
  reliability.caidi = round(reliability.saidiExMed / reliability.saifi, 1);

  // Storm fixture apportioned across regions and outages.
  const stormRegions = ['coastal', 'northern'];
  const stormOutages = apportion(fx.storm.actualOutages, [60, 40]);
  const stormCustomers = apportion(fx.storm.peakCustomersOut, [58, 42]);

  // Agent telemetry: 90 days summarised per agent (runs, acceptance, evaluation, refusals, cost, trend).
  const telemetry = Object.fromEntries(agents.map((a, i) => {
    const ar = rng(fx.seed + 1000 + i);
    let acceptance = round(0.78 + ar() * 0.17, 2);
    let evalScore = round(0.86 + ar() * 0.11, 2);
    if (a.id === fx.overnight.promotionAgent) acceptance = fx.overnight.promotionAcceptance;
    const trend = Array.from({ length: 13 }, (_, w) => round(Math.min(0.99, acceptance - 0.06 + (w / 12) * 0.06 + ar.normal(0, 0.012)), 2));
    trend[12] = acceptance;
    if (a.id === fx.assured.demotedAgent) { evalScore = 0.84; trend.splice(8, 5, ...trend.slice(8).map((v, k) => round(v - (k + 1) * 0.015, 2))); acceptance = trend[12]; }
    return [a.id, {
      runs90d: Math.round(400 + ar() * 9000),
      acceptance30d: acceptance,
      evalScore,
      refusalRate: round(0.01 + ar() * 0.05, 3),
      costPerRun: round(0.02 + ar() * 0.4, 2),
      trend,
      synthetic: true,
    }];
  }));
  const atTarget = agents.filter((a) => (telemetry[a.id]?.evalScore || 0) >= 0.9).length;

  return {
    seed: fx.seed,
    asOf: fx.asOf,
    profile: {
      ...P,
      regions: undefined,
      electricCustomersM: round(P.electricCustomers / 1e6, 1),
      gasCustomersM: round(P.gasCustomers / 1e6, 1),
      amiPct: round(P.amiMeters / P.electricCustomers, 3),
    },
    regions,
    monthly,
    reliability,
    storm: { regions: stormRegions, outages: stormOutages, customers: stormCustomers },
    lineage: {
      reports: fx.saidiLineage.reports,
      kpis: fx.saidiLineage.kpis,
      saidiDefinitions: [
        { id: 'DEF-A', label: 'SAIDI including major event days (all interruptions > 5 min)', reports: 22 },
        { id: 'DEF-B', label: 'SAIDI excluding major event days (IEEE 1366 2.5β method)', reports: fx.saidiLineage.evidenceReports - 22 - 9 },
        { id: 'DEF-C', label: 'SAIDI excluding planned outages and step restoration, includes MED', reports: 9 },
      ],
      brokenLineage: fx.saidiLineage.brokenLineage,
      missingStewards: fx.saidiLineage.missingStewards,
    },
    telemetry,
    metrics: {
      agents: agents.length,
      agentsAtTarget: atTarget,
      otCapped: agents.filter((a) => a.otCapped).length,
      customersTotal: P.electricCustomers + P.gasCustomers,
    },
  };
}

// ---------------------------------------------------------------- row-level samples (browser and Node)
// Each generator returns { count, row(i) }; row(i) is deterministic, so any page of 50,000 rows can be
// shown without embedding it.
const seeded = (syn, salt, i) => rng(syn.seed * 7 + salt * 100003 + i);
const regionAt = (syn, i, n) => {
  // Deterministic region assignment proportional to electric customers.
  const parts = apportion(n, syn.regions.map((g) => g.electricCustomers));
  let acc = 0;
  for (let k = 0; k < parts.length; k += 1) { acc += parts[k]; if (i < acc) return syn.regions[k]; }
  return syn.regions[syn.regions.length - 1];
};

export function feederRow(syn, fx, i) {
  const r = seeded(syn, 3, i);
  const g = regionAt(syn, i, PROFILE.sampleFeeders);
  let id = `CKT-${REGION_NUM[g.id]}-${String((i % 60) + 1).padStart(2, '0')}`;
  let customers = r.int(900, 3600);
  let loading = r.int(38, 92);
  if (i === 0) { id = fx.feederLockout.circuit; customers = fx.feederLockout.customersOut; loading = 64; }
  if (i === 1) { id = fx.feederLockout.tieCircuit; customers = r.int(2400, 3200); loading = fx.feederLockout.loadingBefore; }
  return {
    circuit: id,
    region: i < 2 ? fx.feederLockout.region : g.name,
    substation: `SUB-${g.code}-${String(r.int(1, 40)).padStart(2, '0')}`,
    customers,
    peakLoadingPct: loading,
    hostingMw: round(r() * 6 + 0.4, 1),
    derMw: round(r() * 3, 1),
    saidi: round(r.normal(128, 40), 0),
  };
}

export const generators = {
  customers: (syn) => ({
    count: PROFILE.sampleCustomers,
    row: (i) => {
      const r = seeded(syn, 1, i);
      const g = regionAt(syn, i, PROFILE.sampleCustomers);
      const cls = r.weighted([['Residential', 88], ['Commercial', 11], ['Industrial', 1]]);
      return {
        account: mask('ACCT', 100000 + i * 37), meter: mask('MTR', 500000 + i * 53), region: g.name, class: cls,
        commodity: r.weighted([['Electric', 64], ['Electric + gas', 30], ['Gas', 6]]),
        arrearsUsd: r() < 0.11 ? r.int(40, 900) : 0,
        program: r.weighted([['None', 70], ['Budget billing', 12], ['Demand response', 9], ['EV rate', 5], ['Solar NEM', 4]]),
        medicalBaseline: r() < 0.012 ? 'Yes' : 'No',
        consentShare: r() < 0.31 ? 'Granted' : 'Not granted',
      };
    },
  }),
  ami: (syn) => ({
    count: PROFILE.sampleMeters * PROFILE.amiDays * 96,
    row: (i) => {
      const meter = Math.floor(i / (PROFILE.amiDays * 96));
      const slot = i % 96;
      const day = Math.floor(i / 96) % PROFILE.amiDays;
      const r = seeded(syn, 2, i);
      const hour = slot / 4;
      const base = 0.18 + 0.35 * Math.max(0, Math.sin(((hour - 7) / 24) * 2 * Math.PI)) + (hour >= 16 && hour <= 21 ? 0.45 : 0);
      return {
        meter: mask('MTR', 500000 + meter * 53), date: `2026-09-${String(day + 1).padStart(2, '0')}`,
        interval: `${String(Math.floor(hour)).padStart(2, '0')}:${String((slot % 4) * 15).padStart(2, '0')}`,
        kwh: round(Math.max(0.02, base * r.normal(1, 0.15)), 3), quality: r() < 0.004 ? 'Estimated' : 'Actual',
      };
    },
  }),
  bills: (syn) => ({
    count: PROFILE.sampleCustomers * 12,
    row: (i) => {
      const r = seeded(syn, 4, i);
      const days = r.int(28, 33);
      return { account: mask('ACCT', 100000 + Math.floor(i / 12) * 37), period: months(syn.asOf, 12)[i % 12], days, kwh: r.int(380, 1450), amountUsd: r.int(62, 290), status: r.weighted([['Paid', 86], ['Due', 9], ['Arrangement', 3], ['Past due', 2]]) };
    },
  }),
  tariffs: (syn) => ({
    count: 64,
    row: (i) => {
      const r = seeded(syn, 5, i);
      return { rate: `RATE-${String.fromCharCode(65 + (i % 8))}${i + 1}`, class: r.pick(['Residential', 'Commercial', 'Industrial']), type: r.pick(['Tiered', 'Time-of-use', 'EV', 'Demand', 'Flat']), riders: r.int(1, 6), effective: `2026-${String(r.int(1, 9)).padStart(2, '0')}-01`, synthetic: 'Yes' };
    },
  }),
  connections: (syn, fx) => ({
    count: 2400,
    row: (i) => {
      const r = seeded(syn, 6, i);
      if (i === 0) return { request: 'REQ-LL-0001', type: 'Large load (data centre)', region: fx.dataCentre.region, sizeMw: fx.dataCentre.requestMw, stage: 'Feasibility screen', ageDays: fx.dataCentre.screenDays };
      return { request: `REQ-${String(i + 1).padStart(4, '0')}`, type: r.weighted([['New residential', 60], ['Commercial', 25], ['Solar + storage', 10], ['EV fleet', 5]]), region: regionAt(syn, i, 2400).name, sizeMw: round(r() * 2, 2), stage: r.pick(['Intake', 'Design', 'Construction', 'Energised']), ageDays: r.int(2, 160) };
    },
  }),
  outages: (syn, fx) => {
    // Storm events first (they reconcile to the storm fixture), then the CKT-12-04 lockout, then 30 days of routine events.
    const stormCount = syn.storm.outages.reduce((s, x) => s + x, 0);
    const routine = 1150;
    return {
      count: stormCount + 1 + routine,
      row: (i) => {
        if (i < stormCount) {
          const k = i < syn.storm.outages[0] ? 0 : 1;
          const idx = k === 0 ? i : i - syn.storm.outages[0];
          const parts = apportion(syn.storm.customers[k], Array.from({ length: syn.storm.outages[k] }, (_, j) => 1 + ((j * 7919) % 13)));
          const r = seeded(syn, 7, i);
          const g = syn.regions.find((x) => x.id === syn.storm.regions[k]);
          return { outage: `OUT-S-${String(i + 1).padStart(4, '0')}`, date: fx.storm.date, region: g.name, cause: r.weighted([['Tree contact', 55], ['Wind damage', 30], ['Equipment', 15]]), customers: parts[idx], minutes: r.int(90, 1800), med: 'Yes' };
        }
        if (i === stormCount) return { outage: 'OUT-1204', date: fx.asOf, region: fx.feederLockout.region, cause: 'Breaker lockout (fault)', customers: fx.feederLockout.customersOut, minutes: 0, med: 'No' };
        const r = seeded(syn, 8, i);
        return { outage: `OUT-${String(i + 1).padStart(5, '0')}`, date: `2026-09-${String(r.int(1, 30)).padStart(2, '0')}`, region: regionAt(syn, i - stormCount - 1, routine).name, cause: r.weighted([['Equipment', 35], ['Tree contact', 25], ['Animal', 15], ['Vehicle', 8], ['Planned', 12], ['Unknown', 5]]), customers: r.int(1, 1800), minutes: r.int(20, 360), med: 'No' };
      },
    };
  },
  connectivity: (syn, fx) => ({
    count: 24000,
    row: (i) => {
      const r = seeded(syn, 9, i);
      if (i < 3) return [{ segment: 'SEG-1204-AB', circuit: fx.feederLockout.circuit, from: 'BRKR-1204', to: fx.feederLockout.isolateA, phase: 'ABC', status: 'Closed', customers: 1210 }, { segment: 'SEG-1204-BC', circuit: fx.feederLockout.circuit, from: fx.feederLockout.isolateA, to: fx.feederLockout.isolateB, phase: 'ABC', status: 'Closed', customers: fx.feederLockout.customersOut - fx.feederLockout.restoredByTie - 240 }, { segment: 'SEG-1207-T', circuit: fx.feederLockout.tieCircuit, from: fx.feederLockout.tieSwitch, to: fx.feederLockout.isolateB, phase: 'ABC', status: 'Open (tie)', customers: 0 }][i];
      return { segment: `SEG-${r.int(1000, 1599)}-${String.fromCharCode(65 + r.int(0, 7))}${String.fromCharCode(65 + r.int(0, 7))}`, circuit: feederRow(syn, fx, r.int(2, 399)).circuit, from: `SW-${r.int(1000, 1599)}`, to: `SW-${r.int(1000, 1599)}`, phase: r.pick(['A', 'B', 'C', 'ABC', 'ABC']), status: r() < 0.06 ? 'Open' : 'Closed', customers: r.int(0, 600) };
    },
  }),
  scada: (syn, fx) => ({
    count: 86000,
    row: (i) => {
      if (i === 0) return { time: `${fx.asOf} ${fx.feederLockout.lockoutTime}:07`, point: 'BRKR-1204', event: 'Lockout (3 operations)', circuit: fx.feederLockout.circuit, priority: 'High' };
      const r = seeded(syn, 10, i);
      return { time: `2026-09-${String(r.int(1, 30)).padStart(2, '0')} ${String(r.int(0, 23)).padStart(2, '0')}:${String(r.int(0, 59)).padStart(2, '0')}:00`, point: `PT-${r.int(10000, 99999)}`, event: r.pick(['Breaker open', 'Breaker close', 'Recloser operation', 'Voltage low', 'FCI tripped', 'Comms lost']), circuit: feederRow(syn, fx, r.int(0, 399)).circuit, priority: r.weighted([['Low', 70], ['Medium', 24], ['High', 6]]) };
    },
  }),
  feeders: (syn, fx) => ({ count: PROFILE.sampleFeeders, row: (i) => feederRow(syn, fx, i) }),
  transmission: (syn, fx) => ({
    count: 180,
    row: (i) => {
      const r = seeded(syn, 11, i);
      if (i === 0) return { path: 'PATH-V-230-01', region: fx.dataCentre.region, kv: 230, ratingMw: 620, peakFlowMw: 512, headroomMw: fx.dataCentre.availableNowMw, constraint: 'Thermal (N-1)' };
      const rating = r.int(180, 900);
      const flow = Math.round(rating * (0.45 + r() * 0.45));
      return { path: `PATH-${regionAt(syn, i, 180).code}-${r.pick([115, 138, 230, 345])}-${String(i).padStart(2, '0')}`, region: regionAt(syn, i, 180).name, kv: r.pick([115, 138, 230, 345]), ratingMw: rating, peakFlowMw: flow, headroomMw: rating - flow, constraint: r.pick(['None', 'Thermal (N-1)', 'Voltage', 'Stability']) };
    },
  }),
  weather: (syn, fx) => ({
    count: 6 * 30,
    row: (i) => {
      const r = seeded(syn, 12, i);
      const g = syn.regions[i % 6];
      const day = Math.floor(i / 6) + 1;
      const storm = `2026-09-${String(day).padStart(2, '0')}` === fx.storm.date && ['coastal', 'northern'].includes(g.id);
      const red = `2026-09-${String(day).padStart(2, '0')}` === fx.redFlag.date && ['valley', 'mountain'].includes(g.id);
      return { date: `2026-09-${String(day).padStart(2, '0')}`, region: g.name, gustMph: storm ? r.int(58, 74) : r.int(8, 32), maxTempF: r.int(68, 104), humidityPct: red ? r.int(6, 11) : r.int(14, 70), fireIndex: red ? 'Extreme' : r.weighted([['Low', 50], ['Moderate', 30], ['High', 15], ['Very high', 5]]) };
    },
  }),
  assets: (syn, fx) => ({
    count: PROFILE.assetScores,
    row: (i) => {
      const r = seeded(syn, 13, i);
      const high = i < fx.transformerRisk.highRisk;
      return { asset: `XFMR-${String(i + 1).padStart(5, '0')}`, type: r.weighted([['Distribution transformer', 70], ['Substation transformer', 8], ['Breaker', 12], ['Regulator', 10]]), region: regionAt(syn, i, PROFILE.assetScores).name, ageYears: high ? r.int(38, 61) : r.int(2, 55), healthIndex: high ? r.int(8, 29) : r.int(30, 99), riskTier: high ? 'High' : r.weighted([['Low', 70], ['Medium', 30]]) };
    },
  }),
  inspections: (syn) => ({
    count: 64000,
    row: (i) => {
      const r = seeded(syn, 14, i);
      return { image: `IMG-${String(i + 1).padStart(6, '0')}`, structure: `POLE-${r.int(100000, 999999)}`, method: r.pick(['Drone RGB', 'Drone thermal', 'LiDAR', 'Ground patrol']), finding: r.weighted([['None', 82], ['Cracked insulator', 5], ['Woodpecker damage', 4], ['Hot connection', 3], ['Leaning pole', 4], ['Broken crossarm', 2]]), confidence: round(0.6 + r() * 0.39, 2), status: r.pick(['Confirmed', 'Pending review', 'Dismissed']) };
    },
  }),
  spans: (syn, fx) => ({
    count: fx.redFlag.spansScored,
    row: (i) => {
      const r = seeded(syn, 15, i);
      return { span: `SPAN-${String(i + 1).padStart(6, '0')}`, circuit: feederRow(syn, fx, r.int(0, 399)).circuit, species: r.pick(['Oak', 'Pine', 'Eucalyptus', 'Cottonwood', 'Fir']), clearanceFt: round(r() * 14 + 1, 1), lastTrim: `202${r.int(2, 6)}`, riskTier: r.weighted([['Tier 1', 70], ['Tier 2', 22], ['Tier 3', 8]]) };
    },
  }),
  leaks: (syn, fx) => ({
    count: 3100,
    row: (i) => {
      const r = seeded(syn, 16, i);
      const g1 = i < fx.overnight.grade1;
      return { indication: `LK-${String(i + 1).padStart(5, '0')}`, region: regionAt(syn, i, 3100).name, source: r.pick(['Mobile survey', 'Customer call', 'Patrol', 'Advanced leak detection']), ppm: g1 ? r.int(9000, 22000) : r.int(5, 4000), grade: g1 ? 'Grade 1 (hazardous)' : r.weighted([['Grade 2', 25], ['Grade 3', 75]]), status: g1 ? 'Crew dispatched' : r.pick(['Monitor', 'Scheduled', 'Repaired']) };
    },
  }),
  pipes: (syn) => ({
    count: 41000,
    row: (i) => {
      const r = seeded(syn, 17, i);
      return { segment: `PIPE-${String(i + 1).padStart(6, '0')}`, material: r.weighted([['Plastic', 55], ['Coated steel', 30], ['Bare steel', 8], ['Cast iron', 7]]), installed: r.int(1952, 2024), maopPsig: r.pick([60, 99, 150, 300]), threat: r.pick(['Corrosion', 'Excavation', 'Material', 'Natural force']), riskRank: r.int(1, 41000) };
    },
  }),
  oneCall: (syn) => ({
    count: 9200,
    row: (i) => {
      const r = seeded(syn, 18, i);
      return { ticket: `OC-${String(i + 1).padStart(6, '0')}`, region: regionAt(syn, i, 9200).name, workType: r.pick(['Fibre install', 'Water main', 'Road work', 'Fence', 'Landscaping']), excavator: r.pick(['Contractor A', 'Contractor B', 'Homeowner', 'Municipal crew']), nearMain: r() < 0.3 ? 'Yes' : 'No', damageRisk: r.weighted([['Low', 70], ['Medium', 22], ['High', 8]]) };
    },
  }),
  units: (syn) => {
    const units = [['CC-1', 'Gas combined cycle', 620], ['CC-2', 'Gas combined cycle', 580], ['CT-3', 'Gas peaker', 210], ['ST-4', 'Coal steam', 600], ['ST-5', 'Coal steam', 600], ['HY-6', 'Hydro', 300], ['HY-7', 'Hydro', 300], ['WF-8', 'Wind farm', 700], ['WF-9', 'Wind farm', 650], ['WF-10', 'Wind farm', 750], ['PV-11', 'Solar', 500], ['PV-12', 'Solar', 500], ['BS-13', 'Battery storage', 400]];
    return {
      count: units.length,
      row: (i) => {
        const r = seeded(syn, 19, i);
        const [unit, type, mw] = units[i];
        return { unit, type, capacityMw: mw, availabilityPct: round(88 + r() * 10, 1), heatRate: /Gas|Coal/.test(type) ? r.int(6800, 10400) : '—', efor: round(r() * 9, 1) };
      },
    };
  },
  historian: (syn, fx) => ({
    count: 182000,
    row: (i) => {
      const r = seeded(syn, 20, i);
      const flat = i < fx.overnight.flatTags;
      return { tag: `CC1.${r.pick(['GT', 'ST', 'HRSG', 'BOP'])}.${r.pick(['VIB', 'TEMP', 'PRES', 'FLOW'])}.${String(r.int(1, 999)).padStart(3, '0')}`, unit: r.pick(['CC-1', 'CC-2', 'ST-4', 'HY-6']), lastValue: round(r() * 500, 2), quality: flat ? 'Flat-lined' : 'Good', updated: flat ? 'Stale 6 h' : 'Live' };
    },
  }),
  storage: (syn) => ({
    count: 8,
    row: (i) => {
      const r = seeded(syn, 21, i);
      return { site: `BS-13-${String.fromCharCode(65 + i)}`, mw: 50, mwh: 200, socPct: r.int(20, 90), cycles: r.int(120, 410), roundTripPct: round(84 + r() * 5, 1) };
    },
  }),
  loadWeather: (syn) => ({
    count: 30 * 24,
    row: (i) => {
      const r = seeded(syn, 22, i);
      const hour = i % 24;
      const load = 8.2 + 4.6 * Math.max(0, Math.sin(((hour - 6) / 24) * 2 * Math.PI)) + r.normal(0, 0.2);
      return { date: `2026-09-${String(Math.floor(i / 24) + 1).padStart(2, '0')}`, hour, loadGw: round(Math.min(13.8, load), 2), forecastGw: round(Math.min(13.8, load * r.normal(1, 0.02)), 2), windGw: round(r() * 1.9, 2), solarGw: round(hour > 6 && hour < 19 ? Math.sin(((hour - 6) / 13) * Math.PI) * 0.92 : 0, 2) };
    },
  }),
  bids: (syn) => ({
    count: 13 * 24 * 30,
    row: (i) => {
      const r = seeded(syn, 23, i);
      return { day: `2026-09-${String(Math.floor(i / (13 * 24)) % 30 + 1).padStart(2, '0')}`, hour: Math.floor(i / 13) % 24, unit: ['CC-1', 'CC-2', 'CT-3', 'ST-4', 'ST-5', 'HY-6', 'HY-7', 'WF-8', 'WF-9', 'WF-10', 'PV-11', 'PV-12', 'BS-13'][i % 13], offerMw: r.int(20, 600), priceUsdMwh: r.int(18, 140), settled: r.pick(['Settled', 'Settled', 'Disputed']) };
    },
  }),
  workOrders: (syn) => ({
    count: PROFILE.workOrders,
    row: (i) => {
      const r = seeded(syn, 24, i);
      return { workOrder: `WO-${String(i + 1).padStart(6, '0')}`, type: r.weighted([['Corrective', 38], ['Preventive', 30], ['Capital', 18], ['Emergency', 8], ['Gas leak repair', 6]]), region: regionAt(syn, i, PROFILE.workOrders).name, priority: r.pick(['P1', 'P2', 'P3', 'P4']), crewSkill: r.pick(['Line', 'Substation', 'Gas', 'Meter', 'Vegetation']), status: r.pick(['Planned', 'Scheduled', 'In progress', 'Complete']) };
    },
  }),
  crews: (syn) => ({
    count: 860,
    row: (i) => {
      const r = seeded(syn, 25, i);
      return { crew: `Crew ${regionAt(syn, i, 860).code}-${String(i + 1).padStart(3, '0')}`, region: regionAt(syn, i, 860).name, skill: r.pick(['Line', 'Substation', 'Gas', 'Meter', 'Vegetation']), size: r.int(2, 5), onShift: r() < 0.62 ? 'Yes' : 'No', qualification: r.pick(['Qualified electrical worker', 'Gas operator qualified', 'Apprentice-led']) };
    },
  }),
  materials: (syn, fx) => ({
    count: 5400,
    row: (i) => {
      const r = seeded(syn, 26, i);
      const ltx = i === 0;
      return { item: ltx ? 'MAT-LPT-230' : `MAT-${String(i + 1).padStart(5, '0')}`, description: ltx ? 'Large power transformer 230/34.5 kV' : r.pick(['Distribution transformer 50 kVA', 'Pole 45 ft', 'Recloser', 'Conductor 336 ACSR (1,000 ft)', 'PE pipe 4 in']), onHand: ltx ? fx.transformerRisk.spares : r.int(0, 400), leadTimeWeeks: ltx ? fx.transformerRisk.leadTimeWeeks : r.int(2, fx.transformerRisk.distLeadWeeks), status: r.pick(['OK', 'Reorder', 'Expedite']) };
    },
  }),
  safety: (syn) => ({
    count: 14000,
    row: (i) => {
      const r = seeded(syn, 27, i);
      return { record: `OBS-${String(i + 1).padStart(6, '0')}`, type: r.weighted([['Observation', 70], ['Near miss', 20], ['Incident', 8], ['SIF precursor', 2]]), workType: r.pick(['Live-line work', 'Excavation', 'Driving', 'Substation switching (by operator)', 'Tree work']), region: regionAt(syn, i, 14000).name, severity: r.pick(['Low', 'Low', 'Medium', 'High']), status: r.pick(['Open', 'Closed']) };
    },
  }),
  capital: (syn) => ({
    count: 1200,
    row: (i) => {
      const r = seeded(syn, 28, i);
      return { project: `CAP-${String(i + 1).padStart(4, '0')}`, program: r.pick(['Grid hardening', 'Substation upgrade', 'Pole replacement', 'Gas main replacement', 'AMI refresh', 'Large-load interconnection']), region: regionAt(syn, i, 1200).name, budgetUsdM: round(r() * 40 + 0.2, 1), spentPct: r.int(0, 100), riskReductionPerUsdM: round(r() * 5, 2) };
    },
  }),
  evidence: (syn) => ({
    count: 412000,
    row: (i) => {
      const r = seeded(syn, 29, i);
      return { event: `EV-${String(i + 1).padStart(7, '0')}`, agent: `UA-${r.pick(['CC', 'GO', 'GM', 'DI', 'EE'])}-${String(r.int(1, 7)).padStart(2, '0')}`, action: r.pick(['answer', 'propose', 'act_with_approval', 'refuse', 'notify']), policy: `POL-${r.int(10, 60)}`, approver: r.pick(['—', 'Approved', 'Rejected']), reversible: r() < 0.97 ? 'Yes' : 'No' };
    },
  }),
  reports: (syn, fx) => ({
    // BI estate lineage (920 reports); exactly three SAIDI definitions are in use.
    count: fx.saidiLineage.reports,
    row: (i) => {
      const r = seeded(syn, 30, i);
      const defs = syn.lineage.saidiDefinitions;
      let def = '—';
      let acc = 0;
      for (const d of defs) { if (i >= acc && i < acc + d.reports) def = d.id; acc += d.reports; }
      return { report: `RPT-${String(i + 1).padStart(4, '0')}`, kpi: def !== '—' ? 'SAIDI' : r.pick(['SAIFI', 'CAIDI', 'O&M per customer', 'Bad debt %', 'Estimated bills %', 'Contacts per customer']), definition: def, steward: i % 16 === 3 && i < 16 * fx.saidiLineage.missingStewards ? '(missing)' : r.pick(['Reliability engineering', 'Regulatory reporting', 'Finance', 'Customer operations']), lineage: i % 25 === 7 && i < 25 * fx.saidiLineage.brokenLineage ? 'Broken' : 'Complete' };
    },
  }),
};

// ---------------------------------------------------------------- reconciliation (spec §13; fails the build)
export function reconcile(syn, fx, content = {}) {
  const errors = [];
  const check = (ok, msg) => { if (!ok) errors.push(msg); };
  const sum = (arr, k) => arr.reduce((s, x) => s + x[k], 0);
  check(sum(syn.regions, 'electricCustomers') === PROFILE.electricCustomers, 'regions do not sum to the electric customer total');
  check(sum(syn.regions, 'gasCustomers') === PROFILE.gasCustomers, 'regions do not sum to the gas customer total');
  check(sum(syn.regions, 'substations') === PROFILE.substations, 'regions do not sum to the substation total');
  syn.regions.forEach((g) => check(Object.values(g.byClass).reduce((s, x) => s + x, 0) === g.electricCustomers, `${g.name}: customer classes do not sum to the region`));
  check(Math.abs(syn.reliability.saidiExMed - PROFILE.saidiExMed) < 0.5, `SAIDI ex-MED ${syn.reliability.saidiExMed} ≠ ${PROFILE.saidiExMed}`);
  check(Math.abs(syn.reliability.saifi - PROFILE.saifi) < 0.005, `SAIFI ${syn.reliability.saifi} ≠ ${PROFILE.saifi}`);
  check(Math.abs(syn.reliability.saidiInclMed - PROFILE.saidiInclMed) < 1, `SAIDI incl. MED ${syn.reliability.saidiInclMed} ≠ ${PROFILE.saidiInclMed}`);
  check(Math.abs(syn.reliability.caidi - syn.reliability.saidiExMed / syn.reliability.saifi) < 0.1, 'CAIDI ≠ SAIDI ÷ SAIFI');
  // CKT-12-04 fixture
  const L = fx.feederLockout;
  check(L.restoredByTie + L.remainingOut === L.customersOut, 'CKT-12-04: restored + remaining ≠ customers out');
  check(feederRow(syn, fx, 0).circuit === L.circuit && feederRow(syn, fx, 0).customers === L.customersOut, 'CKT-12-04: feeder sample does not carry the lockout customers');
  check(feederRow(syn, fx, 1).peakLoadingPct === L.loadingBefore, 'CKT-12-07: tie feeder loading does not match the fixture');
  check(Math.abs(L.pSegment + L.pFuse + L.pOther - 1) < 1e-9, 'CKT-12-04: fault-location probabilities do not sum to 1');
  check(L.lastGasp === 1212 && L.customersOut === 4860 && L.restoredByTie === 3410, 'CKT-12-04: fixture differs from the spec (4,860 out · 3,410 restored · 1,212 last-gasp)');
  const out = generators.outages(syn, fx);
  const lock = Array.from({ length: out.count }, (_, i) => out.row(i)).filter((x) => x.outage === 'OUT-1204');
  check(lock.length === 1 && lock[0].customers === L.customersOut, 'CKT-12-04: outage events do not contain the lockout');
  // Lineage: 920 reports, exactly 3 SAIDI definitions
  const rep = generators.reports(syn, fx);
  const rows = Array.from({ length: rep.count }, (_, i) => rep.row(i));
  check(rows.length === fx.saidiLineage.reports, 'lineage: report count ≠ fixture');
  const defs = new Set(rows.filter((x) => x.kpi === 'SAIDI').map((x) => x.definition));
  check(defs.size === fx.saidiLineage.saidiDefinitions, `lineage: ${defs.size} SAIDI definitions, expected ${fx.saidiLineage.saidiDefinitions}`);
  check(rows.filter((x) => x.kpi === 'SAIDI').length === fx.saidiLineage.evidenceReports, 'lineage: SAIDI report count ≠ evidence reports');
  check(rows.filter((x) => x.steward === '(missing)').length === fx.saidiLineage.missingStewards, 'lineage: missing stewards ≠ fixture');
  check(rows.filter((x) => x.lineage === 'Broken').length === fx.saidiLineage.brokenLineage, 'lineage: broken lineage ≠ fixture');
  // Storm: outage events reconcile to the fixture, and the calculator uses the same storm O&M
  const storm = Array.from({ length: out.count }, (_, i) => out.row(i)).filter((x) => x.outage.startsWith('OUT-S-'));
  check(storm.length === fx.storm.actualOutages, `storm: ${storm.length} outage events, expected ${fx.storm.actualOutages}`);
  check(sum(storm, 'customers') === fx.storm.peakCustomersOut, `storm: customers ${sum(storm, 'customers')} ≠ ${fx.storm.peakCustomersOut}`);
  check(fx.storm.annualStormOm === PROFILE.stormOm, 'storm: annual storm O&M fixture ≠ profile');
  const calcStorm = content.calculator?.inputs?.find((x) => x.id === 'stormOm');
  if (content.calculator) check(calcStorm && calcStorm.default * 1e6 === fx.storm.annualStormOm, 'storm: calculator storm O&M default ≠ storm fixture');
  // High bill decomposition and CFO bridge
  const H = fx.highBill;
  check(H.weather + H.billingDays + H.rate === H.increase && H.billThisJuly - H.billLastJuly === H.increase, 'high bill: drivers do not sum to the increase');
  const C = fx.cfoQuestion;
  check(C.vegetation + C.storm + C.contractor === C.omAfter - C.omBefore, 'CFO question: drivers do not sum to the O&M change');
  const valley = syn.regions.find((g) => g.id === 'valley');
  check(valley.omPerCustomer.prior === C.omBefore && valley.omPerCustomer.current === C.omAfter, 'CFO question: Valley O&M per customer ≠ fixture');
  check(Math.abs((C.omAfter - C.omBefore) / C.omBefore - C.omChangePct) < 0.001, 'CFO question: percentage change ≠ fixture');
  check(syn.telemetry[fx.overnight.promotionAgent]?.acceptance30d === fx.overnight.promotionAcceptance, 'overnight: promotion agent acceptance ≠ fixture');
  return errors;
}
