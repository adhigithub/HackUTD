import type { TemperatureReading } from '@/data/buildings';

/**
 * Time-to-danger math. Mock readings carry a rate (°F/hr) and the time they
 * were read, so the countdown keeps moving between readings like a live feed.
 */

function hoursSinceRead(t: TemperatureReading, now: number) {
  return t.readAt ? Math.max(0, (now - Date.parse(t.readAt)) / 3_600_000) : 0;
}

/** Where the temperature should be by now at its current rate. */
export function projectedTemp(t: TemperatureReading, now: number) {
  if (!t.ratePerHourF) return t.currentF;
  return t.currentF + t.ratePerHourF * hoursSinceRead(t, now);
}

/**
 * Minutes until this reading crosses its danger line at the current rate.
 * null = not heading there. Negative = already over.
 */
export function minutesToDanger(t: TemperatureReading, now: number) {
  if (!t.ratePerHourF || t.ratePerHourF <= 0) return null;
  return ((t.dangerF - projectedTemp(t, now)) / t.ratePerHourF) * 60;
}

/** The reading that will hit its danger line soonest, within `withinMin`. */
export function soonestDanger(temps: TemperatureReading[], now: number, withinMin = 120) {
  let best: { reading: TemperatureReading; minutes: number } | null = null;
  for (const reading of temps) {
    const minutes = minutesToDanger(reading, now);
    if (minutes === null || minutes > withinMin) continue;
    if (!best || minutes < best.minutes) best = { reading, minutes };
  }
  return best;
}

/** 19.7 → "19:42" (mm:ss), 75 → "1:15:00". */
export function formatCountdown(minutes: number) {
  const total = Math.max(0, Math.round(minutes * 60));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** 78.04 → "78.0", 71 → "71". */
export function formatTemp(f: number) {
  return Number.isInteger(f) ? String(f) : f.toFixed(1);
}
