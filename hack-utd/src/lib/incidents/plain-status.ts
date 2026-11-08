import type { ThemeColor } from '@/constants/theme';
import type { Building, TemperatureReading } from '@/data/buildings';

import { minutesToDanger, projectedTemp } from './forecast';

/**
 * Turns raw readings into three plain words anyone can act on:
 * "All good", "Keep an eye on it", or "Needs attention", plus a sentence why.
 * Every card on the Data tab uses these so they always agree.
 */

export type Level = 'good' | 'watch' | 'act';

export const LEVELS: Record<Level, { label: string; tone: ThemeColor; icon: string }> = {
  good: { label: 'All good', tone: 'success', icon: '✓' },
  watch: { label: 'Keep an eye on it', tone: 'warning', icon: '!' },
  act: { label: 'Needs attention', tone: 'danger', icon: '!!' },
};

const RANK: Record<Level, number> = { good: 0, watch: 1, act: 2 };
export const worst = (levels: Level[]) =>
  levels.reduce<Level>((a, b) => (RANK[b] > RANK[a] ? b : a), 'good');

/** A generator that hasn't been started in this long is a question mark. */
export const STALE_TEST_DAYS = 30;

export function hvacLevel(b: Building): Level {
  return b.hvac.status === 'on' && b.occupancy.peopleNow === 0 ? 'watch' : 'good';
}

export function powerLevel(b: Building): Level {
  const p = b.power;
  if (p.voltageHealth === 'critical' || p.backupPower === 'weak') return 'act';
  if (p.voltageHealth === 'dipping') return 'watch';
  return 'good';
}

export function tempLevel(t: TemperatureReading, now: number): Level {
  const current = projectedTemp(t, now);
  const toDanger = minutesToDanger(t, now);
  if (current >= t.dangerF || (toDanger !== null && toDanger <= 60)) return 'act';
  if (t.trend === 'rising' || t.dangerF - current <= 3) return 'watch';
  return 'good';
}

export type Reason = { level: Level; text: string };

/** Overall verdict for a building, with the reasons behind it (worst first). */
export function buildingSummary(b: Building, now: number): { level: Level; reasons: Reason[] } {
  const reasons: Reason[] = [];

  for (const t of b.temperatures) {
    const level = tempLevel(t, now);
    if (level === 'act') {
      reasons.push({
        level,
        text:
          projectedTemp(t, now) >= t.dangerF
            ? `${t.label} is too hot`
            : `${t.label} is getting too hot`,
      });
    } else if (level === 'watch') {
      reasons.push({ level, text: `${t.label} is warming up` });
    }
  }

  const p = b.power;
  if (p.backupPower === 'weak') reasons.push({ level: 'act', text: 'Backup power is weak' });
  if (p.voltageHealth === 'critical') reasons.push({ level: 'act', text: 'The power supply is unstable' });
  else if (p.voltageHealth === 'dipping') {
    reasons.push({
      level: 'watch',
      text: `The power flickered ${p.voltageDipsToday} time${p.voltageDipsToday === 1 ? '' : 's'} today`,
    });
  }
  if (p.backup && p.backup.generatorLastTestDaysAgo > STALE_TEST_DAYS) {
    reasons.push({
      level: 'watch',
      text: `The backup generator hasn’t been tested in ${p.backup.generatorLastTestDaysAgo} days`,
    });
  }

  if (hvacLevel(b) === 'watch') {
    reasons.push({ level: 'watch', text: 'Air conditioning is running in an empty building' });
  }

  reasons.sort((x, y) => RANK[y.level] - RANK[x.level]);
  return { level: worst(reasons.map((r) => r.level)), reasons };
}
