/**
 * Supabase connection (the live backend for sensor readings and applied fixes).
 *
 * Uses the PUBLISHABLE key, which is designed to ship in the app; the tables'
 * row-level-security rules limit it to reading, and adding readings/fixes.
 * Never put the secret key or the database password here.
 *
 * If the env vars are missing, `supabase` is null and the app falls back to
 * its built-in demo data.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Accept either the base URL or one copied with the REST path on the end.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        // We use BluePrint's own local login, not Supabase Auth, so no session storage.
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      })
    : null;
