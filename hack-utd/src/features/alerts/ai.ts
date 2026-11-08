/**
 * BluePrint's AI layer (spec §8 ⑤).
 *
 *  - scanPortfolio(): runs the detection rules (engine.ts, plain code) over the
 *    fake building data. Detection is NOT done by the AI.
 *  - explainAlert() / draftWorkOrder(): ask Groq (via the server route
 *    src/app/api/ai+api.ts) to put the engine's facts into plain English.
 *    If the call fails (no network, rate limit, no key), they fall back to
 *    the template text below, so the demo never shows an empty box.
 */
import {
  detectHvacWaste,
  panelRiskScore,
  pickFixes,
  predictTimeToLimit,
  runChain,
} from './engine';
import { formatClock, formatMinutes, formatUSD, formatUSDCompact } from './format';
import {
  emptyFloorHvac,
  freezerDrift,
  getBuilding,
  PANEL_HOT_F,
  panelFailures,
  panelRecordSigns,
  serverRoomOverheat,
} from './mock-data';
import { ReadingStore, type ReadingRow } from './readings';
import { SOURCE_LABELS, type Alert, type AutoFix, type Domino, type ScoredFix } from './types';

export type ScanResult = { alerts: Alert[]; autoFixes: AutoFix[]; scannedAt: number };

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Runs every detection rule over the given sensor readings (from Supabase, or
 * the built-in demo rows when offline). An alert only exists if the data says so.
 */
export function scanPortfolio(rows: ReadingRow[], now = Date.now()): ScanResult {
  const store = new ReadingStore(rows, now);
  const alerts: Alert[] = [];

  // Scenarios 3 + freezer: a value trending toward its limit.
  for (const s of [serverRoomOverheat, freezerDrift]) {
    const series = store.series(s.sensor.assetId, s.sensor.metric);
    const newest = store.latest(s.sensor.assetId, s.sensor.metric);
    if (series.length < 2 || !newest) continue; // need at least two points for a trend
    const trend = predictTimeToLimit(series, s.limitF);
    const alreadyOver = trend.current >= s.limitF;
    const rising = trend.ratePer10Min > 0.1;
    if (!alreadyOver && !(rising && trend.minutesToLimit <= s.horizonMin)) continue;

    const minutesToLimit = alreadyOver ? 0 : trend.minutesToLimit;
    const firstFall =
      'coolingToRoomDelay' in s
        ? Math.max(5, minutesToLimit - s.coolingToRoomDelay) // cooling trips before the room overheats
        : Math.max(5, minutesToLimit);
    const chain = runChain(s.chain, firstFall);
    const cur = round1(trend.current);
    const rate = round1(Math.max(0, trend.ratePer10Min));
    // The room is what's measured for overheating; the freezer itself for the freezer.
    const what = s === serverRoomOverheat ? s.location : s.asset;
    const reading = alreadyOver
      ? `${what} is ${cur}°F, already past the ${s.limitF}°F limit`
      : `${what} is ${cur}°F and getting ${rate}°F warmer every 10 minutes`;
    alerts.push(
      finish({
        id: s.id,
        buildingId: s.buildingId,
        kind: 'overheat',
        title: s.title,
        asset: s.asset,
        location: s.location,
        detectedAt: now,
        dataAt: newest.t,
        metric: `${cur}°F · +${rate}°F / 10 min · limit ${s.limitF}°F`,
        signals: [{ source: 'temp', reading }, ...s.signals.filter((x) => x.source !== 'temp')],
        chain,
        fixes: pickFixes(chain, s.fixes),
        confidence: s === serverRoomOverheat ? 0.91 : 0.77,
      })
    );
  }

  // Scenario 2: panel risk score (live dips + temperature, plus record-based signs).
  for (const p of panelFailures) {
    const temp = store.latest(p.assetId, 'temp_f');
    const dips = store.count(p.assetId, 'voltage_dip_pct', (v) => v >= 5);
    const newestDip = store.latest(p.assetId, 'voltage_dip_pct');
    const risk = panelRiskScore({
      ...panelRecordSigns,
      dipsOver5PctLast24h: dips,
      tempAboveNormal: !!temp && temp.value >= PANEL_HOT_F,
    });
    if (!risk.highRisk) continue;
    const name = p.asset.replace('Power ', '');
    const facts = [
      dips ? `${name}’s power dipped ${dips} time${dips === 1 ? '' : 's'} in the last day` : '',
      temp ? `${name} is running at ${Math.round(temp.value)}°F` : '',
    ].filter(Boolean);
    const chain = runChain(p.chain);
    alerts.push(
      finish({
        id: p.id,
        buildingId: p.buildingId,
        kind: 'power',
        title: p.title,
        asset: p.asset,
        location: p.location,
        detectedAt: now,
        dataAt: Math.max(temp?.t ?? 0, newestDip?.t ?? 0),
        metric: `Risk score ${risk.score}/100 · ${risk.parts.map((x) => x.label).join(', ')}`,
        signals: [
          { source: 'panel', reading: facts.join(', and ') },
          ...p.signals.filter((x) => x.source !== 'panel'),
        ],
        chain,
        fixes: pickFixes(chain, p.fixes),
        confidence: 0.84,
      })
    );
  }

  // Scenario 1: waste rule. Safe + reversible, so it's fixed automatically.
  const autoFixes: AutoFix[] = [];
  const h = emptyFloorHvac;
  const kw = store.latest(h.assetId, 'kw');
  const usualKw = store.baseline(h.assetId, 'kw');
  const people = store.latest(h.assetId, 'people')?.value ?? 0;
  if (kw) {
    const hvacOn = kw.value >= Math.max(h.minOnKw, (usualKw ?? 0) * 2);
    const waste = detectHvacWaste(
      {
        hvacOn,
        occupants: people,
        outsideLeaseHours: h.outsideLeaseHours,
        minutesInState: (now - kw.t) / 60_000,
        kW: kw.value,
        hoursUntilOpen: h.hoursUntilOpen,
        pricePerKWh: h.pricePerKWh,
      },
      0 // live demo: one reading is enough (a real building would wait ~30 min)
    );
    if (waste.isWaste) {
      const b = getBuilding(h.buildingId);
      autoFixes.push({
        id: h.id,
        buildingId: h.buildingId,
        title: `${b?.name} ${h.floor} switched to unoccupied mode`,
        detail:
          `The AC was running hard on an empty floor after hours. BluePrint set it back to 78°F; ` +
          `it switches back instantly if anyone badges in.`,
        at: formatClock(kw.t),
        savedPerNight: waste.costPerNight,
        savedPerYear: waste.costPerYear,
        signals: [
          {
            source: 'meter',
            reading:
              `${h.floor} is using ${Math.round(kw.value)} kW of power` +
              (usualKw ? ` (usually about ${Math.round(usualKw)} kW)` : ''),
          },
          {
            source: 'occupancy',
            reading: people === 0 ? 'Nobody is on the floor' : `${people} people on the floor`,
          },
          ...h.recordSignals,
        ],
        undone: false,
      });
    }
  }

  alerts.sort((a, b) => b.costAtRisk - a.costAtRisk);
  return { alerts, autoFixes, scannedAt: now };
}

type Draft = Omit<Alert, 'costAtRisk' | 'severity' | 'explanation'>;

function finish(draft: Draft): Alert {
  const costAtRisk = draft.chain[draft.chain.length - 1].cumulativeCost;
  const firstFall = draft.chain[0].fallAtMin;
  const severity = firstFall <= 180 || costAtRisk >= 50_000 ? 'act' : 'watch';
  return { ...draft, costAtRisk, severity, explanation: explain(draft.chain, draft.fixes) };
}

/** Template explanation (fallback when the AI is unavailable). Two short sentences. */
function explain(chain: Domino[], fixes: ScoredFix[]) {
  const [first, ...rest] = chain;
  const total = chain[chain.length - 1].cumulativeCost;
  const best = fixes.find((f) => f.feasible);
  return (
    `${first.label} will likely fail in about ${formatMinutes(first.fallAtMin)}` +
    (rest.length ? `, taking down ${rest.length} more thing${rest.length > 1 ? 's' : ''} ` : ' ') +
    `(about ${formatUSDCompact(total)}). ` +
    (best ? `We can stop it now and save ${formatUSDCompact(best.saved)}.` : 'Escalate now.')
  );
}

// ─── Real AI (Groq via /api/ai) with template fallback ──────────────────────

export type AIText = { text: string; source: 'ai' | 'template' };

/** Results cached per alert (+ fix) so revisiting a screen doesn't re-call the API. */
const cache = new Map<string, Promise<AIText>>();

/** Everything the model may say comes from here: engine output, never its own math. */
function factsFor(alert: Alert, fix?: ScoredFix) {
  const target = fix && alert.chain.find((d) => d.id === fix.stopsAtDominoId);
  return {
    building: getBuilding(alert.buildingId)?.name ?? alert.buildingId,
    asset: alert.asset,
    location: alert.location,
    breaksInMinutes: alert.chain[0].fallAtMin,
    projectedLossUSD: alert.costAtRisk,
    whatHappensNext: alert.chain.map((d) => ({
      whatHappens: d.impact,
      inMinutes: d.fallAtMin,
      costUSD: d.cost,
    })),
    readings: alert.signals.map((s) => ({ system: SOURCE_LABELS[s.source], reading: s.reading })),
    fix: fix && {
      title: fix.title,
      detail: fix.detail,
      savesUSD: fix.saved,
      worksInMinutes: fix.effectMin,
      mustBeDoneBeforeMinutes: target?.fallAtMin ?? 0,
    },
  };
}

async function askAI(kind: 'explain' | 'workOrder', alert: Alert, fix?: ScoredFix) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    // Relative URL: in development this hits the Metro dev server on your laptop.
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, facts: factsFor(alert, fix) }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`AI route ${res.status}`);
    const { text } = (await res.json()) as { text?: string };
    if (!text) throw new Error('AI returned no text');
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

function cached(key: string, load: () => Promise<string>, fallback: () => string) {
  let entry = cache.get(key);
  if (!entry) {
    entry = load()
      .then((text): AIText => ({ text, source: 'ai' }))
      .catch((err): AIText => {
        cache.delete(key); // don't cache failures; try the AI again next time
        console.warn('[ai] falling back to template:', err);
        return { text: fallback(), source: 'template' };
      });
    cache.set(key, entry);
  }
  return entry;
}

/** Cache key that changes when the alert's numbers change (live data keeps updating). */
function dataKey(alert: Alert) {
  return `${alert.id}:${Math.round(alert.chain[0].fallAtMin / 5)}:${alert.costAtRisk}`;
}

/** Plain-English summary of an alert. */
export function explainAlert(alert: Alert): Promise<AIText> {
  return cached(`explain:${dataKey(alert)}`, () => askAI('explain', alert), () => alert.explanation);
}

/** Work order for the technician who carries out `fix`. */
export function draftWorkOrder(alert: Alert, fix: ScoredFix): Promise<AIText> {
  return cached(
    `workOrder:${dataKey(alert)}:${fix.id}`,
    () => askAI('workOrder', alert, fix),
    () => templateWorkOrder(alert, fix)
  );
}

/** Template work order (fallback when the AI is unavailable). */
function templateWorkOrder(alert: Alert, fix: ScoredFix): string {
  const b = getBuilding(alert.buildingId);
  const target = alert.chain.find((d) => d.id === fix.stopsAtDominoId);
  return [
    `WORK ORDER: ${b?.name ?? alert.buildingId}`,
    `Issue: ${alert.title}`,
    `Action: ${fix.title}`,
    `Details: ${fix.detail}`,
    `Must be done before: ${target?.label} falls (~${formatMinutes(target?.fallAtMin ?? 0)} from detection)`,
    `What we know:`,
    ...alert.signals.map((s) => `  • ${s.reading}`),
    `Protects: ${formatUSD(fix.saved)} of downstream impact.`,
  ].join('\n');
}
