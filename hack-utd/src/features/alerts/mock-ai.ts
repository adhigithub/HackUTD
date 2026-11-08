/**
 * MOCK "AI" layer. Stands in for the LLM calls described in the spec (§8 ⑤).
 *
 * The numbers all come from engine.ts (plain code). This module only:
 *   1. runs the detection rules over the fake data (as if a model flagged them),
 *   2. writes plain-English explanations and work orders from templates,
 *   3. adds a fake latency + confidence so the UI behaves like a real AI call.
 * Swap these functions for real API calls later; the screens won't change.
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
import type { Alert, AutoFix, Domino, ScoredFix } from './types';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type ScanResult = { alerts: Alert[]; autoFixes: AutoFix[]; scannedAt: number };

export async function scanPortfolio(): Promise<ScanResult> {
  await wait(900); // pretend we're calling a model
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

/** Template "LLM" explanation built from the engine's output. Two short sentences. */
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

/** Mock AI-written work order for the technician. */
export async function draftWorkOrder(alert: Alert, fix: ScoredFix): Promise<string> {
  await wait(500);
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
