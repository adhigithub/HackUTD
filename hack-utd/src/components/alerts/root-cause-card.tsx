import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatUSDCompact } from '@/features/alerts/format';
import type { RootCauseGroup } from '@/features/alerts/root-cause';

import { AlertCard } from './alert-card';

/** One root cause, with the problems it is also causing indented underneath. */
export function RootCauseCard({ group }: { group: RootCauseGroup }) {
  const theme = useTheme();
  const { root, causes, totalAtRisk, protectedByRootFix } = group;
  const bestFix = root.fixes.find((f) => f.feasible);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.flex}>
          ROOT CAUSE · {root.asset.toUpperCase()}
        </ThemedText>
        {causes.length > 0 && (
          <ThemedText type="smallBold" themeColor="danger">
            {formatUSDCompact(totalAtRisk)} total
          </ThemedText>
        )}
      </View>

      <AlertCard alert={root} />

      {causes.length > 0 && (
        <View style={styles.causes}>
          <ThemedText type="small" themeColor="textSecondary">
            Also causing:
          </ThemedText>
          {causes.map((c) => (
            <View key={c.id} style={styles.causeRow}>
              <View style={[styles.branch, { borderColor: theme.border }]} />
              <View style={styles.flex}>
                <AlertCard alert={c} />
              </View>
            </View>
          ))}
          {bestFix && protectedByRootFix > 0 && (
            <ThemedText type="small" themeColor="success">
              Fix this first: “{bestFix.title}” also protects{' '}
              {protectedByRootFix === 1 ? 'the problem' : `all ${protectedByRootFix} problems`} below.
            </ThemedText>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.two },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
  causes: { gap: Spacing.two },
  causeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  // An "└" connector showing the problem hangs off the root cause above it.
  branch: {
    width: 14,
    height: 28,
    marginLeft: Spacing.two,
    marginTop: -28,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderBottomLeftRadius: 6,
  },
});
