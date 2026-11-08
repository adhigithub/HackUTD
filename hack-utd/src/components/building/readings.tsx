import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { formatTimeAgo, type Building, type TemperatureReading } from '@/data/buildings';
import { formatTemp, minutesToDanger, projectedTemp } from '@/lib/incidents/forecast';
import { hvacLevel, LEVELS, powerLevel, tempLevel, worst, type Level } from '@/lib/incidents/plain-status';
import { useNow } from '@/lib/time/now';

import { Sparkline } from './sparkline';
import { StatusChip } from './status-chip';

/** An average US home uses about 1.2 kW, so "4,200 kW" ≈ "3,500 homes". */
const KW_PER_HOME = 1.2;

/**
 * The live readings for one building, written so anyone can read them:
 * each card says what it is in plain words and gives a one-line status.
 */
export function Readings({ building }: { building: Building }) {
  const { hvac, power, temperatures, occupancy } = building;
  const now = useNow();
  const wasting = hvacLevel(building) === 'watch';
  const homes = Math.round(power.currentKw / KW_PER_HOME / 100) * 100;

  return (
    <View style={styles.grid}>
      <ReadingCard
        title="Room temperatures"
        level={worst(temperatures.map((t) => tempLevel(t, now)))}
        wide>
        {temperatures.map((t) => (
          <TemperatureRow key={t.label} reading={t} now={now} />
        ))}
      </ReadingCard>

      <ReadingCard title="Power" level={powerLevel(building)}>
        <ThemedText type="subtitle">{POWER_HEADLINE[power.voltageHealth]}</ThemedText>
        {power.voltageDipsToday > 0 && (
          <ThemedText type="small" themeColor="warning">
            Flickered {power.voltageDipsToday} time{power.voltageDipsToday === 1 ? '' : 's'} today
          </ThemedText>
        )}
        <ThemedText
          type="small"
          themeColor={power.backupPower === 'weak' ? 'danger' : 'textSecondary'}>
          {BACKUP_LABELS[power.backupPower]}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Using {power.currentKw.toLocaleString('en-US')} kW, about as much as{' '}
          {homes.toLocaleString('en-US')} homes
        </ThemedText>
      </ReadingCard>

      <ReadingCard title="Heating & cooling" level={hvacLevel(building)}>
        <ThemedText type="subtitle">
          {HVAC_LABELS[hvac.status]}, set to {hvac.setpointF}°F
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {hvac.zonesOn === hvac.zonesTotal
            ? `Running in all ${hvac.zonesTotal} areas`
            : `Running in ${hvac.zonesOn} of ${hvac.zonesTotal} areas`}
        </ThemedText>
        {wasting && (
          <ThemedText type="small" themeColor="warning">
            Nobody is inside, so this is wasting money
          </ThemedText>
        )}
      </ReadingCard>

      <ReadingCard title="People inside" level="good">
        <ThemedText type="subtitle">
          {occupancy.peopleNow === 0
            ? 'Nobody'
            : `${occupancy.peopleNow.toLocaleString('en-US')} ${occupancy.peopleNow === 1 ? 'person' : 'people'}`}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Last person badged in {formatTimeAgo(occupancy.lastBadgeSwipe, now)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Open {occupancy.openHours}
        </ThemedText>
      </ReadingCard>
    </View>
  );
}

// ─── Plain-English labels ───────────────────────────────────────────────────

const HVAC_LABELS = { on: 'On', off: 'Off', 'night-mode': 'Night mode' } as const;
const POWER_HEADLINE = {
  normal: 'Steady',
  dipping: 'Flickering',
  critical: 'Unstable',
} as const;
const BACKUP_LABELS = {
  ready: 'Backup power is ready',
  weak: 'Backup power is weak',
  active: 'Running on backup power now',
  none: 'No backup power',
} as const;
const TREND_WORDS = { rising: 'warming', steady: 'steady', falling: 'cooling' } as const;

/** One room: temperature, whether it's warming, the safe limit, and how long until it's too hot. */
function TemperatureRow({ reading: t, now }: { reading: TemperatureReading; now: number }) {
  const level = tempLevel(t, now);
  const tone = LEVELS[level].tone;
  const current = Math.round(projectedTemp(t, now) * 10) / 10;
  const toDanger = minutesToDanger(t, now);

  return (
    <View style={styles.tempBlock}>
      <View style={styles.tempRow}>
        <ThemedText type="smallBold" style={styles.tempLabel}>
          {t.label}
        </ThemedText>
        <ThemedText type="smallBold" themeColor={level === 'good' ? 'text' : tone}>
          {formatTemp(current)}°F, {TREND_WORDS[t.trend]}
        </ThemedText>
      </View>
      {t.history && <Sparkline values={t.history} limit={t.dangerF} tone={level === 'good' ? 'primary' : tone} height={20} />}
      <ThemedText type="small" themeColor={level === 'good' ? 'textSecondary' : tone}>
        {toDanger !== null && toDanger <= 0
          ? `Too hot. The safe limit is ${t.dangerF}°F.`
          : toDanger !== null && toDanger <= 240
            ? `Will be too hot (${t.dangerF}°F) in about ${Math.max(1, Math.round(toDanger))} min`
            : t.trend === 'falling'
              ? `Cooling back down. Safe up to ${t.dangerF}°F.`
              : `Safe up to ${t.dangerF}°F`}
      </ThemedText>
    </View>
  );
}

/** A card with a plain title and a status chip, e.g. "POWER  ! Keep an eye on it". */
function ReadingCard({
  title,
  level,
  wide,
  children,
}: PropsWithChildren<{ title: string; level: Level; wide?: boolean }>) {
  return (
    <Card style={[styles.card, wide && styles.wide]}>
      <View style={styles.cardHeader}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {title.toUpperCase()}
        </ThemedText>
        <StatusChip level={level} />
      </View>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  // Two cards per row on wide screens, one per row on narrow phones.
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  card: { flexGrow: 1, flexBasis: '45%', minWidth: 220, gap: Spacing.one },
  wide: { flexBasis: '100%' },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  tempBlock: { gap: Spacing.half, marginBottom: Spacing.two },
  tempRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  tempLabel: { flex: 1 },
});
