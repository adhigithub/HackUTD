import {
  ACTIVE_ALERTS,
  BUILDINGS,
  ELECTRICITY_PRICE_PER_KWH,
  IMPACT_PROFILES,
  buildIncidents,
  buildWasteNights,
} from './demo-data';
import { formatDateTime, formatShortDate, formatUSD, plural } from './format';
import {
  BUILDING_TYPE_LABELS,
  CATEGORY_LABELS,
  FIX_MODE_LABELS,
  type ActiveAlert,
  type Building,
  type IssueCategory,
  type ResolvedIncident,
} from './types';

/**
 * Client report math. Plain code, no AI: the AI only explains these numbers,
 * so they stay consistent and checkable.
 */

export const REPORT_PERIODS = [7, 30] as const;
export type ReportPeriod = (typeof REPORT_PERIODS)[number];

export function isReportPeriod(n: unknown): n is ReportPeriod {
  return REPORT_PERIODS.includes(n as ReportPeriod);
}

export type BuildingSavings = {
  building: Building;
  saved: number;
  incidents: number;
  wasteSaved: number;
};

export type WasteByZone = {
  building: Building;
  zone: string;
  nights: number;
  kwh: number;
  saved: number;
};

export type ReportSummary = {
  periodDays: ReportPeriod;
  startISO: string;
  endISO: string;
  totalSaved: number;
  incidentSavings: number;
  wasteSaved: number;
  wasteKwh: number;
  /** Count of automatic overnight setbacks. */
  wasteNights: number;
  /** Overnight waste in the period, scaled to a full year. */
  wasteAnnualized: number;
  outagesPrevented: number;
  failuresPrevented: number;
  threatsStopped: number;
  fixCounts: { auto: number; one_tap: number; escalated: number };
  byBuilding: BuildingSavings[];
  byCategory: { category: IssueCategory; saved: number }[];
  wasteByZone: WasteByZone[];
  /** Newest first. */
  incidents: ResolvedIncident[];
  activeAlerts: ActiveAlert[];
  moneyAtRisk: number;
};

export function buildReport(periodDays: ReportPeriod, now = new Date()): ReportSummary {
  const start = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const inPeriod = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= start.getTime() && t <= now.getTime();
  };

  const incidents = buildIncidents(now)
    .filter((i) => inPeriod(i.occurredAt))
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const waste = buildWasteNights(now, periodDays).filter((w) => inPeriod(w.date));

  const incidentSavings = sum(incidents.map((i) => i.costAvoided));
  const wasteSaved = round2(sum(waste.map((w) => w.costSaved)));
  const wasteKwh = sum(waste.map((w) => w.kwhSaved));

  const byBuilding = BUILDINGS.map((building) => {
    const bi = incidents.filter((i) => i.buildingId === building.id);
    const bw = round2(sum(waste.filter((w) => w.buildingId === building.id).map((w) => w.costSaved)));
    return {
      building,
      saved: round2(sum(bi.map((i) => i.costAvoided)) + bw),
      incidents: bi.length,
      wasteSaved: bw,
    };
  }).sort((a, b) => b.saved - a.saved);

  const categories: IssueCategory[] = ['cooling', 'power', 'security', 'waste'];
  const byCategory = categories
    .map((category) => ({
      category,
      saved:
        category === 'waste'
          ? wasteSaved
          : sum(incidents.filter((i) => i.category === category).map((i) => i.costAvoided)),
    }))
    .sort((a, b) => b.saved - a.saved);

  const zoneMap = new Map<string, WasteByZone>();
  for (const w of waste) {
    const key = `${w.buildingId}|${w.zone}`;
    const building = BUILDINGS.find((b) => b.id === w.buildingId)!;
    const entry = zoneMap.get(key) ?? { building, zone: w.zone, nights: 0, kwh: 0, saved: 0 };
    entry.nights += 1;
    entry.kwh += w.kwhSaved;
    entry.saved = round2(entry.saved + w.costSaved);
    zoneMap.set(key, entry);
  }

  const fixCounts = { auto: waste.length, one_tap: 0, escalated: 0 };
  for (const i of incidents) fixCounts[i.fixMode] += 1;

  return {
    periodDays,
    startISO: start.toISOString(),
    endISO: now.toISOString(),
    totalSaved: round2(incidentSavings + wasteSaved),
    incidentSavings,
    wasteSaved,
    wasteKwh,
    wasteNights: waste.length,
    wasteAnnualized: Math.round((wasteSaved / periodDays) * 365),
    outagesPrevented: incidents.filter((i) => i.outcome === 'outage_prevented').length,
    failuresPrevented: incidents.filter((i) => i.outcome === 'failure_prevented').length,
    threatsStopped: incidents.filter((i) => i.outcome === 'threat_stopped').length,
    fixCounts,
    byBuilding,
    byCategory,
    wasteByZone: [...zoneMap.values()].sort((a, b) => b.saved - a.saved),
    incidents,
    activeAlerts: [...ACTIVE_ALERTS].sort((a, b) => b.moneyAtRisk - a.moneyAtRisk),
    moneyAtRisk: sum(ACTIVE_ALERTS.map((a) => a.moneyAtRisk)),
  };
}

export function buildingName(id: string) {
  return BUILDINGS.find((b) => b.id === id)?.name ?? id;
}

/** Plain-text report a manager or advisor can share with the client. */
export function reportAsText(r: ReportSummary) {
  const lines = [
    `BluePrint client report: ${formatShortDate(r.startISO)} – ${formatShortDate(r.endISO)}`,
    '',
    `Money saved: ${formatUSD(r.totalSaved)}`,
    `Outages prevented: ${r.outagesPrevented}`,
    `Equipment failures caught early: ${r.failuresPrevented}`,
    `Security threats stopped: ${r.threatsStopped}`,
    `Energy saved at night: ${formatUSD(r.wasteSaved)} over ${plural(r.wasteNights, 'night')} (about ${formatUSD(r.wasteAnnualized)} a year)`,
    '',
    'By building:',
    ...r.byBuilding.map(
      (b) => `- ${b.building.name} (${BUILDING_TYPE_LABELS[b.building.type]}): ${formatUSD(b.saved)}`
    ),
    '',
    'Problems stopped before they spread:',
    ...r.incidents.map(
      (i) =>
        `- ${formatShortDate(i.occurredAt)} · ${buildingName(i.buildingId)}: ${i.title}. ${i.fix} (${formatUSD(i.costAvoided)} avoided)`
    ),
    '',
    `Still at risk right now: ${formatUSD(r.moneyAtRisk)} across ${plural(r.activeAlerts.length, 'open alert')}.`,
    '',
    'Dollar figures are illustrative estimates based on building type and lease terms.',
  ];
  return lines.join('\n');
}

/**
 * Everything the AI is allowed to know, as compact text. Built from the same
 * functions the screen uses, so the AI and the screen can't disagree.
 */
export function buildAiContext(now = new Date()) {
  const month = buildReport(30, now);
  const week = buildReport(7, now);

  const buildings = BUILDINGS.map((b) => {
    const p = IMPACT_PROFILES[b.type];
    return `- ${b.name} (${BUILDING_TYPE_LABELS[b.type]}, ${b.city}). Tenants: ${b.tenants.join('; ')}. Cost of a 10-minute outage: ${p.outageImpact}. What matters most: ${p.whatMatters}. Typical lease promise: ${p.leasePromise}.`;
  });

  const totals = (r: ReportSummary) =>
    [
      `Money saved: ${formatUSD(r.totalSaved)} (problems stopped ${formatUSD(r.incidentSavings)} + overnight waste ${formatUSD(r.wasteSaved)})`,
      `Outages prevented: ${r.outagesPrevented}; equipment failures caught early: ${r.failuresPrevented}; security threats stopped: ${r.threatsStopped}`,
      `Fixes: ${r.fixCounts.auto} automatic, ${r.fixCounts.one_tap} one-tap, ${r.fixCounts.escalated} escalated`,
      `Overnight waste: ${plural(r.wasteNights, 'automatic setback')}, ${r.wasteKwh} kWh, ${formatUSD(r.wasteSaved)} (about ${formatUSD(r.wasteAnnualized)} a year at this rate)`,
      `By building: ${r.byBuilding.map((b) => `${b.building.name} ${formatUSD(b.saved)} (${plural(b.incidents, 'problem')} stopped, ${formatUSD(b.wasteSaved)} waste)`).join('; ')}`,
      `By issue type: ${r.byCategory.map((c) => `${CATEGORY_LABELS[c.category]} ${formatUSD(c.saved)}`).join('; ')}`,
    ].join('\n');

  const incidents = month.incidents.map((i) =>
    [
      `- [${formatDateTime(i.occurredAt)}] ${buildingName(i.buildingId)}: ${i.title}`,
      `  What the data showed: ${i.summary}`,
      `  Domino chain: ${i.chain.map((c, idx) => (idx === i.stoppedAt ? `[STOPPED HERE] ${c}` : c)).join(' -> ')}`,
      `  Fix: ${i.fix} (${FIX_MODE_LABELS[i.fixMode]})`,
      `  Data combined: ${i.sources.join(', ')}`,
      `  Cost avoided: ${formatUSD(i.costAvoided)}`,
    ].join('\n')
  );

  const waste = month.wasteByZone.map(
    (z) => `- ${z.building.name}, ${z.zone}: ${plural(z.nights, 'night')}, ${z.kwh} kWh, ${formatUSD(z.saved)}`
  );

  const alerts = month.activeAlerts.map(
    (a) =>
      `- ${buildingName(a.buildingId)}: ${a.title} (${a.severity === 'act' ? 'act now' : 'watch'}). ${a.detail} Expected to get worse ${a.eta}. Money at risk: ${formatUSD(a.moneyAtRisk)}. Recommended fix: ${a.recommendedFix}`
  );

  return [
    `Today is ${formatShortDate(now.toISOString())}. Electricity price used: $${ELECTRICITY_PRICE_PER_KWH}/kWh.`,
    '',
    'BUILDINGS',
    ...buildings,
    '',
    `LAST 30 DAYS (${formatShortDate(month.startISO)} – ${formatShortDate(month.endISO)})`,
    totals(month),
    '',
    `LAST 7 DAYS (${formatShortDate(week.startISO)} – ${formatShortDate(week.endISO)})`,
    totals(week),
    '',
    'PROBLEMS STOPPED IN THE LAST 30 DAYS (newest first)',
    ...incidents,
    '',
    'ENERGY SAVED AT NIGHT IN THE LAST 30 DAYS (the app switched AC/lights in an empty space to night mode automatically)',
    ...waste,
    '',
    `OPEN ALERTS RIGHT NOW (total money at risk ${formatUSD(month.moneyAtRisk)})`,
    ...alerts,
  ].join('\n');
}

function sum(ns: number[]) {
  return ns.reduce((a, b) => a + b, 0);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
