import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { formatClock, type Alert, type Building } from '@/data/buildings';
import { formatCountdown, formatTemp, projectedTemp, soonestDanger } from '@/lib/incidents/forecast';
import { useTheme } from '@/hooks/use-theme';
import { useNow } from '@/lib/time/now';

/**
 * The single most urgent "this is going to cross a line" warning for the
 * building, as a live countdown. A reading of 78°F tells you little; "80°F in
 * 19:42" tells you what to do. Hidden when nothing is heading for danger.
 */
export function DangerCountdown({ building, alerts }: { building: Building; alerts: Alert[] }) {
  const now = useNow();
  const theme = useTheme();
  const soonest = soonestDanger(building.temperatures, now);
  if (!soonest) return null;

  const { reading, minutes } = soonest;
  const over = minutes <= 0;
  const urgent = minutes < 30;
  const tone = over || urgent ? 'danger' : 'warning';
  const relatedAlert = alerts.find((a) => a.id === reading.relatedAlertId);
  const firstFix = relatedAlert?.fixSteps[0];

  return (
    <Card
      accessibilityRole="alert"
      style={[
        styles.card,
        {
          borderColor: theme[tone],
          backgroundColor: tone === 'danger' ? theme.dangerSoft : theme.warningSoft,
        },
      ]}>
      <View style={styles.row}>
        <View style={styles.text}>
          <ThemedText type="smallBold" themeColor={tone}>
            {over ? 'TOO HOT NOW' : 'TIME UNTIL TOO HOT'}
          </ThemedText>
          <ThemedText type="smallBold">
            {over
              ? `${reading.label} is over its safe limit of ${reading.dangerF}°F`
              : `${reading.label} will be too hot by about ${formatClock(now + minutes * 60_000)}`}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            It’s {formatTemp(Math.round(projectedTemp(reading, now) * 10) / 10)}°F now and warming 1°F
            every {Math.round(60 / (reading.ratePerHourF ?? 1))} minutes. Safe limit: {reading.dangerF}°F.
          </ThemedText>
        </View>
        <ThemedText
          themeColor={tone}
          style={styles.clock}
          accessibilityLabel={over ? 'Too hot now' : `${Math.ceil(minutes)} minutes left`}>
          {over ? 'NOW' : formatCountdown(minutes)}
        </ThemedText>
      </View>

      {firstFix && (
        <ThemedText type="small">
          <ThemedText type="smallBold">What to do: </ThemedText>
          {firstFix}
        </ThemedText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.two, borderWidth: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  text: { flex: 1, gap: Spacing.half },
  clock: { fontSize: 34, lineHeight: 40, fontWeight: 800, fontVariant: ['tabular-nums'] },
});
