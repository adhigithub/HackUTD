import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import type { PowerReading } from '@/data/buildings';
import { useTheme } from '@/hooks/use-theme';
import { STALE_TEST_DAYS, type Level } from '@/lib/incidents/plain-status';

import { StatusChip } from './status-chip';

type Verdict = { level: Level; headline: string; why: string };

function verdictFor(power: PowerReading): Verdict | null {
  const b = power.backup;
  if (!b) return null;

  if (b.batteryRuntimeMin * 60 <= b.generatorStartSec) {
    return {
      level: 'act',
      headline: 'Not covered',
      why: 'The battery would run out before the generator starts, and the servers would shut off.',
    };
  }
  const weakBattery = b.batteryRuntimeMin < b.ratedRuntimeMin * 0.6;
  const staleTest = b.generatorLastTestDaysAgo > STALE_TEST_DAYS;
  if (weakBattery || staleTest) {
    return {
      level: 'watch',
      headline: 'Covered, but cutting it close',
      why: weakBattery
        ? `If the generator doesn’t start on the first try, the battery only gives the team about ${b.batteryRuntimeMin} minutes to fix it. A healthy battery would give them ${b.ratedRuntimeMin}.`
        : `The generator hasn’t been started in ${b.generatorLastTestDaysAgo} days, so nobody knows for sure it will work.`,
    };
  }
  return {
    level: 'good',
    headline: 'Covered',
    why: `The battery has plenty of time to spare, and the generator was tested ${b.generatorLastTestDaysAgo} days ago.`,
  };
}

/**
 * "If the power went out right now, would we be OK?" It's the question every
 * data center team worries about, answered step by step in plain words.
 */
export function BackupPowerCard({ power }: { power: PowerReading }) {
  const theme = useTheme();
  const b = power.backup;
  const verdict = verdictFor(power);
  if (!b || !verdict) return null;

  const runtimePct = Math.min(100, (b.batteryRuntimeMin / b.ratedRuntimeMin) * 100);
  const batteryTone: ThemeColor = runtimePct < 60 ? 'danger' : runtimePct < 85 ? 'warning' : 'success';
  const staleTest = b.generatorLastTestDaysAgo > STALE_TEST_DAYS;

  const steps: { when: string; what: string; note?: string; noteTone?: ThemeColor }[] = [
    { when: 'Start', what: 'Power from the city goes out' },
    {
      when: 'Instantly',
      what: 'The backup battery takes over',
      note: `It can keep everything running for about ${b.batteryRuntimeMin} min (${b.batteryHealthPct}% health)`,
      noteTone: batteryTone === 'success' ? 'textSecondary' : batteryTone,
    },
    {
      when: `${b.generatorStartSec} sec`,
      what: 'The generator starts and takes over from the battery',
      note: staleTest
        ? `Last tested ${b.generatorLastTestDaysAgo} days ago. It should be tested every month.`
        : `Last tested ${b.generatorLastTestDaysAgo} days ago`,
      noteTone: staleTest ? 'warning' : 'textSecondary',
    },
    { when: 'Then', what: `Enough fuel to run for about ${b.fuelHours} hours` },
  ];

  return (
    <Card>
      <View style={styles.header}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          BACKUP POWER
        </ThemedText>
        <StatusChip level={verdict.level} />
      </View>

      <ThemedText type="subtitle">If the power went out right now…</ThemedText>
      <ThemedText themeColor="textSecondary">{verdict.headline}.</ThemedText>

      <View style={styles.steps}>
        {steps.map((s, i) => (
          <View key={i} style={styles.step}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.when}>
              {s.when}
            </ThemedText>
            <View style={[styles.rail, { backgroundColor: theme.border }]}>
              <View style={[styles.dot, { backgroundColor: theme.primary }]} />
            </View>
            <View style={styles.stepText}>
              <ThemedText type="small">{s.what}</ThemedText>
              {s.note && (
                <ThemedText type="small" themeColor={s.noteTone}>
                  {s.note}
                </ThemedText>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* Battery time vs. what a healthy battery would give */}
      <View style={styles.meterLabelRow}>
        <ThemedText type="small" themeColor="textSecondary">
          Battery time in an outage
        </ThemedText>
        <ThemedText type="smallBold" themeColor={batteryTone}>
          {b.batteryRuntimeMin} of {b.ratedRuntimeMin} min
        </ThemedText>
      </View>
      <View style={[styles.meter, { backgroundColor: theme.backgroundSelected }]}>
        <View
          style={[styles.meterFill, { width: `${runtimePct}%`, backgroundColor: theme[batteryTone] }]}
        />
      </View>

      <ThemedText type="small">{verdict.why}</ThemedText>
      {b.gridRisk && (
        <ThemedText type="small" themeColor="warning">
          ⛈ {b.gridRisk}
        </ThemedText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  steps: { marginVertical: Spacing.one },
  step: { flexDirection: 'row', alignItems: 'stretch', gap: Spacing.two, minHeight: 36 },
  when: { width: 64, textAlign: 'right' },
  rail: { width: 2, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  stepText: { flex: 1, paddingBottom: Spacing.two },
  meterLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  meter: { height: 8, borderRadius: Radius.pill, overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: Radius.pill },
});
