import { useCallback, useState } from 'react';

import {
  getBuilding,
  type Alert,
  type Building,
  type TemperatureReading,
  type TimelineEvent,
} from '@/data/buildings';
import { TEAM } from '@/data/team';
import { useTicker } from '@/lib/time/now';

/**
 * Live demo: a scripted overnight incident at Dallas DC-2, told in about a
 * minute. Each "beat" is a snapshot of the building at a moment in the story.
 * Between beats the clock fast-forwards, so the countdown moves like it would
 * in real life, just quicker.
 *
 * The story: a storm makes the power flicker, which knocks out a cooling unit.
 * The app spots the room warming before it's too hot, the manager gets paged,
 * Tom fixes it, and leaves a note for the next shift.
 */

export type DemoMood = 'calm' | 'warning' | 'danger' | 'relief';

export type DemoBeat = {
  /** Story minutes after 2:10 AM. */
  t: number;
  headline: string;
  caption: string;
  mood: DemoMood;
  building: Building;
  /** Problems the app has spotted (feed the countdown's "What to do" and the timeline). */
  alerts: Alert[];
  /** Shown on the final beat. */
  recap?: { label: string; value: string }[];
};

/** Real milliseconds each beat stays on screen. */
const BEAT_MS = 7000;

const DEMO_ALERT_ID = 'demo-sr2-heat';

function buildBeats(base: number): DemoBeat[] {
  const at = (min: number) => new Date(base + min * 60_000).toISOString();
  const real = getBuilding('dallas-dc-2')!;

  // ── Pieces that change from beat to beat ──
  const sr2 = (
    currentF: number,
    t: number,
    ratePerHourF: number,
    history: number[]
  ): TemperatureReading => ({
    label: 'Server Room 2',
    currentF,
    dangerF: 80,
    trend: ratePerHourF > 0 ? 'rising' : ratePerHourF < 0 ? 'falling' : 'steady',
    ratePerHourF,
    readAt: at(t),
    history,
    relatedAlertId: DEMO_ALERT_ID,
  });

  const otherRooms = real.temperatures.filter((r) => r.label !== 'Server Room 2');
  const linked = [DEMO_ALERT_ID];

  const events: TimelineEvent[] = [
    {
      id: 'd-handoff',
      at: at(-130),
      category: 'people',
      title: 'Shift change: Jordan hands over to Tom',
      detail: '“Cooling unit 2 sounded rough around 11. Might be nothing. Keep an ear on it.”',
      who: TEAM.jordan.name,
      relatedTo: linked,
    },
    {
      id: 'd-rounds',
      at: at(-8),
      category: 'people',
      title: 'Walk-through done. Everything looks fine.',
      detail: 'Tom heads to Hall B to replace a fan.',
      who: TEAM.tom.name,
    },
    {
      id: 'd-storm',
      at: at(3),
      category: 'weather',
      title: 'A storm passes over downtown Dallas',
      source: 'Weather',
      relatedTo: linked,
    },
    {
      id: 'd-dip',
      at: at(4),
      category: 'power',
      title: 'Power flickered for less than a second',
      detail: 'The backup battery kept everything running.',
      source: 'Panel sensor',
      relatedTo: linked,
    },
    {
      id: 'd-crac2-off',
      at: at(5),
      category: 'cooling',
      title: 'Cooling unit 2 shut off after the flicker',
      source: 'BMS',
      relatedTo: linked,
    },
    {
      id: 'd-page',
      at: at(15),
      category: 'people',
      title: 'Maya, the on-call manager, gets a text',
      detail: 'Nobody had responded for 5 minutes, so the app texted the manager.',
      who: TEAM.maya.name,
      relatedTo: linked,
    },
    {
      id: 'd-ping',
      at: at(16),
      category: 'people',
      title: '“Tom, Server Room 2 is warming up. Can you take a look?”',
      who: TEAM.maya.name,
      relatedTo: linked,
    },
    {
      id: 'd-omw',
      at: at(17),
      category: 'people',
      title: '“On it. 2 minutes away.”',
      who: TEAM.tom.name,
      relatedTo: linked,
    },
    {
      id: 'd-found',
      at: at(20),
      category: 'people',
      title: '“Jordan was right. Cooling unit 2 is stuck. Turning on the spare.”',
      who: TEAM.tom.name,
      relatedTo: linked,
    },
    {
      id: 'd-crac4-on',
      at: at(20.5),
      category: 'cooling',
      title: 'Spare cooling unit switched on',
      source: 'BMS',
      relatedTo: linked,
    },
    {
      id: 'd-peak',
      at: at(22),
      category: 'cooling',
      title: 'Server Room 2 topped out at 79°F, 1° below the safe limit',
      source: 'Temp sensor',
      relatedTo: linked,
    },
    {
      id: 'd-crac2-reset',
      at: at(23),
      category: 'cooling',
      title: 'Cooling unit 2 restarted and working again',
      source: 'BMS',
      relatedTo: linked,
    },
    {
      id: 'd-done',
      at: at(32),
      category: 'people',
      title: 'Problem fixed',
      who: TEAM.tom.name,
      relatedTo: linked,
    },
    {
      id: 'd-note',
      at: at(33),
      category: 'people',
      title:
        '“Note for the day shift: cooling unit 2 shuts off when the power flickers. I called the repair company. Leaving the spare on until they come.”',
      who: TEAM.tom.name,
      relatedTo: linked,
    },
  ];
  /** Only the events that have happened by story minute `t`. */
  const timelineAt = (t: number) => events.filter((e) => Date.parse(e.at) <= base + t * 60_000);

  const alert: Alert = {
    id: DEMO_ALERT_ID,
    buildingId: real.id,
    title: 'Server Room 2 heating up',
    summary: 'Cooling unit 2 shut off after the power flickered. The room is warming about 1°F every 5 minutes.',
    severity: 'high',
    costAtRisk: 90_000,
    costAfterFix: 0,
    sources: ['Temp sensor', 'BMS', 'Panel sensor'],
    chain: [
      'Room goes past 80°F',
      'Servers slow down to protect themselves',
      'Servers shut off and customers notice',
    ],
    chainEta: ['in ~17 min', '+3 min', '+10 min'],
    fixSteps: ['Turn on the spare cooling unit, then restart cooling unit 2'],
    ifFixed: ['Room stays under 80°F', 'Servers keep running', 'Repair happens in daylight'],
    autoFix: false,
    detectedAt: at(10),
  };

  const building = (
    t: number,
    sr2Reading: TemperatureReading,
    power: Partial<Building['power']>
  ): Building => ({
    ...real,
    security: undefined, // keep the demo focused on one story
    power: { ...real.power, ...power },
    temperatures: [otherRooms[0], sr2Reading, ...otherRooms.slice(1)],
    occupancy: { ...real.occupancy, peopleNow: 3, lastBadgeSwipe: at(t - 6) },
    timeline: timelineAt(t),
  });

  const calmPower = { voltageHealth: 'normal' as const, voltageDipsToday: 0 };
  const dipPower = { voltageHealth: 'dipping' as const, voltageDipsToday: 1 };
  const quietHistory = [74.8, 75, 74.9, 75, 75.1, 75];

  return [
    {
      t: 0,
      mood: 'calm',
      headline: '2:10 AM. A quiet night at Dallas DC-2.',
      caption:
        'Tom is working the night shift. When Jordan handed over, he mentioned cooling unit 2 sounded rough, but everything looks fine, so Tom is replacing a fan in another room.',
      building: building(0, sr2(75, 0, 0, quietHistory), calmPower),
      alerts: [],
    },
    {
      t: 4,
      mood: 'calm',
      headline: 'A storm rolls over downtown.',
      caption:
        'The power flickers for less than a second. The backup battery catches it, and nobody inside even notices.',
      building: building(4, sr2(75, 4, 0, quietHistory), dipPower),
      alerts: [],
    },
    {
      t: 7,
      mood: 'warning',
      headline: 'That flicker shut off cooling unit 2.',
      caption:
        'Server Room 2 starts warming up. It’s not too hot yet, so an ordinary alarm would stay silent. The app is already counting down.',
      building: building(7, sr2(76, 7, 12, [75, 75, 75, 75.2, 75.6, 76]), dipPower),
      alerts: [],
    },
    {
      t: 10,
      mood: 'warning',
      headline: 'BluePrint puts two and two together.',
      caption:
        'Power flicker + cooling unit off + room warming = trouble. It raises a warning about 17 minutes before the room would be too hot.',
      building: building(10, sr2(76.6, 10, 12, [75, 75, 75.2, 75.6, 76, 76.6]), dipPower),
      alerts: [alert],
    },
    {
      t: 15,
      mood: 'danger',
      headline: 'Five minutes and no response.',
      caption:
        'Tom’s phone is in his pocket while he works. When nobody responds, the app texts Maya, the manager on call.',
      building: building(15, sr2(77.6, 15, 12, [75.2, 75.6, 76, 76.6, 77.1, 77.6]), dipPower),
      alerts: [alert],
    },
    {
      t: 17,
      mood: 'warning',
      headline: 'Maya calls Tom. He’s on his way.',
      caption:
        'Everyone can see who is handling it, so nobody gets sent twice and nobody assumes someone else has it.',
      building: building(17, sr2(78, 17, 12, [75.6, 76, 76.6, 77.1, 77.6, 78]), dipPower),
      alerts: [alert],
    },
    {
      t: 20,
      mood: 'warning',
      headline: 'Tom reaches Server Room 2.',
      caption:
        'Cooling unit 2 is stuck, just like Jordan suspected. Tom switches on the spare cooling unit and restarts the broken one.',
      building: building(20, sr2(78.6, 20, 12, [76.6, 77.1, 77.6, 78, 78.3, 78.6]), dipPower),
      alerts: [alert],
    },
    {
      t: 24,
      mood: 'relief',
      headline: 'Cold air is back.',
      caption:
        'Server Room 2 topped out at 79°F, one degree below the safe limit, and is cooling down fast.',
      building: building(24, sr2(78.4, 24, -20, [77.6, 78, 78.6, 79, 78.8, 78.4]), dipPower),
      alerts: [alert],
    },
    {
      t: 33,
      mood: 'relief',
      headline: 'Fixed, and written down.',
      caption:
        'Tom leaves a note for the morning shift, so the next person knows what happened and doesn’t have to start from scratch.',
      building: building(33, sr2(75.4, 33, 0, [79, 78.4, 77.5, 76.6, 75.9, 75.4]), dipPower),
      alerts: [alert],
      recap: [
        { label: 'Warning before it got too hot', value: '17 min' },
        { label: 'Time to get someone there', value: '10 min' },
        { label: 'Hottest it got (limit 80°F)', value: '79°F' },
        { label: 'Servers that went down', value: '0' },
        { label: 'Money saved', value: '≈ $90K' },
      ],
    },
  ];
}

type RunState = {
  base: number; // story time 0 (2:10 AM today), in ms
  beats: DemoBeat[];
  /** Real ms of playback before the last resume (across all beats). */
  playedBefore: number;
  /** Real time playback last resumed, or null while paused. */
  resumedAt: number | null;
};

/**
 * Plays the demo. The current beat is worked out from how long it has been
 * playing, so there's no timer to keep in sync. Ticks fast only while active.
 */
export function useLiveDemo() {
  const [run, setRun] = useState<RunState | null>(null);
  const realNow = useTicker(run && run.resumedAt !== null ? 250 : 60_000);

  const start = useCallback(() => {
    const base = new Date();
    base.setHours(2, 10, 0, 0);
    const ms = base.getTime();
    setRun({ base: ms, beats: buildBeats(ms), playedBefore: 0, resumedAt: Date.now() });
  }, []);

  const stop = useCallback(() => setRun(null), []);

  const togglePause = useCallback(() => {
    setRun((r) => {
      if (!r) return r;
      if (r.resumedAt === null) return { ...r, resumedAt: Date.now() };
      return { ...r, playedBefore: r.playedBefore + (Date.now() - r.resumedAt), resumedAt: null };
    });
  }, []);

  const goTo = useCallback(
    (index: number) =>
      setRun((r) =>
        r
          ? { ...r, playedBefore: index * BEAT_MS, resumedAt: r.resumedAt === null ? null : Date.now() }
          : r
      ),
    []
  );

  if (!run) {
    return { active: false as const, start };
  }

  const { beats } = run;
  const played = run.playedBefore + (run.resumedAt === null ? 0 : Math.max(0, realNow - run.resumedAt));
  const index = Math.min(beats.length - 1, Math.floor(played / BEAT_MS));
  const isLast = index === beats.length - 1;
  const elapsed = played - index * BEAT_MS; // time spent on this beat
  const beat = beats[index];

  // Story clock: slide from this beat's minute toward the next one's.
  const nextT = beats[index + 1]?.t;
  const progress = Math.min(1, elapsed / BEAT_MS);
  const storyMin = nextT === undefined ? beat.t + elapsed / 60_000 : beat.t + (nextT - beat.t) * progress;

  return {
    active: true as const,
    beat,
    index,
    count: beats.length,
    progress,
    paused: run.resumedAt === null,
    isLast,
    virtualNow: run.base + storyMin * 60_000,
    start,
    stop,
    togglePause,
    next: () => {
      if (!isLast) goTo(index + 1);
    },
    prev: () => {
      if (index > 0) goTo(index - 1);
    },
  };
}

export type LiveDemo = ReturnType<typeof useLiveDemo>;
