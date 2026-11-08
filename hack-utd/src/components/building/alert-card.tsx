import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { formatMoney, formatTimeAgo, type Alert } from '@/data/buildings';

import { SeverityPill } from './severity-pill';

type AlertCardProps = {
  alert: Alert;
  /**
   * What happens when the card is tapped. Leave it out until the Alert Detail
   * screen exists — then pass e.g. () => router.push(`/alerts/${alert.id}`).
   */
  onPress?: () => void;
};

/** One alert in a building's list: severity, what's wrong, $ at risk, which data flagged it. */
export function AlertCard({ alert, onPress }: AlertCardProps) {
  const content = (
    <Card>
      <View style={styles.topRow}>
        <SeverityPill severity={alert.severity} />
        <ThemedText type="small" themeColor="textSecondary">
          {formatTimeAgo(alert.detectedAt)}
        </ThemedText>
      </View>

      <ThemedText type="smallBold">{alert.title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {alert.summary}
      </ThemedText>

      <View style={styles.bottomRow}>
        <ThemedText type="smallBold" themeColor="danger">
          {formatMoney(alert.costAtRisk)} at risk
        </ThemedText>
        {alert.autoFix && (
          <ThemedText type="small" themeColor="primary">
            Auto-fix on
          </ThemedText>
        )}
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        Flagged by: {alert.sources.join(' · ')}
      </ThemedText>
    </Card>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  pressed: { opacity: 0.75 },
});
