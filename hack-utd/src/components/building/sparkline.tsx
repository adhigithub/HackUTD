import { StyleSheet, View } from 'react-native';

import { Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SparklineProps = {
  values: number[];
  /** Draws a dashed line at this value (the danger limit). */
  limit?: number;
  tone?: ThemeColor;
  height?: number;
};

/**
 * Tiny bar chart of recent readings, with the danger line drawn across it, so
 * you can see at a glance how close a room is getting.
 */
export function Sparkline({ values, limit, tone = 'primary', height = 28 }: SparklineProps) {
  const theme = useTheme();
  if (values.length === 0) return null;

  // Scale so small changes are visible, but keep the limit in view.
  const lo = Math.min(...values) - 1;
  const hi = Math.max(...values, limit ?? -Infinity) + 0.5;
  const scale = (v: number) => ((v - lo) / (hi - lo)) * height;

  return (
    <View
      style={[styles.wrap, { height }]}
      accessibilityLabel={`Recent readings: ${values.join(', ')}`}>
      {values.map((v, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            {
              height: Math.max(2, scale(v)),
              backgroundColor: theme[tone],
              opacity: 0.35 + (0.65 * (i + 1)) / values.length, // newest is boldest
            },
          ]}
        />
      ))}
      {limit !== undefined && (
        <View
          style={[styles.limit, { bottom: scale(limit), borderColor: theme.danger }]}
          pointerEvents="none"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.half, marginTop: Spacing.one },
  bar: { flex: 1, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  limit: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderStyle: 'dashed' },
});
