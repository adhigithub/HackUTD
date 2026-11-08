/**
 * Root-cause grouping for the Home screen's "By root cause" view.
 *
 * Alert A is a ROOT CAUSE of alert B when B's first step (domino) appears later
 * in A's chain, in the same building. Example: Panel B's chain runs
 *   Power Panel B → Cooling Unit 2 → Server Room 2 → …
 * and the Server Room 2 alert starts at Cooling Unit 2, so Panel B is upstream:
 * if Panel B fails, it causes the Server Room 2 problem too.
 *
 * Plain code, no AI: the links come straight from the chains in the data.
 */
import type { Alert } from './types';

export type RootCauseGroup = {
  root: Alert;
  /** Alerts this root also causes, in chain order. */
  causes: Alert[];
  /** $ at risk across the whole group, with shared steps counted once. */
  totalAtRisk: number;
  /** How many of `causes` the root's recommended fix also protects. */
  protectedByRootFix: number;
};

/** Index of `child`'s first step inside `parent`'s chain (-1 if not downstream). */
function downstreamIndex(parent: Alert, child: Alert) {
  if (parent.id === child.id || parent.buildingId !== child.buildingId) return -1;
  const i = parent.chain.findIndex((d) => d.id === child.chain[0]?.id);
  return i > 0 ? i : -1; // i === 0 would mean they start at the same place (not upstream)
}

/** Every distinct step across the alerts, each counted once (highest cost wins). */
function unionCost(alerts: Alert[]) {
  const byStep = new Map<string, number>();
  for (const a of alerts) {
    for (const d of a.chain) byStep.set(d.id, Math.max(byStep.get(d.id) ?? 0, d.cost));
  }
  return [...byStep.values()].reduce((s, c) => s + c, 0);
}

export function groupByRootCause(alerts: Alert[]): RootCauseGroup[] {
  // Each alert's direct parent: the upstream alert whose chain it starts in.
  // If several qualify, pick the one furthest upstream (child starts latest in its chain).
  const parent = new Map<string, Alert>();
  for (const child of alerts) {
    let best: { a: Alert; i: number } | null = null;
    for (const a of alerts) {
      const i = downstreamIndex(a, child);
      if (i > 0 && (!best || i > best.i)) best = { a, i };
    }
    if (best) parent.set(child.id, best.a);
  }

  // Walk up to the top-most root (guarding against loops in odd data).
  const rootOf = (a: Alert) => {
    const seen = new Set<string>();
    let cur = a;
    while (parent.has(cur.id) && !seen.has(cur.id)) {
      seen.add(cur.id);
      cur = parent.get(cur.id)!;
    }
    return cur;
  };

  const groups = new Map<string, Alert[]>();
  for (const a of alerts) {
    const root = rootOf(a);
    groups.set(root.id, [...(groups.get(root.id) ?? []), a]);
  }

  return [...groups.entries()]
    .map(([rootId, members]) => {
      const root = members.find((m) => m.id === rootId)!;
      const causes = members
        .filter((m) => m.id !== rootId)
        .sort((x, y) => downstreamIndex(root, x) - downstreamIndex(root, y));
      const fix = root.fixes.find((f) => f.feasible);
      const stopAt = fix ? root.chain.findIndex((d) => d.id === fix.stopsAtDominoId) : -1;
      const protectedByRootFix =
        stopAt < 0 ? 0 : causes.filter((c) => downstreamIndex(root, c) >= stopAt).length;
      return { root, causes, totalAtRisk: unionCost(members), protectedByRootFix };
    })
    .sort((a, b) => b.totalAtRisk - a.totalAtRisk);
}
