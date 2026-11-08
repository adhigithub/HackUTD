/**
 * Sensor readings, as rows (the same shape as the Supabase `readings` table),
 * plus helpers the detection code uses to ask questions about them.
 */
import type { Reading } from './engine';

export type ReadingRow = {
  asset_id: string;
  metric: string;
  value: number;
  recorded_at: string; // ISO timestamp
};

type Point = { t: number; value: number };

export class ReadingStore {
  private series_ = new Map<string, Point[]>();

  constructor(
    rows: ReadingRow[],
    readonly now: number
  ) {
    for (const r of rows) {
      const t = Date.parse(r.recorded_at);
      if (!Number.isFinite(t) || !Number.isFinite(r.value)) continue;
      const k = `${r.asset_id}:${r.metric}`;
      const list = this.series_.get(k) ?? [];
      list.push({ t, value: r.value });
      this.series_.set(k, list);
    }
    for (const list of this.series_.values()) list.sort((a, b) => a.t - b.t);
  }

  private points(asset: string, metric: string, windowMin: number) {
    const since = this.now - windowMin * 60_000;
    return (this.series_.get(`${asset}:${metric}`) ?? []).filter((p) => p.t >= since);
  }

  /** The latest readings from the past day (oldest first), as minutes relative to now (≤ 0). */
  series(asset: string, metric: string, { windowMin = 24 * 60, max = 7 } = {}): Reading[] {
    return this.points(asset, metric, windowMin)
      .slice(-max)
      .map((p) => ({ minute: (p.t - this.now) / 60_000, value: p.value }));
  }

  latest(asset: string, metric: string, windowMin = 24 * 60) {
    const pts = this.points(asset, metric, windowMin);
    return pts.length ? pts[pts.length - 1] : undefined;
  }

  count(asset: string, metric: string, test: (v: number) => boolean, windowMin = 24 * 60) {
    return this.points(asset, metric, windowMin).filter((p) => test(p.value)).length;
  }

  /** Typical value: median of everything except the newest reading. */
  baseline(asset: string, metric: string, windowMin = 24 * 60) {
    const values = this.points(asset, metric, windowMin)
      .slice(0, -1)
      .map((p) => p.value)
      .sort((a, b) => a - b);
    if (!values.length) return undefined;
    const mid = Math.floor(values.length / 2);
    return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
  }
}

/**
 * Built-in demo readings, used when the backend isn't reachable. They recreate
 * the original scenarios: every alert is "broken", so the demo still works offline.
 */
export function offlineRows(now: number): ReadingRow[] {
  const at = (minAgo: number) => new Date(now - minAgo * 60_000).toISOString();
  const hour = (asset: string, metric: string, values: number[]) =>
    values.map((value, i) => ({
      asset_id: asset,
      metric,
      value,
      recorded_at: at((values.length - 1 - i) * 10),
    }));
  return [
    ...hour('room2', 'temp_f', [72, 73, 74, 75, 76, 77, 78]),
    ...hour('panel-b', 'temp_f', [138, 139, 140]),
    ...hour('panel-b', 'voltage_dip_pct', [8, 8, 8]),
    ...hour('panel-3', 'temp_f', [138, 139, 140]),
    ...hour('panel-3', 'voltage_dip_pct', [8, 8, 8]),
    ...hour('freezer-f2', 'temp_f', [1.0, 1.3, 1.6, 1.9, 2.2, 2.5, 2.8]),
    ...hour('f4-ac', 'kw', [12, 12, 85]),
    ...hour('f4-ac', 'people', [0, 0, 0]),
  ];
}
