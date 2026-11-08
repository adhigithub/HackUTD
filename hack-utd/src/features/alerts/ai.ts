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
import { formatMinutes, formatUSD, formatUSDCompact } from './format';
import {
  emptyFloorHvac,
  freezerDrift,
  getBuilding,
  panelFailures,
  serverRoomOverheat,
} from './mock-data';
import { SOURCE_LABELS, type Alert, type AutoFix, type Domino, type ScoredFix } from './types';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type ScanResult = { alerts: Alert[]; autoFixes: AutoFix[]; scannedAt: number };

export async function scanPortfolio(): Promise<ScanResult> {
  await wait(900); // simulates reading from the building systems
  const now = Date.now();
  const alerts: Alert[] = [];

  // Scenario 3 — trend prediction
  {
    const s = serverRoomOverheat;
    const trend = predictTimeToLimit(s.readings, s.limitF);
    const chain = runChain(s.chain, Math.max(5, trend.minutesToLimit - s.coolingToRoomDelay));
    alerts.push(
      finish({
        id: s.id,
        buildingId: s.buildingId,
        kind: 'overheat',
        title: s.title,
        asset: s.asset,
        location: s.location,
        detectedAt: now,
        metric: `${trend.current}°F · +${trend.ratePer10Min.toFixed(1)}°F / 10 min · limit ${s.limitF}°F`,
        signals: s.signals,
        chain,
        fixes: pickFixes(chain, s.fixes),
        confidence: 0.91,
      })
    );
  }

  // Scenario 2 — panel risk score, same problem in two building types
  for (const p of panelFailures) {
    const risk = panelRiskScore(p.signs);
    if (!risk.highRisk) continue;
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
        metric: `Risk score ${risk.score}/100 · ${risk.parts.map((x) => x.label).join(', ')}`,
        signals: p.signals,
        chain,
        fixes: pickFixes(chain, p.fixes),
        confidence: 0.84,
      })
    );
  }

  // Slower trend → a "watch" alert
  {
    const s = freezerDrift;
    const trend = predictTimeToLimit(s.readings, s.limitF);
    const chain = runChain(s.chain, trend.minutesToLimit);
    alerts.push(
      finish({
        id: s.id,
        buildingId: s.buildingId,
        kind: 'overheat',
        title: s.title,
        asset: s.asset,
        location: s.location,
        detectedAt: now,
        metric: `${trend.current}°F · +${trend.ratePer10Min.toFixed(1)}°F / 10 min · limit ${s.limitF}°F`,
        signals: s.signals,
        chain,
        fixes: pickFixes(chain, s.fixes),
        confidence: 0.77,
      })
    );
  }

  // Scenario 1 — waste rule. Safe + reversible, so it's fixed automatically.
  const autoFixes: AutoFix[] = [];
  const waste = detectHvacWaste(emptyFloorHvac.state);
  if (waste.isWaste) {
    const b = getBuilding(emptyFloorHvac.buildingId);
    autoFixes.push({
      id: emptyFloorHvac.id,
      buildingId: emptyFloorHvac.buildingId,
      title: `${b?.name} ${emptyFloorHvac.floor} switched to unoccupied mode`,
      detail:
        `HVAC was cooling an empty floor after hours. BluePrint set it back to 78°F; ` +
        `it switches back instantly if anyone badges in.`,
      at: emptyFloorHvac.at,
      savedPerNight: waste.costPerNight,
      savedPerYear: waste.costPerYear,
      signals: emptyFloorHvac.signals,
      undone: false,
    });
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

/** Plain-English summary of an alert. */
export function explainAlert(alert: Alert): Promise<AIText> {
  return cached(`explain:${alert.id}`, () => askAI('explain', alert), () => alert.explanation);
}

/** Work order for the technician who carries out `fix`. */
export function draftWorkOrder(alert: Alert, fix: ScoredFix): Promise<AIText> {
  return cached(
    `workOrder:${alert.id}:${fix.id}`,
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
