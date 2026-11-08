/**
 * Talks to the Supabase backend:
 *   - readings      sensor numbers (edit these to cause / clear a breakage)
 *   - fixes_applied fixes people approved in the app
 *
 * Everything here throws on failure; alerts-context decides when to fall back
 * to the built-in demo data.
 */
import { supabase } from '@/lib/backend/supabase';

import type { ReadingRow } from './readings';

export const backendConfigured = supabase !== null;

export type FixRow = {
  alert_id: string;
  fix_id: string;
  applied_by: string;
  saved_usd: number;
  applied_at: string;
};

function client() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

/** Readings from the last week (detection mostly looks at the latest ones). */
export async function fetchReadings(): Promise<ReadingRow[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();
  const { data, error } = await client()
    .from('readings')
    .select('asset_id, metric, value, recorded_at')
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: false }) // newest first, so the limit drops the oldest
    .limit(5000);
  if (error) throw error;
  return (data ?? []) as ReadingRow[]; // ReadingStore sorts them by time
}

export async function fetchFixes(): Promise<FixRow[]> {
  const { data, error } = await client()
    .from('fixes_applied')
    .select('alert_id, fix_id, applied_by, saved_usd, applied_at')
    .order('applied_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, saved_usd: Number(r.saved_usd) })) as FixRow[];
}

export async function saveFix(row: Omit<FixRow, 'applied_at'>) {
  const { error } = await client().from('fixes_applied').insert(row);
  if (error) throw error;
}

/**
 * Calls `onChange` whenever readings or fixes are added, edited or deleted
 * (live push), and also every `pollMs` as a safety net (live push doesn't
 * report `truncate`, e.g. when the demo is reset). Returns a stop function.
 */
export function watchBackend(onChange: () => void, pollMs = 15_000) {
  const sb = client();
  const channel = sb
    .channel('blueprint-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'readings' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'fixes_applied' }, onChange)
    .subscribe();
  const timer = setInterval(onChange, pollMs);
  return () => {
    clearInterval(timer);
    sb.removeChannel(channel);
  };
}
