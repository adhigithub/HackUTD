import { createContext, useContext, useEffect, useState } from 'react';

/**
 * One shared "now" for everything time-based on a screen (countdowns,
 * "unclaimed for 4 min", "5 min ago"). Live mode passes the real time;
 * the live demo passes its own fast-forwarded clock.
 */
const NowContext = createContext<number | null>(null);

export const NowProvider = NowContext.Provider;

/** The screen's current time, or the real time if no provider is above. */
export function useNow() {
  const fromScreen = useContext(NowContext);
  const [mountedAt] = useState(() => Date.now());
  return fromScreen ?? mountedAt;
}

/** Re-renders every `intervalMs` and returns the real time. */
export function useTicker(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
