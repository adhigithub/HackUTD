import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing, type ThemeColor } from '@/constants/theme';
import { formatTimeAgo, type Building, type Trend } from '@/data/buildings';

/**
 * The live readings for one building: HVAC, power, temperature, occupancy.
 * Each card's color hint ("tone") turns orange/red when something looks wrong.
 */
export function Readings({ building }: { building: Building }) {
  const { hvac, power, temperatures, occupancy } = building;

  // HVAC running hard in an empty building = wasted money.
  const hvacWasting = hvac.status === 'on' && occupancy.peopleNow === 0;

  const powerTone: ThemeColor =
    power.voltageHealth === 'critical' || power.backupPower === 'weak'
      ? 'danger'
      : power.voltageHealth === 'dipping'
        ? 'warning'
        : 'success';

  return (
    <View style={styles.grid}>
      <ReadingCard title="HVAC" tone={hvacWasting ? 'warning' : 'success'}>
        <ThemedText type="subtitle">
          {HVAC_LABELS[hvac.status]} · {hvac.setpointF}°F
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {hvac.zonesOn}/{hvac.zonesTotal} zones running
        </ThemedText>
        {hvacWasting && (
          <ThemedText type="small" themeColor="warning">
            Running with nobody inside
          </ThemedText>
        )}
      </ReadingCard>

      <ReadingCard title="Power" tone={powerTone}>
        <ThemedText type="subtitle">{power.currentKw.toLocaleString('en-US')} kW</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Voltage {power.voltageHealth}
          {power.voltageDipsToday > 0 && ` · ${power.voltageDipsToday} dips today`}
        </ThemedText>
        <ThemedText
          type="small"
          themeColor={power.backupPower === 'weak' ? 'danger' : 'textSecondary'}>
          Backup power: {power.backupPower}
        </ThemedText>
      </ReadingCard>

      <ReadingCard title="Occupancy" tone="success">
        <ThemedText type="subtitle">
          {occupancy.peopleNow.toLocaleString('en-US')}{' '}
          {occupancy.peopleNow === 1 ? 'person' : 'people'}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Last badge swipe {formatTimeAgo(occupancy.lastBadgeSwipe)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Open hours: {occupancy.openHours}
        </ThemedText>
      </ReadingCard>

      <ReadingCard title="Temperature" tone={temperatures.some(isNearDanger) ? 'danger' : 'success'}>
        {temperatures.map((t) => (
          <View key={t.label} style={styles.tempRow}>
            <ThemedText type="small" style={styles.tempLabel}>
              {t.label}
            </ThemedText>
            <ThemedText type="smallBold" themeColor={isNearDanger(t) ? 'danger' : 'text'}>
              {t.currentF}°F {TREND_ARROWS[t.trend]}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              / {t.dangerF}°F max
            </ThemedText>
          </View>
        ))}
      </ReadingCard>
    </View>
  );
}

// ─── Small pieces used above ────────────────────────────────────────────────

const HVAC_LABELS = { on: 'On', off: 'Off', 'night-mode': 'Night mode' } as const;
const TREND_ARROWS: Record<Trend, string> = { rising: '↑', steady: '→', falling: '↓' };

/** Within 3°F of the danger line and still climbing. */
function isNearDanger(t: Building['temperatures'][number]) {
  return t.trend === 'rising' && t.dangerF - t.currentF <= 3;
}

/** A card with a small colored dot + title, e.g. "● HVAC". */
function ReadingCard({ title, tone, children }: PropsWithChildren<{ title: string; tone: ThemeColor }>) {
  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <ThemedText themeColor={tone} style={styles.dot}>
          ●
        </ThemedText>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {title.toUpperCase()}
        </ThemedText>
      </View>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  // Two cards per row on wide screens, one per row on narrow phones.
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  card: { flexGrow: 1, flexBasis: '45%', minWidth: 220, gap: Spacing.one },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  dot: { fontSize: 12, lineHeight: 16 },
  tempRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  tempLabel: { flex: 1 },
});
