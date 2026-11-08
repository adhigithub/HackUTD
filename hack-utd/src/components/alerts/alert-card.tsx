import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatMinutes, formatUSDCompact } from '@/features/alerts/format';
import { getBuilding } from '@/features/alerts/mock-data';
import type { Alert, Resolution } from '@/features/alerts/types';

/** One row per alert: what, where, when, how much. */
export function AlertCard({ alert, resolution }: { alert: Alert; resolution?: Resolution }) {
  const theme = useTheme();
  const building = getBuilding(alert.buildingId);
  const color = resolution ? theme.success : alert.severity === 'act' ? theme.danger : theme.warning;

  return (
    <Link href={{ pathname: '/alerts/[id]', params: { id: alert.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          pressed && { backgroundColor: theme.backgroundSelected },
        ]}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <View style={styles.body}>
          <ThemedText type="smallBold" style={styles.title} numberOfLines={2}>
            {alert.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {building?.name} ·{' '}
            {resolution ? 'Fixed' : `fails in ${formatMinutes(alert.chain[0].fallAtMin)}`}
          </ThemedText>
        </View>
        <ThemedText style={[styles.amount, { color }]}>
          {resolution ? `+${formatUSDCompact(resolution.saved)}` : formatUSDCompact(alert.costAtRisk)}
        </ThemedText>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  body: { flex: 1, gap: Spacing.half },
  title: { fontSize: 16, lineHeight: 22 },
  amount: { fontSize: 18, lineHeight: 24, fontWeight: 800 },
});
