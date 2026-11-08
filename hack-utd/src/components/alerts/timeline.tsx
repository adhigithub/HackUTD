import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatMinutes, formatUSDCompact } from '@/features/alerts/format';
import type { Domino } from '@/features/alerts/types';

type Props = {
  chain: Domino[];
  /** Simulated minutes from now. */
  simMin: number;
  /** Step the fix stops the chain at. */
  fixIndex: number | null;
  /** True once the fix has been applied: steps from fixIndex on are prevented. */
  fixed: boolean;
};

/** What happens if nobody acts, one short line per step. */
export function Timeline({ chain, simMin, fixIndex, fixed }: Props) {
  const theme = useTheme();

  return (
    <View>
      {chain.map((step, i) => {
        const prevented = fixed && fixIndex !== null && i >= fixIndex;
        const happened = !prevented && simMin >= step.fallAtMin;
        const isNext =
          !prevented && !happened && (i === 0 || simMin >= chain[i - 1].fallAtMin);
        const color = prevented
          ? theme.success
          : happened
            ? theme.danger
            : isNext
              ? theme.warning
              : theme.border;
        const when = prevented
          ? 'Prevented'
          : happened
            ? 'Happened'
            : `In ${formatMinutes(step.fallAtMin - simMin)}`;
        const isLast = i === chain.length - 1;

        return (
          <View key={step.id} style={styles.row}>
            {/* dot + line */}
            <View style={styles.rail}>
              <View style={[styles.dot, { backgroundColor: color }]} />
              {!isLast && <View style={[styles.line, { backgroundColor: theme.border }]} />}
            </View>

            <View style={styles.body}>
              <ThemedText type="small" style={{ color: happened || prevented ? color : theme.textSecondary }}>
                {when}
              </ThemedText>
              <View style={styles.textRow}>
                <ThemedText type="small" style={[styles.flex, prevented && styles.muted]}>
                  {step.impact}
                </ThemedText>
                <ThemedText
                  type="smallBold"
                  style={[{ color: happened ? theme.danger : theme.textSecondary }, prevented && styles.struck]}>
                  −{formatUSDCompact(step.cost)}
                </ThemedText>
              </View>
              {!fixed && fixIndex === i && (
                <ThemedText type="small" themeColor="success">
                  🛡 The fix stops it here
                </ThemedText>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.three },
  rail: { alignItems: 'center', width: 14 },
  dot: { width: 14, height: 14, borderRadius: 7, marginTop: 3 },
  line: { width: 2, flex: 1, marginVertical: 2 },
  body: { flex: 1, paddingBottom: Spacing.three, gap: 2 },
  textRow: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  muted: { opacity: 0.6 },
  struck: { textDecorationLine: 'line-through' },
});
