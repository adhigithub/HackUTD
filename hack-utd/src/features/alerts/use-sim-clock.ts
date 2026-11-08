import { useEffect, useState } from 'react';

/** Simulated minutes per real second while the simulation plays. */
const PLAY_SPEED = 15;
const TICK_MS = 100;

/**
 * Fast-forward clock for "what if we wait?". Starts at 0 (now) and plays up
 * to `endMin`, then stops by itself.
 */
export function useSimClock(endMin: number) {
  const [simMin, setSimMin] = useState(0);
  const [playing, setPlaying] = useState(false);
  const finished = simMin >= endMin;
  const isPlaying = playing && !finished;

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setSimMin((m) => Math.min(endMin, m + (PLAY_SPEED * TICK_MS) / 1000));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [isPlaying, endMin]);

  return {
    simMin,
    playing: isPlaying,
    started: simMin > 0,
    finished,
    play: () => setPlaying(true),
    pause: () => setPlaying(false),
    reset: () => {
      setPlaying(false);
      setSimMin(0);
    },
  };
}
