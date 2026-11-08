import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatMinutes, formatUSDCompact } from '@/features/alerts/format';
import { getBuilding } from '@/features/alerts/mock-data';
import type { Alert, Resolution } from '@/features/alerts/types';

/** One ticket per alert: severity, what, where, when, how much. */
export function AlertCard({ alert, resolution }: { alert: Alert; resolution?: Resolution }) {
  const theme = useTheme();
  const building = getBuilding(alert.buildingId);
  const color = resolution
    ? theme.success
    : alert.severity === 'act'
      ? theme.danger
      : theme.warning;
  const soft = resolution
    ? theme.successSoft
    : alert.severity === 'act'
      ? theme.dangerSoft
      : theme.warningSoft;
  const label = resolution ? 'FIXED' : alert.severity === 'act' ? 'ACT NOW' : 'WATCH';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/alerts/[id]', params: { id: alert.id } })}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.ticketBackground, borderColor: theme.border },
        pressed && { backgroundColor: theme.backgroundSelected },
      ]}>
      {/* Severity stripe down the left edge */}
      <View style={[styles.stripe, { backgroundColor: color }]} />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: soft }]}>
            <ThemedText style={[styles.badgeText, { color }]}>{label}</ThemedText>
          </View>
          <ThemedText style={[styles.amount, { color }]}>
            {resolution
              ? `+${formatUSDCompact(resolution.saved)}`
              : formatUSDCompact(alert.costAtRisk)}
          </ThemedText>
        </View>

        <ThemedText type="smallBold" style={styles.title} numberOfLines={2}>
          {alert.title}
        </ThemedText>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.footer}>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.flex}>
            {building?.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {resolution ? 'Resolved' : `Fails in ${formatMinutes(alert.chain[0].fallAtMin)}`}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: Radius.lg,
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
  },
  // Rounded on its own instead of overflow:hidden, which would clip the iOS shadow.
  stripe: {
    width: 5,
    borderTopLeftRadius: Radius.lg,
    borderBottomLeftRadius: Radius.lg,
  },
  content: { flex: 1, padding: Spacing.three, gap: Spacing.two },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.sm,
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: 700,
    letterSpacing: 0.5,
  },
  amount: { fontSize: 18, lineHeight: 24, fontWeight: 800 },
  title: { fontSize: 16, lineHeight: 22 },
  divider: { height: StyleSheet.hairlineWidth },
  footer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
});
