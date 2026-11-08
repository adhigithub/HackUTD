/**
 * BluePrint's math. Plain code, no AI: the numbers are always consistent and
 * checkable. The (mock) AI only explains what this produces.
 *
 *  - Detection rules (spec §5): trend prediction, panel risk score, HVAC waste.
 *  - Domino engine (spec §8 ③): walk the chain, add delays and costs.
 *  - Fix picker (spec §8 ④): re-run the chain as if each fix happened.
 */
import type { Domino, DominoDef, FixDef, ScoredFix } from './types';

// ─── Detection rules ────────────────────────────────────────────────────────

export type Reading = { minute: number; value: number };

/** Least-squares straight line through the readings. Slope is units per minute. */
export function fitLine(readings: Reading[]) {
  const n = readings.length;
  const meanX = readings.reduce((s, r) => s + r.minute, 0) / n;
  const meanY = readings.reduce((s, r) => s + r.value, 0) / n;
  let num = 0;
  let den = 0;
  for (const r of readings) {
    num += (r.minute - meanX) * (r.value - meanY);
    den += (r.minute - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: meanY - slope * meanX };
}

/**
 * Scenario 3: time until a rising value hits its limit.
 * (limit − current) ÷ rate of rise. Infinity if it isn't rising.
 */
export function predictTimeToLimit(readings: Reading[], limit: number) {
  const { slope } = fitLine(readings);
  const current = readings[readings.length - 1].value;
  const ratePer10Min = slope * 10;
  const minutesToLimit = slope > 0 ? Math.max(0, (limit - current) / slope) : Infinity;
  return { current, ratePer10Min, minutesToLimit };
}

export type PanelSigns = {
  dipsOver5PctLast24h: number;
  tempAboveNormal: boolean;
  inspectionOverdue: boolean;
  stormForecast: boolean;
};

/** Scenario 2: add points for each warning sign. ≥ 70 = high risk. */
export function panelRiskScore(signs: PanelSigns) {
  const parts: { label: string; points: number }[] = [];
  if (signs.dipsOver5PctLast24h >= 3) parts.push({ label: 'Repeated voltage dips', points: 30 });
  if (signs.tempAboveNormal) parts.push({ label: 'Panel running hot', points: 30 });
  if (signs.inspectionOverdue) parts.push({ label: 'Inspection overdue', points: 20 });
  if (signs.stormForecast) parts.push({ label: 'Storm forecast', points: 20 });
  const score = parts.reduce((s, p) => s + p.points, 0);
  return { score, parts, highRisk: score >= 70 };
}

export type HvacState = {
  hvacOn: boolean;
  occupants: number;
  outsideLeaseHours: boolean;
  minutesInState: number;
  kW: number;
  hoursUntilOpen: number;
  pricePerKWh: number;
};

/**
 * Scenario 1: HVAC on + nobody there + after hours + on for a while → waste.
 * `confirmMinutes` is how long it must stay that way (spec: 30). The live demo
 * passes 0 so a single edited reading triggers it.
 */
export function detectHvacWaste(s: HvacState, confirmMinutes = 30) {
  const isWaste =
    s.hvacOn && s.occupants === 0 && s.outsideLeaseHours && s.minutesInState >= confirmMinutes;
  const costPerNight = s.kW * s.hoursUntilOpen * s.pricePerKWh;
  return { isWaste, costPerNight, costPerYear: costPerNight * 365 };
}

// ─── Domino engine ──────────────────────────────────────────────────────────

/**
 * Walks the chain from the first domino. `firstFallMin` overrides the first
 * domino's delay (it usually comes from a detection rule, e.g. time-to-limit).
 */
export function runChain(defs: DominoDef[], firstFallMin?: number): Domino[] {
  let t = 0;
  let total = 0;
  return defs.map((d, i) => {
    t += i === 0 && firstFallMin !== undefined ? firstFallMin : d.delayMin;
    total += d.cost;
    return { ...d, fallAtMin: Math.round(t), cumulativeCost: total };
  });
}

/** $ protected if the chain is stopped at (and including) domino `index`. */
export function protectedCost(chain: Domino[], index: number) {
  return chain.slice(index).reduce((s, d) => s + d.cost, 0);
}

// ─── Fix picker ─────────────────────────────────────────────────────────────

/**
 * Scores every fix by re-running the chain as if it happened: a fix only counts
 * if it lands before its domino falls. Best = most $ saved per unit of effort,
 * ties go to the fix that stops the chain earliest.
 */
export function pickFixes(chain: Domino[], fixes: FixDef[]): ScoredFix[] {
  return fixes
    .map((f) => {
      const index = chain.findIndex((d) => d.id === f.stopsAtDominoId);
      const feasible = index !== -1 && f.effectMin < chain[index].fallAtMin;
      const saved = feasible ? protectedCost(chain, index) : 0;
      // Earlier stops get a small bonus so ties favour the first domino.
      const score = feasible ? saved / f.effort + (chain.length - index) : -1;
      return { ...f, feasible, saved, score };
    })
    .sort((a, b) => b.score - a.score);
}

/** Simulation helper: what state is each domino in at `simMin` minutes after detection? */
export type DominoState = 'ok' | 'at_risk' | 'fallen' | 'protected';

export function dominoStateAt(
  chain: Domino[],
  index: number,
  simMin: number,
  stoppedAtIndex: number | null
): DominoState {
  if (stoppedAtIndex !== null && index >= stoppedAtIndex) return 'protected';
  const d = chain[index];
  if (simMin >= d.fallAtMin) return 'fallen';
  const prevFall = index === 0 ? 0 : chain[index - 1].fallAtMin;
  // At risk once the domino before it has fallen, or within 30 min of falling.
  if (simMin >= prevFall || d.fallAtMin - simMin <= 30) return 'at_risk';
  return 'ok';
}

export function lostAt(chain: Domino[], simMin: number, stoppedAtIndex: number | null) {
  return chain.reduce(
    (s, d, i) =>
      (stoppedAtIndex === null || i < stoppedAtIndex) && simMin >= d.fallAtMin ? s + d.cost : s,
    0
  );
}
