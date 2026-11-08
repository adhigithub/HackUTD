import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type BarItem = { key: string; label: string; sublabel?: string; value: number; valueLabel: string };

/**
 * Single-series horizontal bars, every bar labeled with its value
 * (so the numbers are readable without the bars).
 */
export function BarList({ items }: { items: BarItem[] }) {
  const theme = useTheme();
  const max = Math.max(...items.map((i) => i.value), 0);

  return (
    <View style={styles.list}>
      {items.map((item) => {
        const pct = max > 0 ? Math.max((item.value / max) * 100, item.value > 0 ? 2 : 0) : 0;
        return (
          <View
            key={item.key}
            style={styles.row}
            accessible
            accessibilityLabel={`${item.label}${item.sublabel ? `, ${item.sublabel}` : ''}: ${item.valueLabel}`}>
            <View style={styles.labels}>
              <View style={styles.name}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {item.label}
                </ThemedText>
                {item.sublabel ? (
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {item.sublabel}
                  </ThemedText>
                ) : null}
              </View>
              <ThemedText type="smallBold" style={styles.value}>
                {item.valueLabel}
              </ThemedText>
            </View>
            <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
              <View style={[styles.fill, { width: `${pct}%`, backgroundColor: theme.primary }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.three },
  row: { gap: Spacing.one },
  labels: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  name: { flex: 1 },
  value: { fontVariant: ['tabular-nums'] },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
});
